using System.Security.Claims;
using Almanac.Api.Mcp;

namespace Almanac.Testing.Api
{
    [TestFixture]
    public class McpAccessTests
    {
        private static ClaimsPrincipal UserWith(params Claim[] claims)
        {
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        }

        [Test]
        public void Allows_ShouldAcceptRoot()
        {
            McpAccess.Allows(UserWith(new Claim("root", "true")), McpAccess.SearchDocsCapability, "documents.search").Should().BeTrue();
        }

        [Test]
        public void Allows_ShouldAcceptCapabilityClaim()
        {
            McpAccess.Allows(UserWith(new Claim("capability", "documentos.ver")), McpAccess.SearchDocsCapability, "documents.search").Should().BeTrue();
        }

        [Test]
        public void Allows_ShouldAcceptLegacyPermissionClaim()
        {
            McpAccess.Allows(UserWith(new Claim("permission", "documents.search")), McpAccess.SearchDocsCapability, "documents.search").Should().BeTrue();
        }

        [Test]
        public void Allows_ShouldRejectOtherCapability()
        {
            McpAccess.Allows(UserWith(new Claim("capability", "catalogo.ver")), McpAccess.SearchDocsCapability, "documents.search").Should().BeFalse();
        }

        [Test]
        public void Allows_ShouldRejectUserWithoutClaims()
        {
            McpAccess.Allows(UserWith(), McpAccess.ReadDocCapability, "documents.getById").Should().BeFalse();
        }
    }
}
