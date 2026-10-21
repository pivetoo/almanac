using Almanac.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almanac.Infrastructure.Persistence.EF.Configurations
{
    public sealed class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
    {
        public void Configure(EntityTypeBuilder<DocumentVersion> builder)
        {
            builder.ToTable("documentversion");

            builder.Property(entity => entity.Title)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(entity => entity.Summary)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(entity => entity.Body)
                .IsRequired()
                .HasColumnType("text");

            builder.HasOne<Document>()
                .WithMany()
                .HasForeignKey(entity => entity.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(entity => new { entity.DocumentId, entity.Number }).IsUnique();
        }
    }
}
