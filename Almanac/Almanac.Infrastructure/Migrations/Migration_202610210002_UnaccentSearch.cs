using FluentMigrator;

namespace Almanac.Infrastructure.Migrations
{
    [Migration(202610210002)]
    public sealed class Migration_202610210002_UnaccentSearch : Migration
    {
        public override void Up()
        {
            // Extensao, configuracao de busca textual e coluna gerada nao tem equivalente na API fluente.
            Execute.Sql("CREATE EXTENSION IF NOT EXISTS unaccent");

            Execute.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese_unaccent') THEN
        CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
        ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
            ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
    END IF;
END
$$");

            RebuildSearchVector("portuguese_unaccent");
        }

        public override void Down()
        {
            RebuildSearchVector("portuguese");
        }

        private void RebuildSearchVector(string configuration)
        {
            if (Schema.Table("document").Index("ixdocumentsearchvector").Exists())
            {
                Delete.Index("ixdocumentsearchvector").OnTable("document");
            }

            if (Schema.Table("document").Column("searchvector").Exists())
            {
                Delete.Column("searchvector").FromTable("document");
            }

            Execute.Sql(
                "ALTER TABLE document ADD COLUMN searchvector tsvector GENERATED ALWAYS AS (" +
                $"setweight(to_tsvector('{configuration}', title), 'A') || " +
                $"setweight(to_tsvector('{configuration}', summary), 'B') || " +
                $"setweight(to_tsvector('{configuration}', body), 'C')) STORED");

            Execute.Sql("CREATE INDEX ixdocumentsearchvector ON document USING gin (searchvector)");
        }
    }
}
