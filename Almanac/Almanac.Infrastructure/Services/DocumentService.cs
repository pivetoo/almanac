using Archon.Core.Pagination;
using Archon.Infrastructure.Persistence.EF;
using Archon.Infrastructure.Services;
using Almanac.Application.Localization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Documents;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Almanac.Domain.ValueObjects;
using Almanac.Infrastructure.Persistence.EF.Configurations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using NpgsqlTypes;

namespace Almanac.Infrastructure.Services
{
    public sealed class DocumentService : CrudService<Document>, IDocumentService
    {
        private const int MaxSearchLimit = 50;
        private const int CandidateLimit = 50;
        private const int MaxVectorCandidates = 5000;
        private const int ReciprocalRankConstant = 60;

        private readonly IStringLocalizer<AlmanacResource> Localizer;
        private readonly IDocumentEmbeddingService embeddingService;

        public DocumentService(DbContext dbContext, IStringLocalizer<AlmanacResource> localizer, IDocumentEmbeddingService embeddingService) : base(dbContext)
        {
            Localizer = localizer;
            this.embeddingService = embeddingService;
        }

        public async Task<PagedResult<Document>> GetDocuments(PagedRequest request, string? product, string? module, CancellationToken cancellationToken = default)
        {
            IQueryable<Document> query = DbContext.Set<Document>()
                .AsNoTracking()
                .Include(item => item.Module)
                .ThenInclude(item => item!.Product);

            if (!string.IsNullOrWhiteSpace(product))
            {
                string normalizedProduct = product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module!.Product!.Slug == normalizedProduct);
            }

            if (!string.IsNullOrWhiteSpace(module))
            {
                string normalizedModule = module.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module!.Slug == normalizedModule);
            }

            return await query
                .OrderBy(item => item.Module!.Product!.Slug)
                .ThenBy(item => item.Module!.Slug)
                .ThenBy(item => item.Title)
                .ToPagedResultAsync(request, cancellationToken);
        }

        public async Task<Document?> GetDocumentById(long id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Set<Document>()
                .AsNoTracking()
                .Include(item => item.Module)
                .ThenInclude(item => item!.Product)
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        }

        public async Task<List<DocumentVersion>> GetVersions(long documentId, CancellationToken cancellationToken = default)
        {
            return await DbContext.Set<DocumentVersion>()
                .AsNoTracking()
                .Where(item => item.DocumentId == documentId)
                .OrderByDescending(item => item.Number)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<DocumentSearchHit>> Search(SearchDocumentsRequest request, CancellationToken cancellationToken = default)
        {
            int limit = Math.Clamp(request.Limit, 1, MaxSearchLimit);
            IQueryable<Document> filtered = ApplyFilters(DbContext.Set<Document>().AsNoTracking(), request);

            if (string.IsNullOrWhiteSpace(request.Query))
            {
                IOrderedQueryable<Document> ordered = string.Equals(request.Sort, "recent", StringComparison.OrdinalIgnoreCase)
                    ? filtered.OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt).ThenBy(item => item.Title)
                    : filtered.OrderBy(item => item.Module!.Product!.Slug).ThenBy(item => item.Module!.Slug).ThenBy(item => item.Title);

                List<long> listed = await ordered
                    .Select(item => item.Id)
                    .Take(limit)
                    .ToListAsync(cancellationToken);

                return await LoadHits(listed, cancellationToken);
            }

            string query = request.Query.Trim();

            List<long> textIds = await filtered
                .Where(item => EF.Property<NpgsqlTsVector>(item, DocumentConfiguration.SearchVectorProperty).Matches(EF.Functions.WebSearchToTsQuery("portuguese", query)))
                .OrderByDescending(item => EF.Property<NpgsqlTsVector>(item, DocumentConfiguration.SearchVectorProperty).Rank(EF.Functions.WebSearchToTsQuery("portuguese", query)))
                .Select(item => item.Id)
                .Take(CandidateLimit)
                .ToListAsync(cancellationToken);

            List<long> vectorIds = [];
            if (await embeddingService.IsAvailable(cancellationToken))
            {
                List<long> allowedIds = await filtered.Select(item => item.Id).Take(MaxVectorCandidates).ToListAsync(cancellationToken);
                vectorIds = await embeddingService.FindSimilar(query, allowedIds, CandidateLimit, cancellationToken);
            }

            List<long> fused = FuseRanks(textIds, vectorIds).Take(limit).ToList();
            return await LoadHits(fused, cancellationToken);
        }

        public async Task<Document> CreateDocument(CreateDocumentRequest request, CancellationToken cancellationToken = default)
        {
            Module module = await ResolveModule(request.Product, request.Module, cancellationToken);
            Document document = Build(() => new Document(
                module.Id,
                request.Type,
                request.Title,
                request.Summary,
                request.Body,
                request.Tags,
                request.SourceRepository,
                request.SourcePath,
                request.SourceCommit));

            await EnsureIsUnique(document.ModuleId, document.Title, ignoreId: null, cancellationToken);

            bool success = await Insert(cancellationToken, document);
            if (!success)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            await embeddingService.Upsert(document, cancellationToken);
            return document;
        }

        public async Task<Document> UpdateDocument(long id, UpdateDocumentRequest request, CancellationToken cancellationToken = default)
        {
            if (id != request.Id)
            {
                throw new InvalidOperationException("request.route.idMismatch");
            }

            Document? document = await DbContext.Set<Document>()
                .AsTracking()
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

            if (document is null)
            {
                throw new InvalidOperationException("document.notFound");
            }

            Module module = await ResolveModule(request.Product, request.Module, cancellationToken);
            DocumentVersion snapshot = document.CreateSnapshot();

            Build(() =>
            {
                document.Update(
                    module.Id,
                    request.Type,
                    request.Title,
                    request.Summary,
                    request.Body,
                    request.Tags,
                    request.SourceRepository,
                    request.SourcePath,
                    request.SourceCommit);
                return document;
            });

            await EnsureIsUnique(document.ModuleId, document.Title, ignoreId: id, cancellationToken);

            DbContext.Set<DocumentVersion>().Add(snapshot);

            Document? result = await Update(document, cancellationToken);
            if (result is null)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            await embeddingService.Upsert(result, cancellationToken);
            return result;
        }

        public async Task<Document> SetStatus(long id, SetDocumentStatusRequest request, CancellationToken cancellationToken = default)
        {
            Document? document = await DbContext.Set<Document>()
                .AsTracking()
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

            if (document is null)
            {
                throw new InvalidOperationException("document.notFound");
            }

            document.SetStatus(request.Status);

            Document? result = await Update(document, cancellationToken);
            if (result is null)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            return result;
        }

        public async Task<DocumentStats> GetStats(CancellationToken cancellationToken = default)
        {
            Dictionary<DocumentStatus, int> counts = await DbContext.Set<Document>()
                .AsNoTracking()
                .GroupBy(item => item.Status)
                .Select(group => new { Status = group.Key, Count = group.Count() })
                .ToDictionaryAsync(item => item.Status, item => item.Count, cancellationToken);

            return new DocumentStats
            {
                Total = counts.Values.Sum(),
                Draft = counts.GetValueOrDefault(DocumentStatus.Draft),
                Reviewed = counts.GetValueOrDefault(DocumentStatus.Reviewed),
                Outdated = counts.GetValueOrDefault(DocumentStatus.Outdated),
                SemanticSearch = await embeddingService.IsAvailable(cancellationToken)
            };
        }

        public Task<int> Reindex(CancellationToken cancellationToken = default)
        {
            return embeddingService.Reindex(cancellationToken);
        }

        public override async Task<Document?> Delete(long id, CancellationToken cancellationToken = default)
        {
            MutableMessages.Clear();

            Document? document = await DbContext.Set<Document>()
                .AsNoTracking()
                .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

            if (document is null)
            {
                MutableMessages.Add(new KeyNotFoundException(Localizer["document.notFound"]));
                return null;
            }

            return await Delete([document], cancellationToken) ? document : null;
        }

        private static IQueryable<Document> ApplyFilters(IQueryable<Document> query, SearchDocumentsRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.Product))
            {
                string product = request.Product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module!.Product!.Slug == product);
            }

            if (!string.IsNullOrWhiteSpace(request.Module))
            {
                string module = request.Module.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module!.Slug == module);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(item => item.Status == request.Status.Value);
            }

            foreach (string tag in (request.Tags ?? []).Select(value => value.Trim().ToLowerInvariant()))
            {
                query = query.Where(item => item.Tags.Contains(tag));
            }

            return query;
        }

        private static List<long> FuseRanks(List<long> textIds, List<long> vectorIds)
        {
            Dictionary<long, double> scores = [];

            foreach (List<long> ranking in new[] { textIds, vectorIds })
            {
                for (int position = 0; position < ranking.Count; position++)
                {
                    scores[ranking[position]] = scores.GetValueOrDefault(ranking[position]) + 1.0 / (ReciprocalRankConstant + position + 1);
                }
            }

            return scores.OrderByDescending(item => item.Value).Select(item => item.Key).ToList();
        }

        private async Task<List<DocumentSearchHit>> LoadHits(List<long> orderedIds, CancellationToken cancellationToken)
        {
            if (orderedIds.Count == 0)
            {
                return [];
            }

            List<DocumentSearchHit> hits = await DbContext.Set<Document>()
                .AsNoTracking()
                .Where(item => orderedIds.Contains(item.Id))
                .Select(item => new DocumentSearchHit
                {
                    Id = item.Id,
                    Product = item.Module!.Product!.Slug,
                    Module = item.Module.Slug,
                    Type = item.Type,
                    Title = item.Title,
                    Summary = item.Summary,
                    Status = item.Status,
                    Tags = item.Tags,
                    Version = item.Version,
                    UpdatedAt = item.UpdatedAt ?? item.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return hits.OrderBy(item => orderedIds.IndexOf(item.Id)).ToList();
        }

        private async Task<Module> ResolveModule(string product, string module, CancellationToken cancellationToken)
        {
            string productSlug;
            string moduleSlug;

            try
            {
                productSlug = Slug.Normalize(product);
                moduleSlug = Slug.Normalize(module);
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("document.slug.invalidFormat");
            }

            Module? found = await DbContext.Set<Module>()
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Slug == moduleSlug && item.Product!.Slug == productSlug && item.IsActive, cancellationToken);

            if (found is null)
            {
                throw new InvalidOperationException("module.notFound");
            }

            return found;
        }

        private static T Build<T>(Func<T> factory)
        {
            try
            {
                return factory();
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("document.slug.invalidFormat");
            }
        }

        private async Task EnsureIsUnique(long moduleId, string title, long? ignoreId, CancellationToken cancellationToken)
        {
            bool exists = await DbContext.Set<Document>()
                .AsNoTracking()
                .AnyAsync(item => item.ModuleId == moduleId && item.Title == title && (ignoreId == null || item.Id != ignoreId), cancellationToken);

            if (exists)
            {
                throw new InvalidOperationException("document.duplicated");
            }
        }
    }
}
