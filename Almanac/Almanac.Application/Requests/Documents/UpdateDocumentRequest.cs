using System.ComponentModel.DataAnnotations;

namespace Almanac.Application.Requests.Documents
{
    public sealed class UpdateDocumentRequest : CreateDocumentRequest
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }
    }
}
