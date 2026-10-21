# Deploy do Almanac na VPS (pull-based, sem runner na VPS)

Mesmo fluxo do IdentityManagement e do IntegrationPlatform:

1. Push na `main` roda o workflow **Tests**.
2. Se o Tests terminar verde, o workflow **Deploy Almanac** builda a imagem da API e publica no GHCR com as tags `:latest` e `:<sha>`.
3. Na VPS, o timer `almanac-deploy-poll.timer` roda `deploy.sh` a cada 30 s: `docker compose pull` + `up -d`.

O `archon-framework` é público, então os workflows o baixam sem secret.

## Arquivos

| Arquivo neste diretório | Destino na VPS |
|---|---|
| `deploy.sh` | `/opt/mainstay/platform/almanac/deploy.sh` (0755) |
| `../docker-compose.prod.yml` | `/opt/mainstay/platform/almanac/docker-compose.prod.yml` |
| `almanac-deploy-poll.service` e `.timer` | `/etc/systemd/system/` |
| `../nginx/almanac.mainstay.com.br.conf.example` | `/etc/nginx/sites-available/almanac.mainstay.com.br` |

Configuração de produção: `/opt/mainstay/platform/almanac/config/appsettings.Production.json` (montada no container, com a chave do sistema no IdentityManagement; nunca vai para o git).

## Portas e rede

- Container na rede `mainstay-net`, publicado em `127.0.0.1:8116` -> 8080.
- O banco `almanac` fica no Postgres do host (`172.20.0.1`, gateway da `mainstay-net`), usuário `app_almanac`. A string de conexão fica no `tenantdatabases` do contrato do Almanac no IdentityManagement.

## Banco com pgvector

O pacote `postgresql-17-pgvector` precisa estar instalado no host e a extensão criada pelo superusuário no banco `almanac` (`CREATE EXTENSION vector`), porque o usuário da aplicação não pode criá-la. Sem isso a migration pula a tabela de embeddings e a busca fica só textual.

## Setup na VPS (uma vez)

```bash
apt-get install -y postgresql-17-pgvector
# criar o usuario app_almanac e o banco almanac (dono app_almanac); como postgres, no banco almanac: CREATE EXTENSION vector;
mkdir -p /opt/mainstay/platform/almanac/config
# copiar deploy.sh (chmod 0755) e docker-compose.prod.yml; criar config/appsettings.Production.json (chmod 600)
# copiar os 2 units para /etc/systemd/system/ e: systemctl daemon-reload && systemctl enable --now almanac-deploy-poll.timer
# nginx: usar o vhost de exemplo; com o DNS apontando para a VPS: certbot --nginx -d almanac.mainstay.com.br
```

Habilite o timer só depois de a primeira imagem existir no GHCR, para o poll não falhar a cada 30 s.

## Operação

```bash
systemctl start almanac-deploy-poll.service
journalctl -u almanac-deploy-poll.service -n 20
docker logs --tail 50 almanac-api
```
