using Archon.Core.Entities;

namespace Almanac.Domain.Entities
{
    public class Product : Entity
    {
        public string Slug { get; private set; } = string.Empty;

        public string Name { get; private set; } = string.Empty;

        public string? Description { get; private set; }

        public string? Repository { get; private set; }

        public bool IsActive { get; private set; } = true;

        private Product()
        {
        }

        public Product(string slug, string name, string? description = null, string? repository = null)
        {
            Apply(slug, name, description, repository);
        }

        public void Update(string slug, string name, string? description, string? repository, bool isActive)
        {
            Apply(slug, name, description, repository);
            IsActive = isActive;
        }

        private void Apply(string slug, string name, string? description, string? repository)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(name);

            Slug = Entities.Slug.Normalize(slug);
            Name = name.Trim();
            Description = description?.Trim();
            Repository = repository?.Trim();
        }
    }
}
