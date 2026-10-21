# Almanac

Base de conhecimento do ecossistema Mainstay, feita para ser consultada por agentes de IA. O Almanac guarda a documentação de sistemas, plataformas e produtos em um banco PostgreSQL, com módulos, tags, status de revisão e histórico de versões, e a expõe por um servidor MCP para o Claude Code e outros clientes.

## Para que serve

- Dar ao agente acesso sob demanda à documentação, sem carregar tudo no contexto.
- Servir de fonte da verdade para documentação que ainda não existe em arquivos (`archon-framework`, `IdentityManagement`, `IntegrationPlatform`).
- Marcar o quanto cada documento é confiável: rascunho, revisado ou desatualizado.
- Controlar quem lê e quem escreve pelas permissões do IdentityManagement.

## Modelo

Três níveis: produto, módulo e documento. Produto e módulo são cadastros, então um slug digitado errado é rejeitado em vez de criar um produto novo sem ninguém perceber.

- **Produto** (`product`): slug único, nome, descrição e repositório. Exemplo: `identity-management`.
- **Módulo** (`module`): pertence a um produto. Slug único dentro do produto, nome, descrição e caminho de origem. Exemplo: `login`. A descrição é a primeira coisa que o agente lê em `list_modules`.
- **Documento** (`document`): pertence a um módulo. Ao criar, a API recebe os slugs `product` e `module` e resolve o módulo; se não existir, devolve erro pedindo o cadastro antes.

Campos do documento:

| Campo | Descrição |
|---|---|
| `type` | `Overview`, `Api`, `BusinessRule`, `Decision` ou `Runbook`. |
| `title` | Título, único dentro de produto e módulo. |
| `summary` | Resumo de 1 a 3 linhas, para o agente decidir se vale ler. |
| `body` | Conteúdo completo em Markdown. |
| `tags` | Lista de slugs. A busca exige todas as tags informadas. |
| `status` | `Draft`, `Reviewed` ou `Outdated`. Toda edição volta o documento para `Draft`. |
| `version` | Número da versão. A versão anterior é guardada em `documentversion` a cada edição. |
| `sourceRepository`, `sourcePath`, `sourceCommit` | Origem no código, para detectar documento desatualizado. |

## Busca

A busca é híbrida e tolera erro de digitação:

1. **Texto completo** do PostgreSQL (`tsvector`, configuração `portuguese`), com peso maior para título, depois resumo e corpo. Acerta nomes técnicos exatos.
2. **Vetorial** com `pgvector`: o texto do documento e a consulta viram embeddings, comparados por distância de cosseno (índice HNSW). Acerta quando a palavra não é exata.
3. Os dois rankings são combinados por Reciprocal Rank Fusion. Resultados vetoriais acima de `Embeddings:MaxDistance` são descartados, para não trazer ruído.

Os filtros de produto, módulo, tags e status valem para os dois caminhos.

O `pgvector` é opcional. A migration só cria a extensão e a tabela `documentembedding` se o servidor tiver a extensão disponível; sem ela, ou com `Embeddings:Enabled` desligado, a busca fica só textual e nada quebra. O embedding é calculado ao criar ou editar o documento; se o provedor falhar, o documento é salvo do mesmo jeito e fica só na busca textual. `POST api/documents/reindex` recalcula os que faltam ou mudaram.

Provedor de embeddings: qualquer API compatível com `POST {BaseUrl}/embeddings` (OpenAI, Ollama, gateways). O padrão é `text-embedding-3-small` com 1536 dimensões, que é a dimensão da coluna `vector(1536)`. Trocar para um modelo de outra dimensão exige nova migration e reindexação.

## Servidor MCP

Endpoint `POST /mcp` (HTTP, JSON-RPC 2.0), autenticado com o token do IdentityManagement. Ferramentas:

| Ferramenta | Capacidade exigida | O que faz |
|---|---|---|
| `list_modules` | `catalogo.ver` | Lista produtos e módulos, com descrição e contagem de documentos. |
| `search_docs` | `documentos.ver` | Busca por texto, produto, módulo, tags e status. Retorna título e resumo. |
| `read_doc` | `documentos.ver` | Lê um documento completo com metadados de origem e status. |

Registro no Claude Code (depois de o Almanac estar publicado):

```bash
claude mcp add --transport http almanac https://almanac.mainstay.com.br/mcp --header "Authorization: Bearer <token>"
```

## API REST

Mesmo envelope `ApiResponse` dos demais sistemas.

- `api/products` e `api/modules`: `GET` (lista paginada), `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}`. Produto com módulos e módulo com documentos não podem ser excluídos. `GET api/modules/summaries` devolve o que o `list_modules` usa.
- `api/documents`: `GET`, `GET {id}`, `GET {id}/versions`, `GET search`, `POST`, `PUT {id}`, `PUT {id}/status`, `DELETE {id}`.
- `POST api/documents/reindex`: recalcula os embeddings pendentes.

As rotas se dividem em dois módulos de acesso, registrados no IdentityManagement pelo sync de acessos do Archon: `documentos` (`ver`, `editar`, `revisar`, `excluir`) e `catalogo` (`ver`, `editar`, `excluir`). O verbo vem do método HTTP: `GET` é `ver`, `DELETE` é `excluir` e os demais são `editar`; `PUT api/documents/{id}/status` exige `documentos.revisar`.

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
# opcional, para a busca vetorial (o banco precisa ter a extensao pgvector instalada)
dotnet user-secrets --project Almanac.Api set "Embeddings:Enabled" "true"
dotnet user-secrets --project Almanac.Api set "Embeddings:ApiKey" "<chave do provedor>"
dotnet run --project Almanac.Api
```

As migrations rodam na subida (`RunMigrations`). Credenciais nunca vão para `appsettings.json`.

Testes:

```bash
dotnet test Almanac/Almanac.Testing/Almanac.Testing.csproj
```

## Autenticação

O Almanac é um sistema registrado no IdentityManagement, com `audience` `almanac`. Cada usuário recebe as capacidades `documentos.*` e `catalogo.*` por papel, e o mesmo token vale para a API REST e para o MCP. O MCP também aceita as claims `permission` antigas (`documents.search` e afins) e `root`.

### Login pelo navegador no MCP

O Almanac segue o fluxo de autorização do MCP:

1. `POST /mcp` sem token responde `401` com `WWW-Authenticate: Bearer resource_metadata="<url>/.well-known/oauth-protected-resource"`.
2. Esse documento (`GET /.well-known/oauth-protected-resource`) aponta o IdentityManagement como servidor de autorização (`Mcp:AuthorizationServer`) e anuncia o escopo `offline_access` (`Mcp:Scopes`).
3. O cliente lê a descoberta do IdentityManagement (`/.well-known/oauth-authorization-server` ou `/.well-known/openid-configuration`), abre o navegador na tela de login e troca o código por token com PKCE.

O IdentityManagement não tem registro dinâmico de cliente, então o client OAuth do MCP precisa existir antes (público, com PKCE, `offline_access` permitido e o redirect local do Claude Code). Configurações do Almanac: `Mcp:PublicBaseUrl` (URL pública atrás do nginx), `Mcp:AuthorizationServer` e `Mcp:Scopes`.

Tempo de vida do token vem do client no IdentityManagement: access token de 15 minutos e refresh token de 30 dias por padrão. A renovação automática depende de o cliente pedir `offline_access`.

### Registro no IdentityManagement

Cadastrado em 2026-10-21: sistema `Almanac` (`audience` `almanac`), contrato próprio para a empresa Mainstay, papel `Administrador` (raiz) e client OAuth público `almanac-mcp` (PKCE obrigatório, `offline_access` permitido, access token de 15 minutos, refresh token de 30 dias com rotação). O redirect permitido é `http://localhost:8765/callback`. As permissões (`documents.*`, `products.*`, `modules.*`) entram sozinhas quando o Almanac sobe com a chave do sistema (`IdentityCatalog:IdMApiKey`). Falta o registro do banco do tenant (`tenantdatabases`), que depende de o banco do Almanac existir na VPS.

Comando para registrar o MCP no Claude Code (a porta precisa ser a do redirect cadastrado):

```bash
claude mcp add --transport http --client-id almanac-mcp --callback-port 8765 almanac https://almanac.mainstay.com.br/mcp
```

Depois, no Claude Code, `/mcp` e escolher o servidor para abrir o login no navegador.

### Desenvolvimento local sem o IdentityManagement

Só em `ASPNETCORE_ENVIRONMENT=Development`, com `DevAuth:Enabled=true`, toda requisição entra como `root`. Fora de Development a opção é ignorada.

```bash
dotnet user-secrets --project Almanac.Api set "DevAuth:Enabled" "true"
```

Atenção: no startup o Archon sincroniza os recursos de acesso com o IdentityManagement configurado em `IdentityCatalog`. Em máquina local, deixe `IdentityCatalog:IdMApiKey` com o placeholder para não sincronizar com produção.

## Estado atual

Produto, módulo e documento, API REST, busca híbrida (texto e `pgvector`), histórico de versões e servidor MCP somente leitura. Próximos passos:

- Registrar o Almanac no IdentityManagement e publicar na VPS (instalar a extensão `pgvector` no Postgres de produção).
- Ferramenta MCP de escrita que grava proposta de edição para revisão humana.
- Rotina que gera rascunhos a partir do código e marca como `Outdated` o que mudou no commit de origem.
