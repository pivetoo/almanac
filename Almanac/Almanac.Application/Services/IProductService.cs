using Archon.Application.Services;
using Archon.Core.Pagination;
using Almanac.Application.Requests.Products;
using Almanac.Domain.Entities;

namespace Almanac.Application.Services
{
    public interface IProductService : ICrudService<Product>
    {
        Task<PagedResult<Product>> GetProducts(PagedRequest request, string? search, CancellationToken cancellationToken = default);

        Task<Product?> GetProductById(long id, CancellationToken cancellationToken = default);

        Task<Product> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken = default);

        Task<Product> UpdateProduct(long id, UpdateProductRequest request, CancellationToken cancellationToken = default);
    }
}
