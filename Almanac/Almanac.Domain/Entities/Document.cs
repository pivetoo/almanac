using Archon.Core.Entities;
using Almanac.Domain.ValueObjects;

namespace Almanac.Domain.Entities
{
    public class Document : Entity
    {
        public long ModuleId { get; private set; }

        public Module? Module { get; private set; }

        public DocumentType Type { get; private set; }

        public string Title { get; private set; } = string.Empty;

        public string Summary { get; private set; } = string.Empty;

        public string Body { get; private set; } = string.Empty;

        public DocumentStatus Status { get; private set; } = DocumentStatus.Draft;

        public int Version { get; private set; } = 1;

        public List<string> Tags { get; private set; } = [];

        public string? SourceRepository { get; private set; }

        public string? SourcePath { get; private set; }

        public string? SourceCommit { get; private set; }

        private Document()
        {
        }

        public Document(
            long moduleId,
            DocumentType type,
            string title,
            string summary,
            string body,
            IEnumerable<string>? tags = null,
            string? sourceRepository = null,
            string? sourcePath = null,
            string? sourceCommit = null)
        {
            ModuleId = moduleId;
            Apply(type, title, summary, body, tags, sourceRepository, sourcePath, sourceCommit);
        }

        public DocumentVersion CreateSnapshot()
        {
            return new DocumentVersion(Id, Version, Title, Summary, Body, Status);
        }

        public void Update(
            long moduleId,
            DocumentType type,
            string title,
            string summary,
            string body,
            IEnumerable<string>? tags,
            string? sourceRepository,
            string? sourcePath,
            string? sourceCommit)
        {
            ModuleId = moduleId;
            Apply(type, title, summary, body, tags, sourceRepository, sourcePath, sourceCommit);
            Version++;
            Status = DocumentStatus.Draft;
        }

        public void SetStatus(DocumentStatus status)
        {
            Status = status;
        }

        private void Apply(
            DocumentType type,
            string title,
            string summary,
            string body,
            IEnumerable<string>? tags,
            string? sourceRepository,
            string? sourcePath,
            string? sourceCommit)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(title);
            ArgumentException.ThrowIfNullOrWhiteSpace(summary);
            ArgumentException.ThrowIfNullOrWhiteSpace(body);

            Type = type;
            Title = title.Trim();
            Summary = summary.Trim();
            Body = body.Trim();
            Tags = (tags ?? []).Select(Slug.Normalize).Distinct().Order().ToList();
            SourceRepository = sourceRepository?.Trim();
            SourcePath = sourcePath?.Trim();
            SourceCommit = sourceCommit?.Trim();
        }
    }
}
