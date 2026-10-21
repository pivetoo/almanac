using Almanac.Domain.ValueObjects;

namespace Almanac.Application.Models
{
    public sealed class DocumentSearchHit
    {
        public long Id { get; init; }

        public string Product { get; init; } = string.Empty;

        public string Module { get; init; } = string.Empty;

        public DocumentType Type { get; init; }

        public string Title { get; init; } = string.Empty;

        public string Summary { get; init; } = string.Empty;

        public DocumentStatus Status { get; init; }

        public List<string> Tags { get; init; } = [];
    }
}
