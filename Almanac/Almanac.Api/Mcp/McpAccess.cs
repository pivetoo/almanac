using System.Security.Claims;

namespace Almanac.Api.Mcp
{
    public static class McpAccess
    {
        public const string ListModulesCapability = "catalogo.ver";
        public const string SearchDocsCapability = "documentos.ver";
        public const string ReadDocCapability = "documentos.ver";

        public static bool Allows(ClaimsPrincipal user, string capability, string permission)
        {
            ArgumentNullException.ThrowIfNull(user);

            return user.HasClaim("root", "true")
                || user.HasClaim("capability", capability)
                || user.HasClaim("permission", permission);
        }
    }
}
