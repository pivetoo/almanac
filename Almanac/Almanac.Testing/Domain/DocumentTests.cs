using Almanac.Domain.Entities;
using Almanac.Domain.ValueObjects;

namespace Almanac.Testing.Domain
{
    [TestFixture]
    public class DocumentTests
    {
        private static Document NewDocument()
        {
            return new Document(
                7,
                DocumentType.Overview,
                "  Fluxo de login  ",
                "Resumo do fluxo de login.",
                "Corpo do documento.",
                ["OIDC", "auth", "oidc"]);
        }

        [Test]
        public void Constructor_NormalizesTitleAndTags()
        {
            Document document = NewDocument();

            document.ModuleId.Should().Be(7);
            document.Title.Should().Be("Fluxo de login");
            document.Tags.Should().Equal("auth", "oidc");
            document.Status.Should().Be(DocumentStatus.Draft);
            document.Version.Should().Be(1);
        }

        [Test]
        public void Constructor_RejectsInvalidTag()
        {
            Action act = () => new Document(1, DocumentType.Overview, "Titulo", "Resumo valido.", "Corpo", ["tag invalida"]);

            act.Should().Throw<ArgumentException>().WithMessage("document.slug.invalidFormat*");
        }

        [Test]
        public void Update_IncrementsVersionAndResetsStatusToDraft()
        {
            Document document = NewDocument();
            document.SetStatus(DocumentStatus.Reviewed);

            document.Update(8, DocumentType.Api, "Fluxo de login", "Novo resumo.", "Novo corpo.", ["auth"], null, null, null);

            document.ModuleId.Should().Be(8);
            document.Version.Should().Be(2);
            document.Status.Should().Be(DocumentStatus.Draft);
            document.Body.Should().Be("Novo corpo.");
        }

        [Test]
        public void CreateSnapshot_KeepsContentBeforeUpdate()
        {
            Document document = NewDocument();

            DocumentVersion snapshot = document.CreateSnapshot();
            document.Update(7, DocumentType.Api, "Outro titulo", "Novo resumo.", "Novo corpo.", null, null, null, null);

            snapshot.Number.Should().Be(1);
            snapshot.Title.Should().Be("Fluxo de login");
            snapshot.Body.Should().Be("Corpo do documento.");
        }
    }
}
