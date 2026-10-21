using System.Security.Claims;

namespace Almanac.Api.Security
{
    // Somente para desenvolvimento local: autentica toda requisicao como root, sem passar pelo IdentityManagement.
    public static class DevAuthMiddleware
    {
        public static IApplicationBuilder UseDevAuth(this WebApplication app)
        {
            if (!app.Environment.IsDevelopment() || !app.Configuration.GetValue<bool>("DevAuth:Enabled"))
            {
                return app;
            }

            return app.Use(async (context, next) =>
            {
                ClaimsIdentity identity = new(
                [
                    new Claim("root", "true"),
                    new Claim(ClaimTypes.Name, "dev"),
                    new Claim("name", "dev")
                ],
                "DevAuth");

                context.User = new ClaimsPrincipal(identity);
                await next();
            });
        }
    }
}
