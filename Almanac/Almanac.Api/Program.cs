using Archon.Api.DependencyInjection;
using Archon.Api.MultiTenancy;
using Archon.Infrastructure.DependencyInjection;
using Almanac.Api.Mcp;
using Almanac.Application.Localization;
using Almanac.Infrastructure.DependencyInjection;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AlmanacCors", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddAuthorization();
builder.Services.AddArchonApi(builder.Configuration, typeof(AlmanacResource));
builder.Services.AddAlmanacInfrastructure(builder.Configuration);
builder.Services.AddServicesFromAssembly(typeof(Program).Assembly);
builder.Services.AddArchonAuthentication(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseCors("AlmanacCors");
app.UseArchonApi();

app.UseAuthentication();
// Depois da autenticacao de proposito: o tenant sai de claim ja validada.
app.UseArchonTenantResolution();
app.UseAuthorization();
app.MapControllers();
app.MapAlmanacMcp();
await app.UseArchonAccessSyncAsync();
app.Run();
