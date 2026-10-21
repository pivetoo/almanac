using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almanac.Infrastructure.Persistence.EF.Configurations
{
    public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
    {
        public void Configure(EntityTypeBuilder<Product> builder)
        {
            builder.ToTable("product");

            builder.Property(entity => entity.Slug)
                .IsRequired()
                .HasMaxLength(80);

            builder.Property(entity => entity.Name)
                .IsRequired()
                .HasMaxLength(120);

            builder.Property(entity => entity.Description)
                .HasMaxLength(1000);

            builder.Property(entity => entity.Repository)
                .HasMaxLength(200);

            builder.HasIndex(entity => entity.Slug).IsUnique();
        }
    }
}
