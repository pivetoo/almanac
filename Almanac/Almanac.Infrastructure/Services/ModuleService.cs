using Archon.Core.Pagination;
using Archon.Infrastructure.Persistence.EF;
using Archon.Infrastructure.Services;
using Almanac.Application.Localization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Modules;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace Almanac.Infrastructure.Services
{
    public sealed class ModuleService : CrudService<Module>, IModuleService
    {
        private readonly IStringLocalizer<AlmanacResource> Localizer;

        public ModuleService(DbContext dbContext, IStringLocalizer<AlmanacResource> localizer) : base(dbContext)
        {
            Localizer = localizer;
        }

        public async Task<PagedResult<Module>> GetModules(PagedRequest request, string? product, CancellationToken cancellationToken = default)
        {
            IQueryable<Module> query = DbContext.Set<Module>().AsNoTracking().Include(item => item.Product);

            if (!string.IsNullOrWhiteSpace(product))
            {
                string normalizedProduct = product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Product!.Slug == normalizedProduct);
            }

            return await query
                .OrderBy(item => item.Product!.Slug)
                .ThenBy(item => item.Slug)
                .ToPagedResultAsync(request, cancellationToken);
        }

        public async Task<Module?> GetModuleById(long id, CancellationToken cancellationToken = default)
        {
            return await DbContext.Set<Module>()
                .AsNoTracking()
                .Include(item => item.Product)
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        }

        public async Task<List<ModuleSummary>> GetSummaries(string? product, CancellationToken cancellationToken = default)
        {
            IQueryable<Module> query = DbContext.Set<Module>().AsNoTracking().Where(item => item.IsActive);

            if (!string.IsNullOrWhiteSpace(product))
            {
                string normalizedProduct = product.Trim().ToLowerInvariant();
                query = query.Where(item => item.Product!.Slug == normalizedProduct);
            }

            return await query
                .OrderBy(item => item.Product!.Slug)
                .ThenBy(item => item.Slug)
                .Select(item => new ModuleSummary
                {
                    Product = item.Product!.Slug,
                    ProductName = item.Product.Name,
                    Module = item.Slug,
                    ModuleName = item.Name,
                    Description = item.Description,
                    DocumentCount = DbContext.Set<Document>().Count(document => document.ModuleId == item.Id)
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<Module> CreateModule(CreateModuleRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureProductExists(request.ProductId, cancellationToken);

            Module module = Build(() => new Module(request.ProductId, request.Slug, request.Name, request.Description, request.SourcePath));
            await EnsureSlugIsUnique(module.ProductId, module.Slug, ignoreId: null, cancellationToken);

            bool success = await Insert(cancellationToken, module);
            if (!success)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            return module;
        }

        public async Task<Module> UpdateModule(long id, UpdateModuleRequest request, CancellationToken cancellationToken = default)
        {
            if (id != request.Id)
            {
                throw new InvalidOperationException("request.route.idMismatch");
            }

            Module? module = await DbContext.Set<Module>()
                .AsTracking()
                .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

            if (module is null)
            {
                throw new InvalidOperationException("module.notFound");
            }

            if (module.ProductId != request.ProductId)
            {
                throw new InvalidOperationException("module.product.immutable");
            }

            Build(() =>
            {
                module.Update(request.Slug, request.Name, request.Description, request.SourcePath, request.IsActive);
                return module;
            });

            await EnsureSlugIsUnique(module.ProductId, module.Slug, ignoreId: id, cancellationToken);

            Module? result = await Update(module, cancellationToken);
            if (result is null)
            {
                throw new InvalidOperationException(GetErrorMessages());
            }

            return result;
        }

        public override async Task<Module?> Delete(long id, CancellationToken cancellationToken = default)
        {
            MutableMessages.Clear();

            Module? module = await DbContext.Set<Module>()
                .AsNoTracking()
                .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

            if (module is null)
            {
                MutableMessages.Add(new KeyNotFoundException(Localizer["module.notFound"]));
                return null;
            }

            bool hasDocuments = await DbContext.Set<Document>().AnyAsync(item => item.ModuleId == id, cancellationToken);
            if (hasDocuments)
            {
                MutableMessages.Add(new InvalidOperationException(Localizer["module.hasDocuments"]));
                return null;
            }

            return await Delete([module], cancellationToken) ? module : null;
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

        private async Task EnsureProductExists(long productId, CancellationToken cancellationToken)
        {
            bool exists = await DbContext.Set<Product>().AsNoTracking().AnyAsync(item => item.Id == productId, cancellationToken);
            if (!exists)
            {
                throw new InvalidOperationException("product.notFound");
            }
        }

        private async Task EnsureSlugIsUnique(long productId, string slug, long? ignoreId, CancellationToken cancellationToken)
        {
            bool exists = await DbContext.Set<Module>()
                .AsNoTracking()
                .AnyAsync(item => item.ProductId == productId && item.Slug == slug && (ignoreId == null || item.Id != ignoreId), cancellationToken);

            if (exists)
            {
                throw new InvalidOperationException("module.slug.duplicated");
            }
        }
    }
}
