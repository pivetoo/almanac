using Archon.Core.Entities;
using Almanac.Domain.ValueObjects;

namespace Almanac.Domain.Entities
{
    public class DocumentVersion : Entity
    {
        public long DocumentId { get; private set; }

        public int Number { get; private set; }

        public string Title { get; private set; } = string.Empty;

        public string Summary { get; private set; } = string.Empty;

        public string Body { get; private set; } = string.Empty;

        public DocumentStatus Status { get; private set; }

        private DocumentVersion()
        {
        }

        public DocumentVersion(long documentId, int number, string title, string summary, string body, DocumentStatus status)
        {
            DocumentId = documentId;
            Number = number;
            Title = title;
            Summary = summary;
            Body = body;
            Status = status;
        }
    }
}
