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

Registro no Claude Code, com login pelo navegador (ver "Login pelo navegador no MCP"):

```bash
claude mcp add --transport http --client-id almanac-mcp --callback-port 8765 almanac https://almanac.mainstay.com.br/mcp
```

## API REST

Mesmo envelope `ApiResponse` dos demais sistemas.

As rotas seguem o padrão `[action]` do Archon (`api/<Controller>/<Action>`):

- `api/Products` e `api/Modules`: `GET Get` (lista paginada), `GET GetById/{id}`, `POST Create`, `PUT Update/{id}`, `DELETE Delete/{id}`. Produto com módulos e módulo com documentos não podem ser excluídos. `GET api/Modules/Summaries` devolve o que o `list_modules` usa.
- `api/Documents`: `GET Get`, `GET GetById/{id}`, `GET Versions/{id}/versions`, `GET Search`, `GET Stats`, `POST Create`, `PUT Update/{id}`, `PUT SetStatus/{id}/status`, `DELETE Delete/{id}`.
- `POST api/Documents/Reindex`: recalcula os embeddings pendentes.
- `GET api/Documents/Stats`: totais por status e se a busca semântica está ativa.
- `GET api/Documents/Search` aceita `query`, `product`, `module`, `tags`, `status`, `limit` e `sort=recent` (sem `query`, ordena pelos alterados mais recentemente).

As rotas se dividem em dois módulos de acesso, registrados no IdentityManagement pelo sync de acessos do Archon: `documentos` (`ver`, `editar`, `revisar`, `excluir`) e `catalogo` (`ver`, `editar`, `excluir`). O verbo vem do método HTTP: `GET` é `ver`, `DELETE` é `excluir` e os demais são `editar`; `PUT api/documents/{id}/status` exige `documentos.revisar`.

## Estrutura

```text
almanac/
└── Almanac/
    ├── Almanac.Api/              controllers, endpoint MCP, bootstrap
    ├── Almanac.Application/      requests, modelos, contratos de serviço, localização
    ├── Almanac.Domain/           entidades e value objects
    ├── Almanac.Infrastructure/   EF Core, migrations, serviços
    ├── Almanac.Web/              interface web (React, archon-ui)
    └── Almanac.Testing/          testes unitários
```

Construído sobre o `archon-framework` (.NET 10, EF Core, FluentMigrator, multi-tenant e autenticação via IdentityManagement). O caminho do framework é resolvido em `Directory.Build.props` (`ARCHON_FRAMEWORK_PATH` ou a posição padrão no monorepo).

## Interface web

`Almanac.Web` é uma SPA em React 19 sobre o `archon-ui` (login OIDC com PKCE, tema claro e escuro, i18n pt-BR, en-US e es-AR). Telas:

- **Início**: busca em destaque, totais por status, produtos e documentos atualizados recentemente.
- **Buscar**: a mesma busca híbrida do MCP, com filtros de produto, módulo, tipo, status e tag na URL (links compartilháveis).
- **Produto e módulo**: navegação por produto e módulo, com os documentos agrupados por tipo.
- **Documento**: leitura em Markdown (tabelas, blocos de código com realce e cópia, índice lateral), status com destaque do que não foi revisado, histórico de versões com diferenças, copiar link e Markdown.
- **Editor**: Markdown com barra de ferramentas e pré-visualização lado a lado, modelo por tipo de documento, tags com sugestões, origem no código, atalho Ctrl+S e aviso de alteração não salva.
- **Revisão**: fila de rascunhos e desatualizados com ação de um clique.
- **Catálogo**: cadastro de produtos e módulos e estado da busca por significado (reindexação).
- **Guia de escrita**: o padrão de documentação, com os modelos de cada tipo.

Botões e telas respeitam as capacidades do usuário (`documentos.editar`, `documentos.revisar`, `documentos.excluir`, `catalogo.editar`, `catalogo.excluir`).

Desenvolvimento (precisa do `archon-ui` compilado em `frameworks/archon-ui`):

```bash
cd Almanac/Almanac.Web
cp .env.example .env.local
npm install
npm run dev
```

Variáveis: `VITE_API_BASE_URL`, `VITE_IDENTITY_MANAGEMENT_URL` e `VITE_OIDC_CLIENT_ID`. Em produção a web e a API ficam no mesmo domínio (`almanac.mainstay.com.br`): o nginx envia `/api`, `/mcp` e `/health` para a API e o resto para o container web.

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

Cadastrado em 2026-10-21: sistema `Almanac` (`audience` `almanac`), contrato próprio para a empresa Mainstay, papel `Administrador` (raiz), banco do tenant (`tenantdatabases`) e dois clients OAuth públicos, ambos com PKCE obrigatório, `offline_access` permitido, access token de 15 minutos e refresh token de 30 dias com rotação:

- `almanac-mcp`: usado pelo Claude Code, redirect `http://localhost:8765/callback`.
- `almanac-web`: usado pela interface web, redirects `https://almanac.mainstay.com.br/callback` e `http://localhost:5173/callback`. A origem `https://almanac.mainstay.com.br` precisa estar em `Cors:AllowedOrigins` do IdentityManagement.

As capacidades (`documentos.*`, `catalogo.*`) entram sozinhas quando o Almanac sobe com a chave do sistema (`IdentityCatalog:IdMApiKey`).

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

Em produção na VPS: produto, módulo e documento, API REST, interface web, busca híbrida (texto e `pgvector`), histórico de versões e servidor MCP somente leitura. Próximos passos:

- Ligar a busca por significado (chave do provedor de embeddings em `Embeddings:ApiKey` e `Embeddings:Enabled`).
- Ferramenta MCP de escrita que grava proposta de edição para revisão humana.
- Rotina que gera rascunhos a partir do código e marca como `Outdated` o que mudou no commit de origem.
