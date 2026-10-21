using Archon.Core.Pagination;
using Archon.Infrastructure.Persistence.EF;
using Archon.Infrastructure.Services;
using Almanac.Application.Localization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Documents;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Almanac.Infrastructure.Persistence.EF.Configurations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using NpgsqlTypes;

namespace Almanac.Infrastructure.Services
{
    public sealed class DocumentService : CrudService<Document>, IDocumentService
    {
        private const int MaxSearchLimit = 50;

        private readonly IStringLocalizer<AlmanacResource> Localizer;

        public DocumentService(DbContext dbContext, IStringLocalizer<AlmanacResource> localizer) : base(dbContext)
        {
            Localizer = localizer;
        }

        public async Task<PagedResult<Document>> GetDocuments(PagedRequest request, string? product, string? module, CancellationToken cancellationToken = default)
        {
            IQueryable<Document> query = DbContext.Set<Document>().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(product))
            {
                string normalizedProduct = product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Product == normalizedProduct);
            }

            if (!string.IsNullOrWhiteSpace(module))
            {
                string normalizedModule = module.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module == normalizedModule);
            }

            return await query
                .OrderBy(item => item.Product)
                .ThenBy(item => item.Module)
                .ThenBy(item => item.Title)
                .ToPagedResultAsync(request, cancellationToken);
        }

        public async Task<Document?> GetDocumentById(long id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Set<Document>()
                .AsNoTracking()
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

        public async Task<List<ModuleSummary>> GetModules(string? product, CancellationToken cancellationToken = default)
        {
            IQueryable<Document> query = DbContext.Set<Document>().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(product))
            {
                string normalizedProduct = product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Product == normalizedProduct);
            }

            return await query
                .GroupBy(item => new { item.Product, item.Module })
                .Select(group => new ModuleSummary
                {
                    Product = group.Key.Product,
                    Module = group.Key.Module,
                    DocumentCount = group.Count()
                })
                .OrderBy(item => item.Product)
                .ThenBy(item => item.Module)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<DocumentSearchHit>> Search(SearchDocumentsRequest request, CancellationToken cancellationToken = default)
        {
            IQueryable<Document> query = DbContext.Set<Document>().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(request.Product))
            {
                string product = request.Product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Product == product);
            }

            if (!string.IsNullOrWhiteSpace(request.Module))
            {
                string module = request.Module.Trim().ToLowerInvariant();
                query = query.Where(item => item.Module == module);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(item => item.Status == request.Status.Value);
            }

            foreach (string tag in (request.Tags ?? []).Select(value => value.Trim().ToLowerInvariant()))
            {
                query = query.Where(item => item.Tags.Contains(tag));
            }

            int limit = Math.Clamp(request.Limit, 1, MaxSearchLimit);

            IQueryable<Document> ordered;
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                ordered = query.OrderBy(item => item.Product).ThenBy(item => item.Module).ThenBy(item => item.Title);
            }
            else
            {
                NpgsqlTsQuery tsQuery = EF.Functions.WebSearchToTsQuery("portuguese", request.Query.Trim());
                query = query.Where(item => EF.Property<NpgsqlTsVector>(item, DocumentConfiguration.SearchVectorProperty).Matches(tsQuery));
                ordered = query.OrderByDescending(item => EF.Property<NpgsqlTsVector>(item, DocumentConfiguration.SearchVectorProperty).Rank(tsQuery));
            }

            return await ordered
                .Take(limit)
                .Select(item => new DocumentSearchHit
                {
                    Id = item.Id,
                    Product = item.Product,
                    Module = item.Module,
                    Type = item.Type,
                    Title = item.Title,
                    Summary = item.Summary,
                    Status = item.Status,
                    Tags = item.Tags
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<Document> CreateDocument(CreateDocumentRequest request, CancellationToken cancellationToken = default)
        {
            Document document = BuildDocument(request);
            await EnsureIsUnique(document.Product, document.Module, document.Title, ignoreId: null, cancellationToken);

            bool success = await Insert(cancellationToken, document);
            if (!success)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

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

            DocumentVersion snapshot = document.CreateSnapshot();

            try
            {
                document.Update(
                    request.Product,
                    request.Module,
                    request.Type,
                    request.Title,
                    request.Summary,
                    request.Body,
                    request.Tags,
                    request.SourceRepository,
                    request.SourcePath,
                    request.SourceCommit);
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("document.slug.invalidFormat");
            }

            await EnsureIsUnique(document.Product, document.Module, document.Title, ignoreId: id, cancellationToken);

            DbContext.Set<DocumentVersion>().Add(snapshot);

            Document? result = await Update(document, cancellationToken);
            if (result is null)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

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

        private static Document BuildDocument(CreateDocumentRequest request)
        {
            try
            {
                return new Document(
                    request.Product,
                    request.Module,
                    request.Type,
                    request.Title,
                    request.Summary,
                    request.Body,
                    request.Tags,
                    request.SourceRepository,
                    request.SourcePath,
                    request.SourceCommit);
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("document.slug.invalidFormat");
            }
        }

        private async Task EnsureIsUnique(string product, string module, string title, long? ignoreId, CancellationToken cancellationToken)
        {
            bool exists = await DbContext.Set<Document>()
                .AsNoTracking()
                .AnyAsync(item => item.Product == product && item.Module == module && item.Title == title && (ignoreId == null || item.Id != ignoreId), cancellationToken);

            if (exists)
            {
                throw new InvalidOperationException("document.duplicated");
            }
        }
    }
}
