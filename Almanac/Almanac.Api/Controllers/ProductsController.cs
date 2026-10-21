using Archon.Api.Attributes;
using Archon.Api.Controllers;
using Archon.Core.Pagination;
using Almanac.Application.Localization;
using Almanac.Application.Requests.Products;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace Almanac.Api.Controllers
{
    [AccessArea("products.area")]
    public sealed class ProductsController : ApiControllerBase
    {
        private readonly IProductService productService;
        private new IStringLocalizer<AlmanacResource> Localizer { get; }

        public ProductsController(IProductService productService, IStringLocalizer<AlmanacResource> localizer)
        {
            this.productService = productService;
            Localizer = localizer;
        }

        [RequireAccess("products.get.description")]
        [GetEndpoint]
        public async Task<IActionResult> Get([FromQuery] PagedRequest request, [FromQuery] string? search, CancellationToken cancellationToken)
        {
            PagedResult<Product> result = await productService.GetProducts(request, search, cancellationToken);
            return Http200(result);
        }

        [RequireAccess("products.getById.description")]
        [GetEndpoint("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        {
            if (id <= 0)
            {
                return Http400(Localizer["request.id.required"]);
            }

            Product? entity = await productService.GetProductById(id, cancellationToken);
            return entity is null ? Http404(Localizer["product.notFound"]) : Http200(entity);
        }

        [RequireAccess("products.create.description")]
        [PostEndpoint]
        public async Task<IActionResult> Create([FromBody] CreateProductRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Product product = await productService.CreateProduct(request, cancellationToken);
            return Http201(product, Localizer["product.created"]);
        }

        [RequireAccess("products.update.description")]
        [PutEndpoint("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Product product = await productService.UpdateProduct(id, request, cancellationToken);
            return Http200(product, Localizer["product.updated"]);
        }

        [RequireAccess("products.delete.description")]
        [DeleteEndpoint("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            Product? product = await productService.Delete(id, cancellationToken);
            if (product is null)
            {
                return Http404(productService.GetErrorMessages());
            }

            return Http200(product, Localizer["product.deleted"]);
        }
    }
}
