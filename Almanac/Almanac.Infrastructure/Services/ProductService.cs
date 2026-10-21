using Archon.Core.Pagination;
using Archon.Infrastructure.Persistence.EF;
using Archon.Infrastructure.Services;
using Almanac.Application.Localization;
using Almanac.Application.Requests.Products;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace Almanac.Infrastructure.Services
{
    public sealed class ProductService : CrudService<Product>, IProductService
    {
        private readonly IStringLocalizer<AlmanacResource> Localizer;

        public ProductService(DbContext dbContext, IStringLocalizer<AlmanacResource> localizer) : base(dbContext)
        {
            Localizer = localizer;
        }

        public async Task<PagedResult<Product>> GetProducts(PagedRequest request, string? search, CancellationToken cancellationToken = default)
        {
            IQueryable<Product> query = DbContext.Set<Product>().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string lower = search.Trim().ToLowerInvariant();
                query = query.Where(item => item.Slug.Contains(lower) || item.Name.ToLower().Contains(lower));
            }

            return await query
                .OrderBy(item => item.Name)
                .ToPagedResultAsync(request, cancellationToken);
        }

        public async Task<Product?> GetProductById(long id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Set<Product>()
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        }

        public async Task<Product> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken = default)
        {
            Product product = Build(() => new Product(request.Slug, request.Name, request.Description, request.Repository));
            await EnsureSlugIsUnique(product.Slug, ignoreId: null, cancellationToken);

            bool success = await Insert(cancellationToken, product);
            if (!success)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            return product;
        }

        public async Task<Product> UpdateProduct(long id, UpdateProductRequest request, CancellationToken cancellationToken = default)
        {
            if (id != request.Id)
            {
                throw new InvalidOperationException("request.route.idMismatch");
            }

            Product? product = await DbContext.Set<Product>()
                .AsTracking()
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

            if (product is null)
            {
                throw new InvalidOperationException("product.notFound");
            }

            Build(() =>
            {
                product.Update(request.Slug, request.Name, request.Description, request.Repository, request.IsActive);
                return product;
            });

            await EnsureSlugIsUnique(product.Slug, ignoreId: id, cancellationToken);

            Product? result = await Update(product, cancellationToken);
            if (result is null)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            return result;
        }

        public override async Task<Product?> Delete(long id, CancellationToken cancellationToken = default)
        {
            MutableMessages.Clear();

            Product? product = await DbContext.Set<Product>()
                .AsNoTracking()
                .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

            if (product is null)
            {
                MutableMessages.Add(new KeyNotFoundException(Localizer["product.notFound"]));
                return null;
            }

            bool hasModules = await DbContext.Set<Module>().AnyAsync(item => item.ProductId == id, cancellationToken);
            if (hasModules)
            {
                MutableMessages.Add(new InvalidOperationException(Localizer["product.hasModules"]));
                return null;
            }

            return await Delete([product], cancellationToken) ? product : null;
        }

        private static T Build<T>(Func<T> factory)
        {
            try
            {
                return factory();
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("document.slug.invalidFormat");
            }
        }

        private async Task EnsureSlugIsUnique(string slug, long? ignoreId, CancellationToken cancellationToken)
        {
            bool exists = await DbContext.Set<Product>()
                .AsNoTracking()
                .AnyAsync(item => item.Slug == slug && (ignoreId == null || item.Id != ignoreId), cancellationToken);

            if (exists)
            {
                throw new InvalidOperationException("product.slug.duplicated");
            }
        }
    }
}
