using Archon.Api.Attributes;
using Archon.Api.Controllers;
using Archon.Core.Pagination;
using Almanac.Application.Localization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Modules;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace Almanac.Api.Controllers
{
    [AccessArea("modules.area")]
    [AccessModule("catalogo")]
    public sealed class ModulesController : ApiControllerBase
    {
        private readonly IModuleService moduleService;
        private new IStringLocalizer<AlmanacResource> Localizer { get; }

        public ModulesController(IModuleService moduleService, IStringLocalizer<AlmanacResource> localizer)
        {
            this.moduleService = moduleService;
            Localizer = localizer;
        }

        [RequireAccess("modules.get.description")]
        [GetEndpoint]
        public async Task<IActionResult> Get([FromQuery] PagedRequest request, [FromQuery] string? product, CancellationToken cancellationToken)
        {
            PagedResult<Module> result = await moduleService.GetModules(request, product, cancellationToken);
            return Http200(result);
        }

        [RequireAccess("modules.getById.description")]
        [GetEndpoint("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        {
            if (id <= 0)
            {
                return Http400(Localizer["request.id.required"]);
            }

            Module? entity = await moduleService.GetModuleById(id, cancellationToken);
            return entity is null ? Http404(Localizer["module.notFound"]) : Http200(entity);
        }

        [RequireAccess("modules.summaries.description")]
        [GetEndpoint]
        public async Task<IActionResult> Summaries([FromQuery] string? product, CancellationToken cancellationToken)
        {
            List<ModuleSummary> summaries = await moduleService.GetSummaries(product, cancellationToken);
            return Http200(summaries);
        }

        [RequireAccess("modules.create.description")]
        [PostEndpoint]
        public async Task<IActionResult> Create([FromBody] CreateModuleRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Module module = await moduleService.CreateModule(request, cancellationToken);
            return Http201(module, Localizer["module.created"]);
        }

        [RequireAccess("modules.update.description")]
        [PutEndpoint("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateModuleRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Module module = await moduleService.UpdateModule(id, request, cancellationToken);
            return Http200(module, Localizer["module.updated"]);
        }

        [RequireAccess("modules.delete.description")]
        [DeleteEndpoint("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            Module? module = await moduleService.Delete(id, cancellationToken);
            if (module is null)
            {
                return Http404(moduleService.GetErrorMessages());
            }

            return Http200(module, Localizer["module.deleted"]);
        }
    }
}
