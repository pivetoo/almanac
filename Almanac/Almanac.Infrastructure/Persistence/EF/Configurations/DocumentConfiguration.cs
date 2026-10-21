using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;

namespace Almanac.Infrastructure.Persistence.EF.Configurations
{
    public sealed class DocumentConfiguration : IEntityTypeConfiguration<Document>
    {
        public const string SearchVectorProperty = "SearchVector";

        public void Configure(EntityTypeBuilder<Document> builder)
        {
            builder.ToTable("document");

            builder.Property(entity => entity.Product)
                .IsRequired()
                .HasMaxLength(80);

            builder.Property(entity => entity.Module)
                .IsRequired()
                .HasMaxLength(80);

            builder.Property(entity => entity.Title)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(entity => entity.Summary)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(entity => entity.Body)
                .IsRequired()
                .HasColumnType("text");

            builder.Property(entity => entity.Tags)
                .IsRequired()
                .HasColumnType("text[]");

            builder.Property(entity => entity.SourceRepository)
                .HasMaxLength(200);

            builder.Property(entity => entity.SourcePath)
                .HasMaxLength(500);

            builder.Property(entity => entity.SourceCommit)
                .HasMaxLength(64);

            builder.Property<NpgsqlTsVector>(SearchVectorProperty)
                .HasColumnName("searchvector")
                .HasComputedColumnSql(
                    "setweight(to_tsvector('portuguese', title), 'A') || setweight(to_tsvector('portuguese', summary), 'B') || setweight(to_tsvector('portuguese', body), 'C')",
                    stored: true);

            builder.HasIndex(entity => new { entity.Product, entity.Module, entity.Title }).IsUnique();
        }
    }
}
