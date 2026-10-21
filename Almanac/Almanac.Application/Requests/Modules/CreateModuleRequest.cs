using System.ComponentModel.DataAnnotations;

namespace Almanac.Application.Requests.Modules
{
    public class CreateModuleRequest
    {
        [Range(1, long.MaxValue)]
        public long ProductId { get; set; }

        [Required]
        [StringLength(80, MinimumLength = 2)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [StringLength(120, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(500)]
        public string? SourcePath { get; set; }
    }
}
