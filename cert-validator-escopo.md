# Cert Validator — Documento de Escopo do Projeto

> **Versão:** 1.1  
> **Data:** Abril de 2026  
> **Status:** Em planejamento

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Objetivo do Produto](#2-objetivo-do-produto)
3. [Público-Alvo](#3-público-alvo)
4. [Regras de Negócio](#4-regras-de-negócio)
5. [Funcionalidades](#5-funcionalidades)
6. [Fora do Escopo (v1)](#6-fora-do-escopo-v1)
7. [Stack Tecnológica](#7-stack-tecnológica)
8. [Arquitetura do Sistema](#8-arquitetura-do-sistema)
9. [Modelo de Dados](#9-modelo-de-dados)
10. [API — Endpoints](#10-api--endpoints)
11. [Autenticação e Autorização](#11-autenticação-e-autorização)
12. [Fluxos Principais](#12-fluxos-principais)
13. [Estrutura de Pastas](#13-estrutura-de-pastas)
14. [Infraestrutura e Deploy](#14-infraestrutura-e-deploy)
15. [Ordem de Implementação](#15-ordem-de-implementação)
16. [Roadmap — v2: Geração Automática de Certificados](#16-roadmap--v2-geração-automática-de-certificados)
17. [Glossário](#17-glossário)

---

## 1. Visão Geral

O **Cert Validator** é um sistema web para emissão e validação de certificados digitais. A empresa cadastra os certificados de seus alunos no painel administrativo e o sistema gera automaticamente um QR Code em PNG para ser inserido no template físico ou digital do certificado (Word, Canva, Figma etc.).

Ao escanear o QR Code, qualquer pessoa é direcionada a uma página pública que exibe os dados do certificado — confirmando sua autenticidade — ou informa que o certificado é inválido.

---

## 2. Objetivo do Produto

| Objetivo | Descrição |
|---|---|
| **Principal** | Permitir que empresas emitam certificados verificáveis e que qualquer pessoa possa confirmar a autenticidade de um certificado escaneando um QR Code |
| **Secundário** | Eliminar a necessidade de validação manual (e-mail, telefone) e reduzir a fraude de certificados |

---

## 3. Público-Alvo

### Empresa (Admin)
- Instituições de ensino, empresas de treinamento corporativo, ONGs, escolas técnicas
- Responsável por cadastrar e gerenciar os certificados
- Acessa o sistema via painel administrativo com login

### Aluno / Validador
- Aluno que recebeu o certificado
- Empregador, instituição ou qualquer pessoa que precise verificar a autenticidade
- Acessa apenas a página pública de validação — **sem cadastro ou login**

---

## 4. Regras de Negócio

### RN-01 — Unicidade do certificado
Cada certificado possui um identificador único (UUID v4) gerado pelo backend no momento da emissão. Esse UUID é imutável e nunca reutilizado.

### RN-02 — QR Code vinculado ao certificado
O QR Code gerado aponta para a URL pública de validação no formato:
```
https://seudominio.com/validar/{uuid}
```
O QR Code é entregue como imagem PNG (base64) e é responsabilidade da empresa inseri-lo no template do certificado.

### RN-03 — Validação pública e sem autenticação
O endpoint de validação e a página pública `/validar/:uuid` são acessíveis por qualquer pessoa, sem necessidade de login ou cadastro.

### RN-04 — Revogação sem exclusão
Um certificado pode ser **revogado** pela empresa a qualquer momento, alterando o campo `isActive` para `false`. O documento não é deletado do Firestore. Ao validar um certificado revogado, o sistema retorna uma mensagem informando que o certificado foi cancelado.

### RN-05 — Validade opcional
O certificado pode ter ou não uma data de expiração (`expiresAt`). Quando `expiresAt` é informado e a data atual ultrapassou esse valor, o sistema retorna o certificado como **expirado**, mesmo que `isActive` seja `true`.

### RN-06 — Estados de um certificado
Um certificado pode estar em um dos três estados no momento da validação:

| Estado | Condição | Mensagem exibida |
|---|---|---|
| **Válido** | `isActive = true` e não expirado | Dados do certificado exibidos |
| **Revogado** | `isActive = false` | "Este certificado foi cancelado pela instituição emissora" |
| **Expirado** | `expiresAt < dataAtual` | "Este certificado está expirado" |
| **Não encontrado** | UUID não existe no banco | "Certificado não encontrado ou inválido" |

### RN-07 — Somente admins emitem certificados
A criação de certificados exige autenticação via Firebase Auth. O token de acesso deve ser enviado no header `Authorization: Bearer {token}` em todas as requisições ao endpoint protegido.

### RN-08 — Dados obrigatórios na emissão
Os seguintes campos são obrigatórios para emitir um certificado:

- Nome completo do aluno
- Nome do curso ou capacitação
- Nome da empresa / instituição emissora
- Data de emissão

O campo `expiresAt` é opcional.

### RN-09 — Imutabilidade dos dados emitidos
Após a emissão, os dados do certificado não podem ser editados. Para corrigir um erro, o admin deve revogar o certificado incorreto e emitir um novo.

### RN-10 — Log de acessos (futuro)
Em versões futuras, cada acesso à página de validação deverá ser registrado (IP, data/hora, user-agent) para fins de auditoria.

---

## 5. Funcionalidades

### 5.1 Painel Administrativo (acesso restrito)

| # | Funcionalidade | Descrição |
|---|---|---|
| F-01 | Login | Autenticação via Firebase Auth (e-mail e senha) |
| F-02 | Emissão de certificado | Formulário com os dados do aluno e curso |
| F-03 | Download do QR Code | Após emissão, download do PNG do QR Code |
| F-04 | Listagem de certificados | Visualizar todos os certificados emitidos |
| F-05 | Revogação de certificado | Desativar um certificado sem excluí-lo |

### 5.2 Página Pública de Validação (acesso aberto)

| # | Funcionalidade | Descrição |
|---|---|---|
| F-06 | Validação por UUID | Exibir dados do certificado ou mensagem de erro |
| F-07 | Exibição de estado | Indicar visualmente se o certificado é válido, revogado ou expirado |

---

## 6. Fora do Escopo (v1)

Os itens abaixo **não serão implementados** na versão 1 do sistema:

- **Geração automática do certificado** — o template é externo (Word, Canva, Figma etc.). A geração automática com layout de frente e verso está planejada para a [v2](#16-roadmap--v2-geração-automática-de-certificados)
- Múltiplas empresas / suporte multi-tenant
- Portal do aluno com histórico de certificados
- Envio de e-mail automático com o certificado após emissão
- Edição de certificados já emitidos
- Relatórios e dashboards analytics
- Integração com plataformas de cursos (Moodle, Hotmart etc.)
- Log de acessos à página de validação
- Aplicativo mobile nativo

---

## 7. Stack Tecnológica

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18+ | Biblioteca de UI |
| Vite | 5+ | Build tool e dev server |
| TypeScript | 5+ | Tipagem estática |
| React Router | 6+ | Roteamento (SPA) |
| Firebase SDK (client) | 10+ | Firebase Auth no frontend |
| Axios | — | Requisições HTTP para a API |
| TailwindCSS | 3+ | Estilização |

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Node.js | 20+ | Runtime JavaScript |
| Express | 4+ | Framework HTTP |
| TypeScript | 5+ | Tipagem estática |
| Firebase Admin SDK | 12+ | Acesso ao Firestore + verificação de tokens |
| firebase-functions | 4+ | Wrapper para deploy no Firebase Functions |
| qrcode | 1.5+ | Geração do QR Code em PNG (buffer) |
| uuid | 9+ | Geração de UUID v4 |
| cors | — | Configuração de CORS |
| dotenv | — | Variáveis de ambiente em desenvolvimento |

### Infraestrutura

| Serviço | Finalidade |
|---|---|
| Firebase Hosting | Deploy e CDN do frontend |
| Firebase Functions | Execução serverless do backend Express |
| Firestore | Banco de dados NoSQL — coleção de certificados |
| Firebase Auth | Autenticação do painel admin |

---

## 8. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Firebase Hosting                      │
│              Frontend — React + Vite + TS               │
│                                                         │
│   ┌──────────────────┐     ┌────────────────────────┐  │
│   │   Painel Admin   │     │   Página Pública       │  │
│   │  (autenticado)   │     │   /validar/:uuid       │  │
│   └────────┬─────────┘     └───────────┬────────────┘  │
└────────────┼───────────────────────────┼────────────────┘
             │                           │
             ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Firebase Functions                      │
│              Backend — Express + Node.js                │
│                                                         │
│  POST /api/certificates   GET /api/certificates/:uuid  │
│  (Firebase token)         (público — sem auth)          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  auth.middleware.ts                               │  │
│  │  admin.auth().verifyIdToken(token)                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  qrcode.service.ts                                │  │
│  │  qrcode.toBuffer(url) → base64 PNG               │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       Firestore                          │
│              Coleção: certificates                       │
│         Documento ID: UUID v4 (gerado pelo backend)     │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de autenticação

```
Admin → Firebase Auth (login) → recebe idToken
Admin → POST /api/certificates
        Header: Authorization: Bearer {idToken}
Backend → admin.auth().verifyIdToken(idToken) → autorizado
```

---

## 9. Modelo de Dados

### Coleção: `certificates`

O ID de cada documento é o próprio UUID do certificado.

```ts
interface Certificate {
  uuid: string;           // ID do documento — UUID v4
  studentName: string;    // Nome completo do aluno
  courseName: string;     // Nome do curso ou capacitação
  issuedBy: string;       // Nome da empresa / instituição emissora
  issuedAt: Timestamp;    // Data de emissão
  expiresAt: Timestamp | null;  // Data de validade — null se não expira
  isActive: boolean;      // false = revogado
  templateId: string | null;    // Reservado para v2 — ID do template de layout
}
```

### Exemplo de documento

```json
{
  "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "studentName": "Maria Silva",
  "courseName": "Primeiros Socorros",
  "issuedBy": "Instituto Saúde em Foco",
  "issuedAt": "2026-04-01T10:00:00Z",
  "expiresAt": "2027-04-01T00:00:00Z",
  "isActive": true,
  "templateId": null
}
```

---

## 10. API — Endpoints

### Base URL (produção)
```
https://us-central1-{PROJETO}.cloudfunctions.net/api
```

---

### `POST /api/certificates` — Emitir certificado
> **Autenticação:** obrigatória — `Authorization: Bearer {idToken}`

**Request body:**
```json
{
  "studentName": "Maria Silva",
  "courseName": "Primeiros Socorros",
  "issuedBy": "Instituto Saúde em Foco",
  "issuedAt": "2026-04-01",
  "expiresAt": "2027-04-01"
}
```

**Response `201 Created`:**
```json
{
  "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "validationUrl": "https://seudominio.com/validar/f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```

**Erros possíveis:**

| Código | Motivo |
|---|---|
| `400` | Campos obrigatórios ausentes ou inválidos |
| `401` | Token ausente ou inválido |
| `500` | Erro interno ao salvar no Firestore |

---

### `GET /api/certificates/:uuid` — Validar certificado
> **Autenticação:** nenhuma — endpoint público

**Response `200 OK` — certificado válido:**
```json
{
  "status": "valid",
  "studentName": "Maria Silva",
  "courseName": "Primeiros Socorros",
  "issuedBy": "Instituto Saúde em Foco",
  "issuedAt": "2026-04-01T10:00:00Z",
  "expiresAt": "2027-04-01T00:00:00Z"
}
```

**Response `200 OK` — certificado revogado:**
```json
{
  "status": "revoked",
  "message": "Este certificado foi cancelado pela instituição emissora."
}
```

**Response `200 OK` — certificado expirado:**
```json
{
  "status": "expired",
  "studentName": "Maria Silva",
  "courseName": "Primeiros Socorros",
  "issuedBy": "Instituto Saúde em Foco",
  "issuedAt": "2026-04-01T10:00:00Z",
  "expiresAt": "2025-04-01T00:00:00Z"
}
```

**Response `404 Not Found`:**
```json
{
  "status": "not_found",
  "message": "Certificado não encontrado ou inválido."
}
```

---

### `PATCH /api/certificates/:uuid/revoke` — Revogar certificado
> **Autenticação:** obrigatória — `Authorization: Bearer {idToken}`

**Response `200 OK`:**
```json
{
  "message": "Certificado revogado com sucesso."
}
```

---

## 11. Autenticação e Autorização

```
┌──────────────────────────────────────────────────────┐
│                  Rotas protegidas                     │
│  POST /api/certificates                               │
│  PATCH /api/certificates/:uuid/revoke                 │
│                                                       │
│  Middleware: verifyFirebaseToken                      │
│  → extrai Bearer token do header Authorization       │
│  → chama admin.auth().verifyIdToken(token)            │
│  → em caso de erro: responde 401 Unauthorized        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                   Rota pública                        │
│  GET /api/certificates/:uuid                          │
│  → sem middleware de auth                             │
│  → qualquer pessoa pode acessar                      │
└──────────────────────────────────────────────────────┘
```

O usuário admin é criado manualmente no console do Firebase (Authentication → Add user). Não há rota de registro público.

---

## 12. Fluxos Principais

### Fluxo 1 — Emissão de certificado

```
1. Admin acessa o painel em /admin
2. Firebase Auth exige login (e-mail + senha)
3. Admin preenche o formulário de emissão
4. Frontend envia POST /api/certificates com o idToken no header
5. Backend verifica o token com Firebase Admin SDK
6. Backend gera UUID v4 e monta a URL de validação
7. Backend gera o QR Code como PNG em buffer → converte para base64
8. Backend salva o documento no Firestore
9. Backend retorna { uuid, validationUrl, qrCodeBase64 }
10. Frontend exibe o QR Code e disponibiliza o botão de download (PNG)
11. Admin baixa o PNG e insere no template do certificado
```

### Fluxo 2 — Validação por QR Code

```
1. Aluno escaneia o QR Code com a câmera do celular
2. Navegador abre https://seudominio.com/validar/{uuid}
3. Frontend (React Router) renderiza a página de validação
4. Frontend envia GET /api/certificates/{uuid}
5. Backend busca o documento no Firestore pelo UUID
6. Se não encontrado → retorna status "not_found"
7. Se isActive = false → retorna status "revoked"
8. Se expiresAt < hoje → retorna status "expired"
9. Caso contrário → retorna status "valid" com os dados
10. Frontend exibe o resultado com visual adequado a cada estado
```

### Fluxo 3 — Revogação de certificado

```
1. Admin localiza o certificado na listagem
2. Admin clica em "Revogar"
3. Frontend envia PATCH /api/certificates/{uuid}/revoke com idToken
4. Backend atualiza isActive = false no Firestore
5. A partir desse momento, qualquer validação retorna "revogado"
```

---

## 13. Estrutura de Pastas

```
cert-validator/
│
├── firebase.json                  # Orquestra Hosting + Functions
├── .firebaserc                    # Projeto Firebase vinculado
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── App.tsx            # Rotas principais
│       │   └── firebase.ts        # Inicialização do Firebase SDK client
│       ├── features/
│       │   ├── admin/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── IssueCertificateForm.tsx
│       │   │   └── CertificateList.tsx
│       │   ├── validation/
│       │   │   └── ValidationPage.tsx
│       │   └── templates/         # Reservado para v2 — editor de layout
│       │       └── .gitkeep
│       └── shared/
│           ├── components/
│           │   └── PrivateRoute.tsx
│           ├── hooks/
│           │   └── useAuth.ts
│           └── api/
│               ├── certificates.api.ts
│               └── templates.api.ts  # Reservado para v2
│
└── backend/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── app.ts                 # Express app + Firebase Admin SDK init
        ├── index.ts               # Entry point para Firebase Functions
        ├── routes/
        │   ├── certificates.routes.ts
        │   └── templates.routes.ts    # Reservado para v2
        ├── controllers/
        │   ├── certificates.controller.ts
        │   └── templates.controller.ts  # Reservado para v2
        ├── middlewares/
        │   └── auth.middleware.ts # verifyFirebaseToken
        └── services/
            ├── qrcode.service.ts  # Geração do QR Code PNG
            └── certificate-generator/  # Reservado para v2
                └── .gitkeep
```

---

## 14. Infraestrutura e Deploy

### Firebase Project Setup

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar projeto
firebase init
# → Selecionar: Hosting + Functions + Firestore
```

### firebase.json

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "functions": {
    "source": "backend",
    "runtime": "nodejs20"
  }
}
```

### Variáveis de ambiente (backend)

Configuradas via Firebase Functions config ou Secret Manager:

```bash
firebase functions:secrets:set FIREBASE_PROJECT_ID
firebase functions:secrets:set VALIDATION_BASE_URL
```

### Deploy

```bash
# Build do frontend
cd frontend && npm run build

# Deploy completo
firebase deploy

# Deploy separado
firebase deploy --only hosting
firebase deploy --only functions
```

### Regras do Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /certificates/{uuid} {
      // Leitura pública — qualquer um pode validar
      allow read: if true;
      // Escrita apenas pelo backend via Admin SDK (bypass automático)
      allow write: if false;
    }
  }
}
```

> O Admin SDK utilizado no backend bypassa as regras do Firestore por padrão. As regras acima protegem contra acesso direto ao Firestore pelo client SDK.

---

## 15. Ordem de Implementação

| Fase | Tarefa | Entregável |
|---|---|---|
| **1** | Configurar projeto Firebase (Hosting + Functions + Firestore + Auth) | Projeto Firebase funcional |
| **2** | Estrutura base do backend (Express dentro de Functions, TypeScript, CORS) | Servidor respondendo em local |
| **3** | Middleware de autenticação Firebase | `verifyFirebaseToken` funcionando |
| **4** | Endpoint `POST /api/certificates` + integração Firestore + geração QR | Certificado emitido com QR |
| **5** | Endpoint `GET /api/certificates/:uuid` + lógica de estados | Validação funcionando |
| **6** | Endpoint `PATCH /api/certificates/:uuid/revoke` | Revogação funcionando |
| **7** | Frontend — setup React + Vite + TailwindCSS + Firebase SDK client | Projeto frontend base |
| **8** | Frontend — tela de login Firebase Auth | Login funcional |
| **9** | Frontend — painel admin (formulário de emissão + download do QR) | Admin consegue emitir |
| **10** | Frontend — listagem e revogação de certificados | Gestão completa |
| **11** | Frontend — página pública `/validar/:uuid` | Validação pelo aluno |
| **12** | Deploy (firebase deploy) + teste com QR físico | Sistema em produção |

---

## 16. Roadmap — v2: Geração Automática de Certificados

> **Status:** Planejado — não implementado na v1  
> **Abordagem escolhida:** Composição de imagem com campos posicionáveis (Opção C)

### Visão geral da feature

Na v2, a empresa poderá fazer upload do layout visual do certificado (frente e verso) diretamente no sistema. O admin define visualmente onde cada campo de dados deve aparecer sobre a imagem. Na hora de emitir, o backend compõe automaticamente a imagem final com os dados do aluno renderizados nas posições configuradas, exportando o certificado completo em PDF ou PNG — sem necessidade de template externo.

---

### Por que a Opção C (composição de imagem com campos posicionáveis)?

Foram avaliadas três abordagens:

| Abordagem | Descrição | Problema |
|---|---|---|
| **A — sharp + canvas** | Posicionamento fixo hardcoded no código | Admin não consegue ajustar sem alterar código |
| **B — HTML/CSS → Puppeteer** | Renderiza HTML como PDF | Puppeteer é pesado para Firebase Functions (memória, cold start) |
| **C — Upload de imagem + campos posicionáveis** ✅ | Admin define zonas de texto visualmente sobre a imagem | Leve, flexível, roda bem em Functions |

---

### Fluxo da feature (v2)

```
1. Admin acessa "Gerenciar Templates" no painel
2. Admin faz upload da imagem de frente do certificado (PNG/JPG)
3. Admin faz upload da imagem de verso do certificado (PNG/JPG) — opcional
4. Admin define as zonas de texto sobre a imagem via editor visual:
   → Arrasta e posiciona cada campo (nome, curso, data etc.)
   → Configura fonte, tamanho e cor de cada campo
   → Salva as coordenadas (x, y, fontSize, color, fontFamily) por campo
5. Sistema salva o template na coleção `templates` do Firestore
6. As imagens são armazenadas no Firebase Storage
7. Ao emitir um certificado, o admin seleciona o template desejado
8. O backend compõe a imagem: carrega o layout + renderiza os dados nas coordenadas
9. Exporta o certificado final como PDF (frente + verso) ou PNG
10. Admin baixa o PDF completo e pronto para impressão ou envio
```

---

### Modelo de dados — v2

#### Coleção: `templates`

```ts
interface CertificateTemplate {
  id: string;                  // UUID do template
  name: string;                // Nome do template (ex: "Certificado Padrão 2026")
  frontImageUrl: string;       // URL da imagem de frente no Firebase Storage
  backImageUrl: string | null; // URL da imagem de verso — null se não tiver verso
  fields: TemplateField[];     // Campos posicionados sobre a imagem
  createdAt: Timestamp;
  isActive: boolean;
}

interface TemplateField {
  key: string;        // Identificador do campo: "studentName" | "courseName" | "issuedAt" | "issuedBy" | "expiresAt"
  label: string;      // Nome exibido no editor: "Nome do Aluno"
  x: number;          // Posição horizontal em pixels (relativo à imagem original)
  y: number;          // Posição vertical em pixels (relativo à imagem original)
  fontSize: number;   // Tamanho da fonte em pontos
  fontFamily: string; // Família tipográfica: "Arial" | "Times New Roman" etc.
  color: string;      // Cor em hex: "#1A1A1A"
  align: "left" | "center" | "right";
  maxWidth: number;   // Largura máxima do campo em pixels — para quebra de linha
}
```

#### Atualização na coleção `certificates`

O campo `templateId` (já reservado na v1) passa a referenciar o template utilizado:

```ts
interface Certificate {
  // ... campos existentes da v1 ...
  templateId: string | null;  // null = template externo (v1) | string = template do sistema (v2)
  generatedFileUrl: string | null;  // URL do PDF/PNG gerado — null na v1
}
```

---

### Novos endpoints — v2

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/templates` | Firebase Token | Cria um novo template de layout |
| `GET` | `/api/templates` | Firebase Token | Lista todos os templates da empresa |
| `GET` | `/api/templates/:id` | Firebase Token | Retorna um template específico |
| `DELETE` | `/api/templates/:id` | Firebase Token | Remove um template |
| `POST` | `/api/certificates/:uuid/generate` | Firebase Token | Gera o PDF/PNG do certificado usando o template vinculado |

---

### Novas dependências — v2 (backend)

| Pacote | Finalidade |
|---|---|
| `@napi-rs/canvas` | Renderização de texto sobre imagem com suporte a fontes customizadas |
| `sharp` | Processamento e composição de imagens (redimensionar, converter, sobrepor) |
| `pdfkit` | Geração do PDF final com frente e verso |
| `firebase-admin/storage` | Upload e leitura das imagens de layout no Firebase Storage |

---

### Novas dependências — v2 (frontend)

| Pacote | Finalidade |
|---|---|
| `react-konva` ou `fabric.js` | Editor visual de posicionamento dos campos sobre a imagem |
| `react-dropzone` | Upload de imagens de frente e verso |

---

### Infraestrutura adicional — v2

- **Firebase Storage** — armazenamento das imagens de layout dos templates e dos certificados gerados
- **Regras do Storage:**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /templates/{allPaths=**} {
      allow read: if true;           // layouts são públicos (necessário para composição)
      allow write: if false;         // escrita apenas via Admin SDK
    }
    match /certificates/{allPaths=**} {
      allow read: if request.auth != null;  // somente admin faz download
      allow write: if false;
    }
  }
}
```

---

### O que já está reservado na v1 para suportar a v2

| Item | Onde | Descrição |
|---|---|---|
| Campo `templateId` | Coleção `certificates` | Inicia como `null` — receberá o ID do template na v2 |
| Campo `generatedFileUrl` | Coleção `certificates` | Inicia como `null` — receberá a URL do PDF gerado |
| Pasta `backend/src/services/certificate-generator/` | Repositório | Criada vazia — receberá a lógica de composição |
| Pasta `backend/src/routes/templates.routes.ts` | Repositório | Criada vazia — receberá os endpoints de templates |
| Pasta `frontend/src/features/templates/` | Repositório | Criada vazia — receberá o editor visual |
| Arquivo `frontend/src/api/templates.api.ts` | Repositório | Criado vazio — receberá as chamadas de API |

---

### Diagrama do fluxo v2

```
Admin faz upload do layout (frente + verso)
          │
          ▼
  Editor visual no painel
  Admin posiciona campos sobre a imagem
  (x, y, fontSize, color, align)
          │
          ▼
  POST /api/templates
  Firestore: coleção templates
  Storage: imagens de layout
          │
          ▼
  Admin emite certificado selecionando o template
  POST /api/certificates (com templateId)
          │
          ▼
  POST /api/certificates/:uuid/generate
          │
    Backend:
    1. Busca o template no Firestore
    2. Baixa a imagem de fundo do Storage
    3. Renderiza os campos com @napi-rs/canvas
    4. Compõe frente + verso com sharp
    5. Exporta PDF com pdfkit
    6. Salva PDF no Storage
    7. Retorna URL de download
          │
          ▼
  Admin baixa o PDF completo
  Pronto para impressão ou envio digital
```

---

## 17. Glossário

| Termo | Definição |
|---|---|
| **UUID** | Identificador único universal (v4) gerado aleatoriamente — usado como ID do certificado |
| **QR Code** | Código de barras 2D que armazena a URL de validação do certificado |
| **Admin SDK** | Biblioteca Firebase para uso em servidores — possui acesso privilegiado ao Firestore e Auth |
| **idToken** | Token JWT emitido pelo Firebase Auth após o login do admin |
| **isActive** | Flag que indica se o certificado está ativo (`true`) ou revogado (`false`) |
| **expiresAt** | Data de expiração do certificado — `null` significa sem prazo de validade |
| **templateId** | Referência ao template de layout — `null` na v1, preenchido na v2 |
| **Firestore** | Banco de dados NoSQL do Firebase orientado a documentos |
| **Firebase Functions** | Serviço serverless do Firebase para executar código Node.js na nuvem |
| **Firebase Hosting** | CDN do Firebase para servir aplicações web estáticas |
| **Firebase Storage** | Armazenamento de arquivos do Firebase — usado na v2 para imagens de layout e PDFs gerados |
| **Cold start** | Delay na primeira execução de uma Function após período de inatividade |
| **Template externo** | Arquivo de design do certificado criado fora do sistema (Word, Canva, Figma) — abordagem da v1 |
| **Template posicionável** | Layout de certificado cadastrado no próprio sistema com campos de texto configuráveis — abordagem da v2 |
| **TemplateField** | Objeto que define a posição, fonte e cor de um campo de dados sobre a imagem de layout |
| **@napi-rs/canvas** | Biblioteca Node.js para renderização de texto e imagens em canvas — usada na composição do certificado na v2 |
| **sharp** | Biblioteca Node.js para processamento de imagens de alta performance |
| **pdfkit** | Biblioteca Node.js para geração de arquivos PDF |

---

*Documento gerado para o projeto Cert Validator — v1.1*
