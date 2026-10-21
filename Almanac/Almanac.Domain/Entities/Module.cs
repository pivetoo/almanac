using Archon.Core.Entities;

namespace Almanac.Domain.Entities
{
    public class Module : Entity
    {
        public long ProductId { get; private set; }

        public Product? Product { get; private set; }

        public string Slug { get; private set; } = string.Empty;

        public string Name { get; private set; } = string.Empty;

        public string? Description { get; private set; }

        public string? SourcePath { get; private set; }

        public bool IsActive { get; private set; } = true;

        private Module()
        {
        }

        public Module(long productId, string slug, string name, string? description = null, string? sourcePath = null)
        {
            ProductId = productId;
            Apply(slug, name, description, sourcePath);
        }

        public void Update(string slug, string name, string? description, string? sourcePath, bool isActive)
        {
            Apply(slug, name, description, sourcePath);
            IsActive = isActive;
        }

        private void Apply(string slug, string name, string? description, string? sourcePath)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(name);

            Slug = Entities.Slug.Normalize(slug);
            Name = name.Trim();
            Description = description?.Trim();
            SourcePath = sourcePath?.Trim();
        }
    }
}
