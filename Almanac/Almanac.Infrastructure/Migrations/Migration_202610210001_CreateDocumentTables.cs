using FluentMigrator;

namespace Almanac.Infrastructure.Migrations
{
    [Migration(202610210001)]
    public sealed class Migration_202610210001_CreateDocumentTables : Migration
    {
        public override void Up()
        {
            if (!Schema.Table("document").Exists())
            {
                Create.Table("document")
                    .WithColumn("id").AsInt64().PrimaryKey().Identity()
                    .WithColumn("product").AsString(80).NotNullable()
                    .WithColumn("module").AsString(80).NotNullable()
                    .WithColumn("type").AsInt32().NotNullable()
                    .WithColumn("title").AsString(200).NotNullable()
                    .WithColumn("summary").AsString(1000).NotNullable()
                    .WithColumn("body").AsString(int.MaxValue).NotNullable()
                    .WithColumn("status").AsInt32().NotNullable()
                    .WithColumn("version").AsInt32().NotNullable().WithDefaultValue(1)
                    .WithColumn("tags").AsCustom("text[]").NotNullable().WithDefaultValue(RawSql.Insert("'{}'"))
                    .WithColumn("sourcerepository").AsString(200).Nullable()
                    .WithColumn("sourcepath").AsString(500).Nullable()
                    .WithColumn("sourcecommit").AsString(64).Nullable()
                    .WithColumn("createdat").AsDateTimeOffset().NotNullable().WithDefault(SystemMethods.CurrentDateTime)
                    .WithColumn("updatedat").AsDateTimeOffset().Nullable();

                // Coluna gerada e indice GIN nao tem equivalente na API fluente: busca textual do Postgres.
                Execute.Sql(
                    "ALTER TABLE document ADD COLUMN searchvector tsvector GENERATED ALWAYS AS (" +
                    "setweight(to_tsvector('portuguese', title), 'A') || " +
                    "setweight(to_tsvector('portuguese', summary), 'B') || " +
                    "setweight(to_tsvector('portuguese', body), 'C')) STORED");

                Execute.Sql("CREATE INDEX ixdocumentsearchvector ON document USING gin (searchvector)");
                Execute.Sql("CREATE INDEX ixdocumenttags ON document USING gin (tags)");

                Create.Index("uxdocumentproductmoduletitle")
                    .OnTable("document")
                    .OnColumn("product").Ascending()
                    .OnColumn("module").Ascending()
                    .OnColumn("title").Ascending()
                    .WithOptions().Unique();

                Create.Index("ixdocumentproductmodule")
                    .OnTable("document")
                    .OnColumn("product").Ascending()
                    .OnColumn("module").Ascending();
            }

            if (!Schema.Table("documentversion").Exists())
            {
                Create.Table("documentversion")
                    .WithColumn("id").AsInt64().PrimaryKey().Identity()
                    .WithColumn("documentid").AsInt64().NotNullable()
                    .WithColumn("number").AsInt32().NotNullable()
                    .WithColumn("title").AsString(200).NotNullable()
                    .WithColumn("summary").AsString(1000).NotNullable()
                    .WithColumn("body").AsString(int.MaxValue).NotNullable()
                    .WithColumn("status").AsInt32().NotNullable()
                    .WithColumn("createdat").AsDateTimeOffset().NotNullable().WithDefault(SystemMethods.CurrentDateTime)
                    .WithColumn("updatedat").AsDateTimeOffset().Nullable();

                Create.ForeignKey("fkdocumentversiondocument")
                    .FromTable("documentversion").ForeignColumn("documentid")
                    .ToTable("document").PrimaryColumn("id")
                    .OnDelete(System.Data.Rule.Cascade);

                Create.Index("uxdocumentversiondocumentnumber")
                    .OnTable("documentversion")
                    .OnColumn("documentid").Ascending()
                    .OnColumn("number").Ascending()
                    .WithOptions().Unique();
            }
        }

        public override void Down()
        {
            Delete.Table("documentversion");
            Delete.Table("document");
        }
    }
}
