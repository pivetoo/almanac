using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Documents;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Almanac.Domain.ValueObjects;

namespace Almanac.Api.Mcp
{
    public static class McpEndpoint
    {
        private const string DefaultProtocolVersion = "2025-06-18";

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
        };

        private static readonly JsonElement ListModulesSchema = ParseSchema("""
            {"type":"object","properties":{"product":{"type":"string","description":"Filtra por produto (slug), por exemplo identity-management."}}}
            """);

        private static readonly JsonElement SearchDocsSchema = ParseSchema("""
            {"type":"object","properties":{
              "query":{"type":"string","description":"Texto livre. Aceita aspas para frase exata e - para excluir termo."},
              "product":{"type":"string","description":"Filtra por produto (slug)."},
              "module":{"type":"string","description":"Filtra por modulo (slug)."},
              "tags":{"type":"array","items":{"type":"string"},"description":"Retorna so documentos que tenham todas as tags."},
              "status":{"type":"string","enum":["draft","reviewed","outdated"],"description":"Filtra por status de revisao."},
              "limit":{"type":"integer","minimum":1,"maximum":50,"description":"Maximo de resultados (padrao 10)."}}}
            """);

        private static readonly JsonElement ReadDocSchema = ParseSchema("""
            {"type":"object","properties":{"id":{"type":"integer","description":"Id retornado por search_docs."}},"required":["id"]}
            """);

        public static IEndpointRouteBuilder MapAlmanacMcp(this IEndpointRouteBuilder app)
        {
            app.MapPost("/mcp", HandleAsync).RequireAuthorization();
            app.MapGet("/mcp", () => Results.StatusCode(StatusCodes.Status405MethodNotAllowed)).RequireAuthorization();
            return app;
        }

        private static async Task<IResult> HandleAsync(JsonElement request, ClaimsPrincipal user, IDocumentService documents, IModuleService modules, CancellationToken cancellationToken)
        {
            if (request.ValueKind != JsonValueKind.Object || !request.TryGetProperty("method", out JsonElement methodElement))
            {
                return Results.Json(Error(null, -32600, "Invalid request."));
            }

            bool hasId = request.TryGetProperty("id", out JsonElement id);
            string method = methodElement.GetString() ?? string.Empty;

            if (!hasId)
            {
                return Results.Accepted();
            }

            JsonElement? requestId = id.Clone();

            switch (method)
            {
                case "initialize":
                    return Results.Json(Result(requestId, new
                    {
                        protocolVersion = ReadProtocolVersion(request),
                        capabilities = new { tools = new { listChanged = false } },
                        serverInfo = new { name = "almanac", version = "0.1.0" },
                        instructions = "Documentacao dos sistemas e plataformas Mainstay. Use list_modules para descobrir o que existe, search_docs para buscar e read_doc para ler o documento inteiro."
                    }));
                case "ping":
                    return Results.Json(Result(requestId, new { }));
                case "tools/list":
                    return Results.Json(Result(requestId, new { tools = ListTools() }));
                case "tools/call":
                    return Results.Json(await CallToolAsync(requestId, request, user, documents, modules, cancellationToken));
                default:
                    return Results.Json(Error(requestId, -32601, $"Method not found: {method}"));
            }
        }

        private static object[] ListTools()
        {
            return
            [
                new { name = "list_modules", description = "Lista produtos e modulos documentados, com a quantidade de documentos de cada um.", inputSchema = ListModulesSchema },
                new { name = "search_docs", description = "Busca documentos por texto, produto, modulo, tags e status. Retorna titulo e resumo; use read_doc para o conteudo.", inputSchema = SearchDocsSchema },
                new { name = "read_doc", description = "Le um documento completo pelo id, com metadados de origem e status de revisao.", inputSchema = ReadDocSchema }
            ];
        }

        private static async Task<object> CallToolAsync(JsonElement? requestId, JsonElement request, ClaimsPrincipal user, IDocumentService documents, IModuleService modules, CancellationToken cancellationToken)
        {
            if (!request.TryGetProperty("params", out JsonElement parameters) || !parameters.TryGetProperty("name", out JsonElement nameElement))
            {
                return Error(requestId, -32602, "Missing tool name.");
            }

            JsonElement arguments = parameters.TryGetProperty("arguments", out JsonElement argumentsElement) ? argumentsElement : default;
            string name = nameElement.GetString() ?? string.Empty;

            switch (name)
            {
                case "list_modules":
                {
                    if (!HasAccess(user, "modules.summaries"))
                    {
                        return ToolError(requestId, "Sem permissao para listar modulos.");
                    }

                    List<ModuleSummary> summaries = await modules.GetSummaries(ReadString(arguments, "product"), cancellationToken);
                    return ToolText(requestId, JsonSerializer.Serialize(summaries, JsonOptions));
                }
                case "search_docs":
                {
                    if (!HasAccess(user, "documents.search"))
                    {
                        return ToolError(requestId, "Sem permissao para buscar documentos.");
                    }

                    SearchDocumentsRequest search = new()
                    {
                        Query = ReadString(arguments, "query"),
                        Product = ReadString(arguments, "product"),
                        Module = ReadString(arguments, "module"),
                        Tags = ReadStringList(arguments, "tags"),
                        Status = ReadStatus(arguments),
                        Limit = (int)(ReadInt(arguments, "limit") ?? 10)
                    };

                    List<DocumentSearchHit> hits = await documents.Search(search, cancellationToken);
                    return ToolText(requestId, JsonSerializer.Serialize(hits, JsonOptions));
                }
                case "read_doc":
                {
                    if (!HasAccess(user, "documents.getById"))
                    {
                        return ToolError(requestId, "Sem permissao para ler documentos.");
                    }

                    long? documentId = ReadInt(arguments, "id");
                    if (documentId is null)
                    {
                        return ToolError(requestId, "O parametro id e obrigatorio.");
                    }

                    Document? document = await documents.GetDocumentById(documentId.Value, cancellationToken);
                    return document is null
                        ? ToolError(requestId, "Documento nao encontrado.")
                        : ToolText(requestId, FormatDocument(document));
                }
                default:
                    return Error(requestId, -32602, $"Unknown tool: {name}");
            }
        }

        private static string FormatDocument(Document document)
        {
            StringBuilder text = new();
            text.AppendLine($"# {document.Title}");
            text.AppendLine();
            text.AppendLine($"- produto: {document.Module?.Product?.Slug}");
            text.AppendLine($"- modulo: {document.Module?.Slug}");
            text.AppendLine($"- tipo: {document.Type}");
            text.AppendLine($"- status: {document.Status}");
            text.AppendLine($"- versao: {document.Version}");
            if (document.Tags.Count > 0)
            {
                text.AppendLine($"- tags: {string.Join(", ", document.Tags)}");
            }

            if (!string.IsNullOrWhiteSpace(document.SourcePath))
            {
                text.AppendLine($"- origem: {document.SourceRepository} {document.SourcePath} {document.SourceCommit}".TrimEnd());
            }

            text.AppendLine();
            text.AppendLine(document.Body);
            return text.ToString();
        }

        private static bool HasAccess(ClaimsPrincipal user, string permission)
        {
            return user.HasClaim("root", "true") || user.HasClaim("permission", permission);
        }

        private static string ReadProtocolVersion(JsonElement request)
        {
            if (request.TryGetProperty("params", out JsonElement parameters)
                && parameters.TryGetProperty("protocolVersion", out JsonElement version)
                && version.ValueKind == JsonValueKind.String)
            {
                return version.GetString() ?? DefaultProtocolVersion;
            }

            return DefaultProtocolVersion;
        }

        private static string? ReadString(JsonElement arguments, string name)
        {
            if (arguments.ValueKind == JsonValueKind.Object
                && arguments.TryGetProperty(name, out JsonElement value)
                && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString();
            }

            return null;
        }

        private static long? ReadInt(JsonElement arguments, string name)
        {
            if (arguments.ValueKind == JsonValueKind.Object
                && arguments.TryGetProperty(name, out JsonElement value)
                && value.ValueKind == JsonValueKind.Number
                && value.TryGetInt64(out long number))
            {
                return number;
            }

            return null;
        }

        private static List<string>? ReadStringList(JsonElement arguments, string name)
        {
            if (arguments.ValueKind != JsonValueKind.Object
                || !arguments.TryGetProperty(name, out JsonElement value)
                || value.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            return value.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.String)
                .Select(item => item.GetString()!)
                .ToList();
        }

        private static DocumentStatus? ReadStatus(JsonElement arguments)
        {
            string? value = ReadString(arguments, "status");
            return Enum.TryParse(value, ignoreCase: true, out DocumentStatus status) ? status : null;
        }

        private static JsonElement ParseSchema(string json)
        {
            using JsonDocument document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private static object Result(JsonElement? id, object result)
        {
            return new { jsonrpc = "2.0", id, result };
        }

        private static object Error(JsonElement? id, int code, string message)
        {
            return new { jsonrpc = "2.0", id, error = new { code, message } };
        }

        private static object ToolText(JsonElement? id, string text)
        {
            return Result(id, new { content = new[] { new { type = "text", text } }, isError = false });
        }

        private static object ToolError(JsonElement? id, string text)
        {
            return Result(id, new { content = new[] { new { type = "text", text } }, isError = true });
        }
    }
}
