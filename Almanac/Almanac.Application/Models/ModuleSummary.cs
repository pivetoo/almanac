namespace Almanac.Application.Models
{
    public sealed class ModuleSummary
    {
        public string Product { get; init; } = string.Empty;

        public string ProductName { get; init; } = string.Empty;

        public string Module { get; init; } = string.Empty;

        public string ModuleName { get; init; } = string.Empty;

        public string? Description { get; init; }

        public int DocumentCount { get; init; }
    }
}
