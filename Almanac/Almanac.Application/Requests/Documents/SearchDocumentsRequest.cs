using Almanac.Domain.ValueObjects;

namespace Almanac.Application.Requests.Documents
{
    public sealed class SearchDocumentsRequest
    {
        public string? Query { get; set; }

        public string? Product { get; set; }

        public string? Module { get; set; }

        /// <summary>Sem consulta de texto, "recent" ordena pelos alterados mais recentemente.</summary>
        public string? Sort { get; set; }

        public List<string>? Tags { get; set; }

        public DocumentStatus? Status { get; set; }

        public int Limit { get; set; } = 10;
    }
}
