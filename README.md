# CLEAN SENSI

Painel web responsivo em **azul-marinho**, com login por key, gerador de sensibilidade, histórico e favoritos, área Auxílio, suporte via Discord e painel administrativo.

## Desenvolver e validar

```bash
pnpm install --frozen-lockfile
pnpm dev
```

```bash
pnpm check
pnpm test
pnpm build
```

## Identidade e acesso administrativo

O painel identifica o administrador como `CLEADMIN00`. A chave usada para autenticar o administrador é configurada separadamente pela variável privada `RBXIS_ADMIN_KEY`; não a grave neste repositório público. O segredo de sessão também é obrigatório.

## Deploy na Vercel

Importe este repositório na Vercel e configure estas variáveis de ambiente em todos os ambientes necessários:

- `RBXIS_ADMIN_KEY`: chave privada e exclusiva para o login administrativo.
- `RBXIS_SESSION_SECRET`: segredo aleatório longo. Gere um valor novo com `openssl rand -hex 32`.
- `MOCKAPI_KEYS_URL`: `https://6ac92b96fd7c536b1bda8e99.mockapi.io/licencas`.

Não inclua valores de segredo em commits, issues públicas ou arquivos de ambiente publicados.

## MockAPI

A coleção de licenças usa `https://6ac92b96fd7c536b1bda8e99.mockapi.io/licencas`. Se a coleção exigir schema fixo, disponibilize estes campos:

| Campo | Tipo | Uso |
|---|---|---|
| `key` | String | Credencial gerada |
| `username` | String | Usuário associado à key |
| `used` | Boolean | Indica ativação |
| `device` | String | HWID vinculado |
| `expire` | Number | Duração da licença |
| `type` | String | Plano, como `daily`, `weekly`, `hourly` ou `perm` |
| `createdAt` | Number | Data de criação em Unix seconds |
| `activatedAt` | Number | Primeira ativação em Unix seconds |
| `expiresAt` | Number | Expiração em Unix seconds |
| `status` | String | `active`, `revoked` ou `blocked` |
| `onlineAt` | Number | Última atividade em Unix seconds |
| `history` | Array/Object | Histórico e favoritos do gerador |

O campo `id` pode ser criado pela MockAPI. As keys novas usam o prefixo `CLEAN-SENSI-`.

## Discord

O botão **Discord** na tela de login e a página Sobre direcionam para [discord.gg/EDBtEVWpTM](https://discord.gg/EDBtEVWpTM).

## PWA

O título, tema e manifesto de instalação estão configurados para CLEAN SENSI. Para atualizar uma instalação antiga no celular após o deploy, feche e reabra o PWA; se o cache persistir, remova o atalho antigo e adicione-o novamente pelo navegador.
