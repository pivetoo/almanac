namespace Almanac.Application.Models
{
    public sealed class ModuleSummary
    {
        public string Product { get; init; } = string.Empty;

        public string Module { get; init; } = string.Empty;

        public int DocumentCount { get; init; }
    }
}
