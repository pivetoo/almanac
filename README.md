# Almanac

Base de conhecimento do ecossistema Mainstay, feita para ser consultada por agentes de IA. O Almanac guarda a documentação de sistemas, plataformas e produtos em um banco PostgreSQL, com módulos, tags, status de revisão e histórico de versões, e a expõe por um servidor MCP para o Claude Code e outros clientes.

## Para que serve

- Dar ao agente acesso sob demanda à documentação, sem carregar tudo no contexto.
- Servir de fonte da verdade para documentação que ainda não existe em arquivos (`archon-framework`, `IdentityManagement`, `IntegrationPlatform`).
- Marcar o quanto cada documento é confiável: rascunho, revisado ou desatualizado.
- Controlar quem lê e quem escreve pelas permissões do IdentityManagement.

## Modelo de documento

Cada documento tem:

| Campo | Descrição |
|---|---|
| `product` | Produto ou plataforma, em slug (`identity-management`, `mainstay-agency`). |
| `module` | Módulo dentro do produto, em slug (`login`, `pipelines`). |
| `type` | `Overview`, `Api`, `BusinessRule`, `Decision` ou `Runbook`. |
| `title` | Título, único dentro de produto e módulo. |
| `summary` | Resumo de 1 a 3 linhas, para o agente decidir se vale ler. |
| `body` | Conteúdo completo em Markdown. |
| `tags` | Lista de slugs. A busca exige todas as tags informadas. |
| `status` | `Draft`, `Reviewed` ou `Outdated`. Toda edição volta o documento para `Draft`. |
| `version` | Número da versão. A versão anterior é guardada em `documentversion` a cada edição. |
| `sourceRepository`, `sourcePath`, `sourceCommit` | Origem no código, para detectar documento desatualizado. |

A busca usa texto completo do PostgreSQL (`tsvector`, configuração `portuguese`) com peso maior para título, depois resumo e corpo. Busca vetorial (`pgvector`) fica para uma etapa seguinte, se a busca por palavra se mostrar insuficiente.

## Servidor MCP

Endpoint `POST /mcp` (HTTP, JSON-RPC 2.0), autenticado com o token do IdentityManagement. Ferramentas:

| Ferramenta | Permissão exigida | O que faz |
|---|---|---|
| `list_modules` | `documents.modules` | Lista produtos e módulos com a contagem de documentos. |
| `search_docs` | `documents.search` | Busca por texto, produto, módulo, tags e status. Retorna título e resumo. |
| `read_doc` | `documents.getById` | Lê um documento completo com metadados de origem e status. |

Registro no Claude Code (depois de o Almanac estar publicado):

```bash
claude mcp add --transport http almanac https://almanac.mainstay.com.br/mcp --header "Authorization: Bearer <token>"
```

## API REST

Mesmo envelope `ApiResponse` dos demais sistemas. Rotas em `api/documents`:

- `GET api/documents`, `GET api/documents/{id}`, `GET api/documents/{id}/versions`
- `GET api/documents/search`, `GET api/documents/modules`
- `POST api/documents`, `PUT api/documents/{id}`, `PUT api/documents/{id}/status`, `DELETE api/documents/{id}`

Cada rota tem uma permissão `documents.<ação>` registrada no IdentityManagement pelo sync de acessos do Archon.

## Estrutura

```text
almanac/
└── Almanac/
    ├── Almanac.Api/              controllers, endpoint MCP, bootstrap
    ├── Almanac.Application/      requests, modelos, contratos de serviço, localização
    ├── Almanac.Domain/           entidades e value objects
    ├── Almanac.Infrastructure/   EF Core, migrations, serviços
    └── Almanac.Testing/          testes unitários
```

Construído sobre o `archon-framework` (.NET 10, EF Core, FluentMigrator, multi-tenant e autenticação via IdentityManagement). O caminho do framework é resolvido em `Directory.Build.props` (`ARCHON_FRAMEWORK_PATH` ou a posição padrão no monorepo).

## Executar localmente

Pré-requisitos: .NET 10 SDK e um PostgreSQL acessível.

```bash
cd Almanac
dotnet user-secrets --project Almanac.Api set "TenantDatabases:default:ConnectionString" "Host=localhost;Database=almanac;Username=...;Password=..."
dotnet user-secrets --project Almanac.Api set "TenantDatabases:default:DatabaseType" "PostgreSql"
dotnet user-secrets --project Almanac.Api set "TenantDatabases:default:ApplicationId" "almanac"
dotnet user-secrets --project Almanac.Api set "IdentityCatalog:IdMApiKey" "<chave do IdentityManagement>"
dotnet run --project Almanac.Api
```

As migrations rodam na subida (`RunMigrations`). Credenciais nunca vão para `appsettings.json`.

Testes:

```bash
dotnet test Almanac/Almanac.Testing/Almanac.Testing.csproj
```

## Autenticação

O Almanac é um sistema registrado no IdentityManagement, com `audience` `almanac`. Cada usuário recebe as permissões `documents.*` por papel, e o mesmo token vale para a API REST e para o MCP.

## Estado atual

Primeira fatia: modelo, migrations, API REST, busca textual, histórico de versões e servidor MCP somente leitura. Próximos passos:

- Registrar o Almanac no IdentityManagement e publicar na VPS.
- Ferramenta MCP de escrita que grava proposta de edição para revisão humana.
- Rotina que gera rascunhos a partir do código e marca como `Outdated` o que mudou no commit de origem.
- Busca híbrida com `pgvector`, se necessário.
