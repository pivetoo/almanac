using Archon.Application.Services;
using Archon.Core.Pagination;
using Almanac.Application.Models;
using Almanac.Application.Requests.Modules;
using Almanac.Domain.Entities;

namespace Almanac.Application.Services
{
    public interface IModuleService : ICrudService<Module>
    {
        Task<PagedResult<Module>> GetModules(PagedRequest request, string? product, CancellationToken cancellationToken = default);

        Task<Module?> GetModuleById(long id, CancellationToken cancellationToken = default);

        Task<List<ModuleSummary>> GetSummaries(string? product, CancellationToken cancellationToken = default);

        Task<Module> CreateModule(CreateModuleRequest request, CancellationToken cancellationToken = default);

        Task<Module> UpdateModule(long id, UpdateModuleRequest request, CancellationToken cancellationToken = default);
    }
}
