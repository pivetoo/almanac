using System.ComponentModel.DataAnnotations;

namespace Almanac.Application.Requests.Modules
{
    public sealed class UpdateModuleRequest : CreateModuleRequest
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
