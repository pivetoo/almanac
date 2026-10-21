using Archon.Application.Services;
using Archon.Core.Pagination;
using Almanac.Application.Models;
using Almanac.Application.Requests.Documents;
using Almanac.Domain.Entities;

namespace Almanac.Application.Services
{
    public interface IDocumentService : ICrudService<Document>
    {
        Task<PagedResult<Document>> GetDocuments(PagedRequest request, string? product, string? module, CancellationToken cancellationToken = default);

        Task<Document?> GetDocumentById(long id, CancellationToken cancellationToken = default);

        Task<List<DocumentVersion>> GetVersions(long documentId, CancellationToken cancellationToken = default);

        Task<List<DocumentSearchHit>> Search(SearchDocumentsRequest request, CancellationToken cancellationToken = default);

        Task<Document> CreateDocument(CreateDocumentRequest request, CancellationToken cancellationToken = default);

        Task<Document> UpdateDocument(long id, UpdateDocumentRequest request, CancellationToken cancellationToken = default);

        Task<Document> SetStatus(long id, SetDocumentStatusRequest request, CancellationToken cancellationToken = default);

        Task<int> Reindex(CancellationToken cancellationToken = default);
    }
}
