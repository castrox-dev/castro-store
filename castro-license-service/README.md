# Castro License Service

Bot Discord + API HTTP para licenças **V3** dos tablets `police_tablet_licensed` e `faction_tablet_licensed`.

## Requisitos

- Node.js 22.5+ (SQLite nativo `node:sqlite`; sem módulos nativos no deploy)
- Bot Discord ([Discord Developer Portal](https://discord.com/developers/applications))
- Porta TCP aberta para o FiveM chamar a API (ex.: `3847`)

## Instalação

```bash
cd tools/castro-license-service
cp .env.example .env
# Edite .env (token, client id, secret, roles)
npm install
npm run register-commands
npm start
```

## Comandos Discord

| Comando | Quem | Descrição |
|---------|------|-----------|
| `/gerar-licenca` | Comprador ou staff | Gera `NWPD` / `NWFT` / bundle |
| `/revogar-licenca` | Staff | Revoga por utilizador ou ID |
| `/status-licenca` | Todos | Lista licenças ativas |

## Configurar no FiveM (cliente)

Em `police_tablet_licensed/config.lua` e `faction_tablet_licensed/config.lua`:

```lua
Config.LicenseKey = 'NWPD-...'  -- ou NWFT-...

Config.LicenseApiUrl = 'http://IP_DO_VPS:3847/v1/license/validate'
Config.LicenseApiSecret = 'mesmo_valor_que_LICENSE_API_SECRET_no_.env'
Config.LicenseApiTimeout = 10000
Config.LicenseRevalidateHours = 6
```

Se `LicenseApiUrl` ficar vazio, só validação **offline** (hash local).

## API

`GET /health` — status

`POST /v1/license/validate`

Header: `X-License-Secret: ...`

Body:

```json
{
  "licenseKey": "NWPD-XXXXXXXX-XXXXXXXX",
  "productId": "CXPD_TABLET_V3",
  "cfxKey": "cfxk_...",
  "resource": "police_tablet_licensed"
}
```

Resposta OK: `{ "valid": true, "reason": "ok" }`

## Variáveis .env

Ver `.env.example`. **Nunca** commite o `.env`.

## Produção

- Use PM2 ou systemd para manter o processo ativo
- HTTPS via nginx/Caddy em frente da API (recomendado)
- `AUDIT_WEBHOOK_URL` para log de gerações/revogações

## Segurança

- Não distribua esta pasta aos clientes
- `LICENSE_PEPPER` deve ser igual ao dos resources FiveM
- Chaves V2 antigas **não** funcionam — regenere com `/gerar-licenca`
