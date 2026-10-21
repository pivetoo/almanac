using System.ComponentModel.DataAnnotations;

namespace Almanac.Application.Requests.Products
{
    public class CreateProductRequest
    {
        [Required]
        [StringLength(80, MinimumLength = 2)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [StringLength(120, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(200)]
        public string? Repository { get; set; }
    }
}
