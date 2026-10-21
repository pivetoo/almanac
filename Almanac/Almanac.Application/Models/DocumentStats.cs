namespace Almanac.Application.Models
{
    public sealed class DocumentStats
    {
        public int Total { get; init; }

        public int Draft { get; init; }

        public int Reviewed { get; init; }

        public int Outdated { get; init; }

        public bool SemanticSearch { get; init; }
    }
}
