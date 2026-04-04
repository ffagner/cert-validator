# CLAUDE.md — Cert Validator

Regras de projeto, padrões de código e diretrizes de construção para o sistema **Cert Validator**.
Leia este arquivo integralmente antes de iniciar qualquer tarefa.

---

## 1. Contexto do Projeto

Sistema web para emissão e validação de certificados digitais.

- **Admin** emite certificados via painel autenticado → recebe QR Code PNG
- **Qualquer pessoa** valida o certificado escaneando o QR → página pública `/validar/:uuid`
- Escopo completo em `cert-validator-escopo.md`

---

## 2. Princípios Gerais

- **Construção gradativa** — implemente exatamente o que a fase atual pede. Não antecipe código de fases futuras.
- **Sem over-engineering** — nada de abstrações genéricas, factories, ou helpers que só têm um uso.
- **Sem código morto** — arquivos `.gitkeep` são os únicos placeholders permitidos (já definidos no escopo). Não crie arquivos vazios além desses.
- **Sem comentários óbvios** — comente apenas lógica não evidente (ex: ordem de verificação de estados do certificado).
- **TypeScript estrito** — sem `any`, sem `as unknown as X`. Se precisar de cast, explique o motivo em comentário.

---

## 3. Ordem de Implementação

Siga **rigorosamente** a ordem definida no escopo (seção 15). Não inicie uma fase sem a anterior estar funcional e testável.

| Fase | Entregável |
|---|---|
| 1 | Projeto Firebase configurado (Hosting + Functions + Firestore + Auth) |
| 2 | Backend base: Express dentro de Functions, TypeScript, CORS |
| 3 | Middleware `verifyFirebaseToken` |
| 4 | `POST /api/certificates` + Firestore + QR Code |
| 5 | `GET /api/certificates/:uuid` + lógica de estados |
| 6 | `PATCH /api/certificates/:uuid/revoke` |
| 7 | Frontend: React + Vite + TailwindCSS + Firebase SDK client |
| 8 | Tela de login Firebase Auth |
| 9 | Painel admin: formulário de emissão + download do QR |
| 10 | Listagem e revogação de certificados |
| 11 | Página pública `/validar/:uuid` |
| 12 | Deploy + teste com QR físico |

---

## 4. Estrutura de Pastas

Siga exatamente a estrutura definida no escopo (seção 13). Não crie pastas ou arquivos fora do previsto sem justificativa explícita.

```
cert-validator/
├── CLAUDE.md
├── firebase.json
├── .firebaserc
├── frontend/
│   └── src/
│       ├── app/          # App.tsx, firebase.ts
│       ├── features/     # admin/, validation/, templates/ (v2)
│       └── shared/       # components/, hooks/, api/
└── backend/
    └── src/
        ├── app.ts
        ├── index.ts
        ├── routes/
        ├── controllers/
        ├── middlewares/
        └── services/
```

---

## 5. Regras do Backend

### 5.1 Tecnologias permitidas (v1)
Apenas as dependências listadas no escopo (seção 7). Não adicione pacotes sem necessidade clara e aprovação.

### 5.2 Camadas e responsabilidades

| Camada | Responsabilidade |
|---|---|
| `routes/` | Apenas mapeamento de rota → controller. Sem lógica. |
| `controllers/` | Orquestra: valida input, chama serviços, monta response. Sem acesso direto ao Firestore. |
| `services/` | Lógica de negócio e acesso ao Firestore. Sem conhecimento do Express (req/res). |
| `middlewares/` | Interceptação transversal (auth, erros). |

### 5.3 Validação de estados do certificado

A ordem de verificação no `GET /api/certificates/:uuid` é **obrigatória**:

```
1. Documento existe?        → não  → { status: "not_found" }
2. isActive === false?      → sim  → { status: "revoked" }
3. expiresAt < hoje?        → sim  → { status: "expired" }
4. Caso contrário           →       { status: "valid", ...dados }
```

Nunca altere essa ordem sem revisão explícita.

### 5.4 Tratamento de erros

- Controllers devem usar `try/catch` e repassar para o error handler global.
- Não retorne stack traces em produção. Use mensagens genéricas para erros 500.
- Use os códigos HTTP definidos no escopo (seção 10). Não invente novos.

### 5.5 Variáveis de ambiente

- Em desenvolvimento: use `.env` com `dotenv`.
- Nunca comite `.env`. O `.gitignore` deve incluí-lo desde o início.
- Variáveis obrigatórias: `FIREBASE_PROJECT_ID`, `VALIDATION_BASE_URL`.

---

## 6. Regras do Frontend

### 6.1 Roteamento

| Rota | Componente | Auth |
|---|---|---|
| `/login` | `LoginPage.tsx` | Pública — redireciona se já autenticado |
| `/admin` | `DashboardPage.tsx` | Privada — protegida por `PrivateRoute` |
| `/validar/:uuid` | `ValidationPage.tsx` | Pública |

### 6.2 Autenticação no frontend

- O `PrivateRoute` deve verificar o estado do Firebase Auth antes de renderizar.
- Nunca armazene o `idToken` em `localStorage`. Use o SDK do Firebase diretamente.
- Para chamadas autenticadas, obtenha o token via `user.getIdToken()` no momento da requisição.

### 6.3 Chamadas à API

- Todas as chamadas HTTP passam pelos arquivos em `shared/api/`.
- Nenhum componente deve usar Axios diretamente — apenas via funções exportadas de `certificates.api.ts`.
- Tipagem: todas as funções de API devem ter tipos de retorno explícitos.

### 6.4 Estilização

- Apenas TailwindCSS. Sem CSS modules, styled-components, ou CSS inline.
- Sem bibliotecas de componentes (MUI, Shadcn, etc.) na v1.
- Design simples e funcional — não é o foco da v1.

---

## 7. Regras de Tipagem (TypeScript)

- A interface `Certificate` definida no escopo (seção 9) é a fonte da verdade. Não duplique nem derive tipos paralelos.
- Compartilhe tipos entre frontend e backend apenas se for criado um pacote `shared/` — na v1, duplique com cautela e documente.
- Campos `Timestamp` do Firestore devem ser convertidos para `string` ISO antes de sair da camada de serviço.

---

## 8. Git e Commits

- Um commit por fase concluída, no mínimo.
- Mensagens em português, imperativo, descritivas: `feat: adiciona endpoint de emissão de certificado`.
- Prefixos obrigatórios: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Nunca comite: `.env`, `node_modules/`, `dist/`, arquivos de build, chaves de serviço Firebase (`.json`).

---

## 9. O que está fora do escopo (v1)

Não implemente os itens abaixo, mesmo que pareça simples ou útil:

- Multi-tenant / múltiplas empresas
- Edição de certificados já emitidos
- Envio de e-mail após emissão
- Log de acessos à página de validação
- Relatórios ou dashboards
- Geração automática do certificado com template (isso é v2)
- Qualquer funcionalidade da seção 16 do escopo

---

## 10. Segurança — Checklist por fase

Antes de concluir cada fase, verifique:

- [ ] Nenhuma rota protegida está acessível sem o middleware `verifyFirebaseToken`
- [ ] O endpoint `GET /api/certificates/:uuid` não exige auth e não vaza dados sensíveis além do definido
- [ ] Inputs do formulário de emissão são validados no backend (não confie apenas no frontend)
- [ ] `.env` está no `.gitignore`
- [ ] Chaves de serviço do Firebase não estão hardcoded
- [ ] As regras do Firestore bloqueiam escrita via client SDK

---

*Baseado no escopo Cert Validator v1.1 — Abril de 2026*
