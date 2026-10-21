using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almanac.Infrastructure.Persistence.EF.Configurations
{
    public sealed class ModuleConfiguration : IEntityTypeConfiguration<Module>
    {
        public void Configure(EntityTypeBuilder<Module> builder)
        {
            builder.ToTable("module");

            builder.Property(entity => entity.Slug)
                .IsRequired()
                .HasMaxLength(80);

            builder.Property(entity => entity.Name)
                .IsRequired()
                .HasMaxLength(120);

            builder.Property(entity => entity.Description)
                .HasMaxLength(1000);

            builder.Property(entity => entity.SourcePath)
                .HasMaxLength(500);

            builder.HasOne(entity => entity.Product)
                .WithMany()
                .HasForeignKey(entity => entity.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(entity => new { entity.ProductId, entity.Slug }).IsUnique();
        }
    }
}
