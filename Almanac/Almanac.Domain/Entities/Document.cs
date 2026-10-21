using System.Text.RegularExpressions;
using Archon.Core.Entities;
using Almanac.Domain.ValueObjects;

namespace Almanac.Domain.Entities
{
    public class Document : Entity
    {
        private static readonly Regex SlugPattern = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

        public string Product { get; private set; } = string.Empty;

        public string Module { get; private set; } = string.Empty;

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
            string product,
            string module,
            DocumentType type,
            string title,
            string summary,
            string body,
            IEnumerable<string>? tags = null,
            string? sourceRepository = null,
            string? sourcePath = null,
            string? sourceCommit = null)
        {
            Apply(product, module, type, title, summary, body, tags, sourceRepository, sourcePath, sourceCommit);
        }

        public DocumentVersion CreateSnapshot()
        {
            return new DocumentVersion(Id, Version, Title, Summary, Body, Status);
        }

        public void Update(
            string product,
            string module,
            DocumentType type,
            string title,
            string summary,
            string body,
            IEnumerable<string>? tags,
            string? sourceRepository,
            string? sourcePath,
            string? sourceCommit)
        {
            Apply(product, module, type, title, summary, body, tags, sourceRepository, sourcePath, sourceCommit);
            Version++;
            Status = DocumentStatus.Draft;
        }

        public void SetStatus(DocumentStatus status)
        {
            Status = status;
        }

        public static string NormalizeSlug(string value)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(value);

            string normalized = value.Trim().ToLowerInvariant();
            if (!SlugPattern.IsMatch(normalized))
            {
                throw new ArgumentException("document.slug.invalidFormat", nameof(value));
            }

            return normalized;
        }

        private void Apply(
            string product,
            string module,
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

            Product = NormalizeSlug(product);
            Module = NormalizeSlug(module);
            Type = type;
            Title = title.Trim();
            Summary = summary.Trim();
            Body = body.Trim();
            Tags = (tags ?? []).Select(NormalizeSlug).Distinct().Order().ToList();
            SourceRepository = sourceRepository?.Trim();
            SourcePath = sourcePath?.Trim();
            SourceCommit = sourceCommit?.Trim();
        }
    }
}
