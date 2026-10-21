using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Almanac.Application.Options;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Almanac.Infrastructure.Services
{
    public sealed class DocumentEmbeddingService : IDocumentEmbeddingService
    {
        private const int MaxContentLength = 20000;

        private readonly DbContext dbContext;
        private readonly IEmbeddingClient embeddingClient;
        private readonly EmbeddingOptions options;
        private readonly ILogger<DocumentEmbeddingService> logger;

        public DocumentEmbeddingService(
            DbContext dbContext,
            IEmbeddingClient embeddingClient,
            IOptions<EmbeddingOptions> options,
            ILogger<DocumentEmbeddingService> logger)
        {
            this.dbContext = dbContext;
            this.embeddingClient = embeddingClient;
            this.options = options.Value;
            this.logger = logger;
        }

        public async Task<bool> IsAvailable(CancellationToken cancellationToken = default)
        {
            if (!embeddingClient.IsConfigured)
            {
                return false;
            }

            string qualifiedName = $"{Schema}.documentembedding";
            string? found = await dbContext.Database
                .SqlQueryRaw<string?>("SELECT to_regclass({0})::text AS \"Value\"", qualifiedName)
                .FirstOrDefaultAsync(cancellationToken);

            return found is not null;
        }

        public async Task<bool> Upsert(Document document, CancellationToken cancellationToken = default)
        {
            if (!await IsAvailable(cancellationToken))
            {
                return false;
            }

            try
            {
                string content = BuildContent(document.Title, document.Summary, document.Body);
                float[] vector = await embeddingClient.Embed(content, cancellationToken);

                await dbContext.Database.ExecuteSqlRawAsync(
                    $"INSERT INTO {Table} (documentid, contenthash, model, embedding, createdat) " +
                    "VALUES ({0}, {1}, {2}, {3}::vector, now()) " +
                    "ON CONFLICT (documentid) DO UPDATE SET contenthash = EXCLUDED.contenthash, model = EXCLUDED.model, embedding = EXCLUDED.embedding, createdat = now()",
                    [document.Id, Hash(content), options.Model, ToVectorLiteral(vector)],
                    cancellationToken);

                return true;
            }
            catch (Exception exception) when (exception is HttpRequestException or InvalidOperationException or NpgsqlException or DbUpdateException)
            {
                logger.LogWarning(exception, "Failed to embed document {DocumentId}; it stays searchable by text only", document.Id);
                return false;
            }
        }

        public async Task<int> Reindex(CancellationToken cancellationToken = default)
        {
            if (!await IsAvailable(cancellationToken))
            {
                return 0;
            }

            Dictionary<long, string> stored = (await dbContext.Database
                    .SqlQueryRaw<StoredEmbedding>($"SELECT documentid AS \"DocumentId\", contenthash AS \"ContentHash\" FROM {Table}")
                    .ToListAsync(cancellationToken))
                .ToDictionary(item => item.DocumentId, item => item.ContentHash);

            List<Document> documents = await dbContext.Set<Document>().AsNoTracking().ToListAsync(cancellationToken);

            int updated = 0;
            foreach (Document document in documents)
            {
                string hash = Hash(BuildContent(document.Title, document.Summary, document.Body));
                if (stored.TryGetValue(document.Id, out string? current) && current == hash)
                {
                    continue;
                }

                if (await Upsert(document, cancellationToken))
                {
                    updated++;
                }
            }

            return updated;
        }

        public async Task<List<long>> FindSimilar(string query, IReadOnlyCollection<long> allowedIds, int limit, CancellationToken cancellationToken = default)
        {
            if (allowedIds.Count == 0 || !await IsAvailable(cancellationToken))
            {
                return [];
            }

            try
            {
                float[] vector = await embeddingClient.Embed(query, cancellationToken);

                return await dbContext.Database
                    .SqlQueryRaw<long>(
                        $"SELECT documentid AS \"Value\" FROM {Table} " +
                        "WHERE documentid = ANY({0}) AND (embedding <=> {1}::vector) < {2} " +
                        "ORDER BY embedding <=> {1}::vector LIMIT {3}",
                        allowedIds.ToArray(), ToVectorLiteral(vector), options.MaxDistance, limit)
                    .ToListAsync(cancellationToken);
            }
            catch (Exception exception) when (exception is HttpRequestException or InvalidOperationException or NpgsqlException)
            {
                logger.LogWarning(exception, "Vector search failed; falling back to text search only");
                return [];
            }
        }

        private string Schema => dbContext.Model.GetDefaultSchema() ?? "public";

        private string Table => $"\"{Schema}\".documentembedding";

        private static string BuildContent(string title, string summary, string body)
        {
            string content = $"{title}\n{summary}\n{body}";
            return content.Length <= MaxContentLength ? content : content[..MaxContentLength];
        }

        private static string Hash(string content)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content))).ToLowerInvariant();
        }

        private static string ToVectorLiteral(float[] vector)
        {
            return "[" + string.Join(",", vector.Select(value => value.ToString("R", CultureInfo.InvariantCulture))) + "]";
        }

        private sealed class StoredEmbedding
        {
            public long DocumentId { get; set; }

            public string ContentHash { get; set; } = string.Empty;
        }
    }
}
