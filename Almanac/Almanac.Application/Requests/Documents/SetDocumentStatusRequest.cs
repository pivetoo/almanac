using System.ComponentModel.DataAnnotations;
using Almanac.Domain.ValueObjects;

namespace Almanac.Application.Requests.Documents
{
    public sealed class SetDocumentStatusRequest
    {
        [EnumDataType(typeof(DocumentStatus))]
        public DocumentStatus Status { get; set; }
    }
}
