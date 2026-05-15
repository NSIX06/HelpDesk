# HelpDesk — Central de Chamados

Sistema de gerenciamento de chamados inspirado no GLPI, construído com Next.js, Neon PostgreSQL e Tailwind CSS.

## Funcionalidades

- **Autenticação** com sessão JWT (8 horas)
- **Perfis**: Administrador, Técnico, Usuário
- **CRUD de Usuários** com controle de acesso
- **CRUD de Chamados** — criação, edição, encerramento (nunca deletado)
- **Chat nos chamados** com anexos (até 5MB por arquivo)
- **Notas internas** visíveis apenas para técnicos/admins
- **Departamentos** com ativação/desativação
- **Categorias e Subtipos** em estrutura hierárquica
- **Dashboard** com estatísticas em tempo real
- **Filtros avançados** por status, prioridade, tipo, etc.

## Tecnologias

- **Next.js 15** (App Router)
- **React 18**
- **Neon** (PostgreSQL serverless)
- **Tailwind CSS**
- **NextAuth.js v4**

## Setup

### 1. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:
```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="sua-chave-secreta-aleatoria-longa"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Inicializar o banco de dados

```bash
npm run db:setup
```

Isso criará todas as tabelas e um usuário administrador padrão:
- **Email:** admin@helpdesk.com
- **Senha:** admin123

### 3. Executar o projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## Status dos chamados

| Status | Descrição |
|--------|-----------|
| Novo | Chamado recém-aberto |
| Em Andamento | Sendo atendido pelo técnico |
| Pendente | Aguardando resposta do cliente |
| Resolvido | Solução aplicada |
| Fechado | Encerrado (nunca deletado do banco) |

## Prioridades

`Baixa` → `Média` → `Alta` → `Crítica`

## Tipos de chamado

- **Incidente** — Falha inesperada
- **Requisição** — Solicitação de serviço
- **Problema** — Causa raiz de múltiplos incidentes
- **Mudança** — Alteração planejada
