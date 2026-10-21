namespace Almanac.Application.Services
{
    public interface IEmbeddingClient
    {
        bool IsConfigured { get; }

        Task<float[]> Embed(string text, CancellationToken cancellationToken = default);
    }
}
