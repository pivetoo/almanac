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
                "Identity-Management",
                "Login",
                DocumentType.Overview,
                "  Fluxo de login  ",
                "Resumo do fluxo de login.",
                "Corpo do documento.",
                ["OIDC", "auth", "oidc"]);
        }

        [Test]
        public void Constructor_NormalizesSlugsAndTags()
        {
            Document document = NewDocument();

            document.Product.Should().Be("identity-management");
            document.Module.Should().Be("login");
            document.Title.Should().Be("Fluxo de login");
            document.Tags.Should().Equal("auth", "oidc");
            document.Status.Should().Be(DocumentStatus.Draft);
            document.Version.Should().Be(1);
        }

        [Test]
        public void Constructor_RejectsInvalidSlug()
        {
            Action act = () => new Document("Identity Management", "login", DocumentType.Overview, "Titulo", "Resumo valido.", "Corpo");

            act.Should().Throw<ArgumentException>().WithMessage("document.slug.invalidFormat*");
        }

        [Test]
        public void Update_IncrementsVersionAndResetsStatusToDraft()
        {
            Document document = NewDocument();
            document.SetStatus(DocumentStatus.Reviewed);

            document.Update("identity-management", "login", DocumentType.Api, "Fluxo de login", "Novo resumo.", "Novo corpo.", ["auth"], null, null, null);

            document.Version.Should().Be(2);
            document.Status.Should().Be(DocumentStatus.Draft);
            document.Body.Should().Be("Novo corpo.");
        }

        [Test]
        public void CreateSnapshot_KeepsContentBeforeUpdate()
        {
            Document document = NewDocument();

            DocumentVersion snapshot = document.CreateSnapshot();
            document.Update("identity-management", "login", DocumentType.Api, "Outro titulo", "Novo resumo.", "Novo corpo.", null, null, null, null);

            snapshot.Number.Should().Be(1);
            snapshot.Title.Should().Be("Fluxo de login");
            snapshot.Body.Should().Be("Corpo do documento.");
        }
    }
}
