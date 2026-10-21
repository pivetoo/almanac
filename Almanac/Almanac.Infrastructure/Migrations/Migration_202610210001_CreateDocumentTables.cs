using FluentMigrator;

namespace Almanac.Infrastructure.Migrations
{
    [Migration(202610210001)]
    public sealed class Migration_202610210001_CreateDocumentTables : Migration
    {
        public override void Up()
        {
            if (!Schema.Table("product").Exists())
            {
                Create.Table("product")
                    .WithColumn("id").AsInt64().PrimaryKey().Identity()
                    .WithColumn("slug").AsString(80).NotNullable()
                    .WithColumn("name").AsString(120).NotNullable()
                    .WithColumn("description").AsString(1000).Nullable()
                    .WithColumn("repository").AsString(200).Nullable()
                    .WithColumn("isactive").AsBoolean().NotNullable().WithDefaultValue(true)
                    .WithColumn("createdat").AsDateTimeOffset().NotNullable().WithDefault(SystemMethods.CurrentDateTime)
                    .WithColumn("updatedat").AsDateTimeOffset().Nullable();

                Create.Index("uxproductslug")
                    .OnTable("product")
                    .OnColumn("slug").Ascending()
                    .WithOptions().Unique();
            }

            if (!Schema.Table("module").Exists())
            {
                Create.Table("module")
                    .WithColumn("id").AsInt64().PrimaryKey().Identity()
                    .WithColumn("productid").AsInt64().NotNullable()
                    .WithColumn("slug").AsString(80).NotNullable()
                    .WithColumn("name").AsString(120).NotNullable()
                    .WithColumn("description").AsString(1000).Nullable()
                    .WithColumn("sourcepath").AsString(500).Nullable()
                    .WithColumn("isactive").AsBoolean().NotNullable().WithDefaultValue(true)
                    .WithColumn("createdat").AsDateTimeOffset().NotNullable().WithDefault(SystemMethods.CurrentDateTime)
                    .WithColumn("updatedat").AsDateTimeOffset().Nullable();

                Create.ForeignKey("fkmoduleproduct")
                    .FromTable("module").ForeignColumn("productid")
                    .ToTable("product").PrimaryColumn("id");

                Create.Index("uxmoduleproductslug")
                    .OnTable("module")
                    .OnColumn("productid").Ascending()
                    .OnColumn("slug").Ascending()
                    .WithOptions().Unique();
            }

            if (!Schema.Table("document").Exists())
            {
                Create.Table("document")
                    .WithColumn("id").AsInt64().PrimaryKey().Identity()
                    .WithColumn("moduleid").AsInt64().NotNullable()
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

                Create.ForeignKey("fkdocumentmodule")
                    .FromTable("document").ForeignColumn("moduleid")
                    .ToTable("module").PrimaryColumn("id");

                // Coluna gerada e indice GIN nao tem equivalente na API fluente: busca textual do Postgres.
                Execute.Sql(
                    "ALTER TABLE document ADD COLUMN searchvector tsvector GENERATED ALWAYS AS (" +
                    "setweight(to_tsvector('portuguese', title), 'A') || " +
                    "setweight(to_tsvector('portuguese', summary), 'B') || " +
                    "setweight(to_tsvector('portuguese', body), 'C')) STORED");

                Execute.Sql("CREATE INDEX ixdocumentsearchvector ON document USING gin (searchvector)");
                Execute.Sql("CREATE INDEX ixdocumenttags ON document USING gin (tags)");

                Create.Index("uxdocumentmoduletitle")
                    .OnTable("document")
                    .OnColumn("moduleid").Ascending()
                    .OnColumn("title").Ascending()
                    .WithOptions().Unique();
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

            // pgvector e opcional: o tipo vector e o indice HNSW nao existem na API fluente, e a extensao pode
            // nao estar instalada no servidor. Sem ela a tabela nao e criada e a busca fica so textual.
            Execute.Sql(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS documentembedding (
            documentid bigint PRIMARY KEY REFERENCES document (id) ON DELETE CASCADE,
            contenthash varchar(64) NOT NULL,
            model varchar(100) NOT NULL,
            embedding vector(1536) NOT NULL,
            createdat timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ixdocumentembeddingvector ON documentembedding USING hnsw (embedding vector_cosine_ops);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector indisponivel, busca vetorial desativada: %', SQLERRM;
END $$;");
        }

        public override void Down()
        {
            Execute.Sql("DROP TABLE IF EXISTS documentembedding");
            Delete.Table("documentversion");
            Delete.Table("document");
            Delete.Table("module");
            Delete.Table("product");
        }
    }
}
