using System.ComponentModel.DataAnnotations;
using Almanac.Domain.ValueObjects;

namespace Almanac.Application.Requests.Documents
{
    public class CreateDocumentRequest
    {
        [Required]
        [StringLength(80, MinimumLength = 2)]
        public string Product { get; set; } = string.Empty;

        [Required]
        [StringLength(80, MinimumLength = 2)]
        public string Module { get; set; } = string.Empty;

        [EnumDataType(typeof(DocumentType))]
        public DocumentType Type { get; set; } = DocumentType.Overview;

        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000, MinimumLength = 10)]
        public string Summary { get; set; } = string.Empty;

        [Required]
        public string Body { get; set; } = string.Empty;

        public List<string>? Tags { get; set; }

        [StringLength(200)]
        public string? SourceRepository { get; set; }

        [StringLength(500)]
        public string? SourcePath { get; set; }

        [StringLength(64)]
        public string? SourceCommit { get; set; }
    }
}
