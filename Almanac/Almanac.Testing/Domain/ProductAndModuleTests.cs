using Almanac.Domain.Entities;

namespace Almanac.Testing.Domain
{
    [TestFixture]
    public class ProductAndModuleTests
    {
        [TestCase("Identity-Management", "identity-management")]
        [TestCase("  archon  ", "archon")]
        public void Slug_Normalize_LowercasesAndTrims(string input, string expected)
        {
            Slug.Normalize(input).Should().Be(expected);
        }

        [TestCase("Identity Management")]
        [TestCase("identity_management")]
        [TestCase("-login")]
        [TestCase("login-")]
        public void Slug_Normalize_RejectsInvalidFormat(string input)
        {
            Action act = () => Slug.Normalize(input);

            act.Should().Throw<ArgumentException>();
        }

        [Test]
        public void Product_Update_ChangesFieldsAndActiveFlag()
        {
            Product product = new("IdentityManagement".ToLowerInvariant(), "  Identity Management  ", "Autenticacao", "pivetoo/identity-access-management");

            product.Update("identity-management", "Identity", null, null, false);

            product.Slug.Should().Be("identity-management");
            product.Name.Should().Be("Identity");
            product.Description.Should().BeNull();
            product.IsActive.Should().BeFalse();
        }

        [Test]
        public void Module_Constructor_NormalizesSlugAndKeepsProduct()
        {
            Module module = new(3, "Login", "Login", "Fluxo de autenticacao", "src/Login");

            module.ProductId.Should().Be(3);
            module.Slug.Should().Be("login");
            module.IsActive.Should().BeTrue();
        }
    }
}
