namespace Almanac.Api.Mcp
{
    public static class McpAuthDiscovery
    {
        private const string MetadataPath = "/.well-known/oauth-protected-resource";

        public static IApplicationBuilder UseMcpAuthChallenge(this IApplicationBuilder app)
        {
            return app.Use(async (context, next) =>
            {
                if (context.Request.Path.StartsWithSegments("/mcp"))
                {
                    IConfiguration configuration = context.RequestServices.GetRequiredService<IConfiguration>();
                    context.Response.OnStarting(() =>
                    {
                        if (context.Response.StatusCode == StatusCodes.Status401Unauthorized)
                        {
                            context.Response.Headers.WWWAuthenticate = $"Bearer resource_metadata=\"{BaseUrl(context, configuration)}{MetadataPath}\"";
                        }

                        return Task.CompletedTask;
                    });
                }

                await next();
            });
        }

        public static IEndpointRouteBuilder MapMcpProtectedResourceMetadata(this IEndpointRouteBuilder app)
        {
            app.MapGet(MetadataPath, Metadata).AllowAnonymous();
            app.MapGet($"{MetadataPath}/mcp", Metadata).AllowAnonymous();
            return app;
        }

        private static IResult Metadata(HttpContext context, IConfiguration configuration)
        {
            string authorizationServer = configuration["Mcp:AuthorizationServer"]
                ?? configuration["IdentityCatalog:BaseUrl"]
                ?? string.Empty;

            string[] scopes = configuration.GetSection("Mcp:Scopes").Get<string[]>() ?? ["offline_access"];

            return Results.Json(new
            {
                resource = $"{BaseUrl(context, configuration)}/mcp",
                authorization_servers = new[] { authorizationServer.TrimEnd('/') },
                bearer_methods_supported = new[] { "header" },
                scopes_supported = scopes
            });
        }

        private static string BaseUrl(HttpContext context, IConfiguration configuration)
        {
            string? configured = configuration["Mcp:PublicBaseUrl"];
            return string.IsNullOrWhiteSpace(configured)
                ? $"{context.Request.Scheme}://{context.Request.Host}"
                : configured.TrimEnd('/');
        }
    }
}
