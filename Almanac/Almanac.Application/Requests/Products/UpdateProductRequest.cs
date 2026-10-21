using System.ComponentModel.DataAnnotations;

namespace Almanac.Application.Requests.Products
{
    public sealed class UpdateProductRequest : CreateProductRequest
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
