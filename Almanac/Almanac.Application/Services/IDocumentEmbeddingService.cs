using Almanac.Domain.Entities;

namespace Almanac.Application.Services
{
    public interface IDocumentEmbeddingService
    {
        Task<bool> IsAvailable(CancellationToken cancellationToken = default);

        Task<bool> Upsert(Document document, CancellationToken cancellationToken = default);

        Task<int> Reindex(CancellationToken cancellationToken = default);

        Task<List<long>> FindSimilar(string query, IReadOnlyCollection<long> allowedIds, int limit, CancellationToken cancellationToken = default);
    }
}
