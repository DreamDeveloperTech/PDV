# PDV SaaS - Sistema Multi-tenant de Ponto de Venda

Sistema completo de PDV (Ponto de Venda) multi-tenant com controle de estoque e contas a receber (FIADO).

## Stack

- **Next.js 16** (App Router) - Framework React fullstack
- **Supabase** - PostgreSQL + Auth (Google OAuth)
- **Prisma 7** - ORM com adapter PostgreSQL
- **TypeScript** - Tipagem forte em todo o projeto
- **Tailwind CSS** - Estilização utilitária

## Arquitetura

Clean Architecture com separacao clara de camadas:

```
src/
├── app/              # UI - Pages e API Routes (App Router)
├── components/       # Componentes React reutilizaveis
├── hooks/            # React hooks customizados
├── services/         # Regras de negocio
├── repositories/     # Acesso ao banco de dados
├── schemas/          # Validacao Zod
├── types/            # Tipos TypeScript
├── lib/              # Utilitarios compartilhados
└── middleware.ts     # Protecao de rotas
```

## Funcionalidades

### Autenticacao e RBAC
- Login com Google via Supabase
- 3 niveis de acesso: MASTER, OWNER, EMPLOYEE
- MASTER definido por variavel de ambiente
- Middleware protegendo rotas por role

### Gestao de Lojas (Multi-tenant)
- Criacao e gestao de multiplas lojas
- Vinculo usuario-loja via StoreUsers
- Isolamento de dados por storeId

### Controle de Estoque
- Produtos com estoque, estoque minimo, custo e preco
- Movimentacoes: SALE, RESTOCK, ADJUSTMENT
- Baixa automatica ao vender
- Alertas de estoque baixo
- Historico completo de movimentacoes

### FIADO (Contas a Receber)
- Cadastro de clientes com limite de credito
- Contas a receber com status OPEN, PARTIAL, PAID
- Pagamento parcial
- Bloqueio automatico por limite de credito
- Extrato do cliente

### PDV (Ponto de Venda)
- Abertura e fechamento de caixa
- Multiplos metodos de pagamento (Dinheiro, Credito, Debito, PIX, Fiado)
- Multiplos pagamentos por venda
- Carrinho com busca de produtos
- Desconto por venda

### Dashboards
- **MASTER**: Metricas globais (lojas, receita, a receber)
- **OWNER**: Metricas por loja (receita, estoque baixo, inadimplentes)
- **EMPLOYEE**: Operacoes de caixa

## Setup Local

### Pre-requisitos
- Node.js 20+
- Conta no Supabase

### Instalacao

```bash
# Clonar o repositorio
git clone https://github.com/DreamDeveloperTech/PDV.git
cd PDV

# Instalar dependencias
npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais do Supabase

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate dev

# Iniciar servidor de desenvolvimento
npm run dev
```

### Variaveis de Ambiente

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | Connection string do PostgreSQL (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anonima do Supabase |
| `MASTER_EMAIL` | Email do usuario MASTER |

## Banco de Dados

### Modelos (Prisma)

- **User** - Usuarios do sistema
- **Store** - Lojas
- **StoreUser** - Vinculo usuario-loja com role
- **Product** - Produtos com estoque
- **StockMovement** - Historico de movimentacoes
- **Customer** - Clientes
- **AccountReceivable** - Contas a receber
- **ReceivablePayment** - Pagamentos de contas
- **CashSession** - Sessoes de caixa
- **Sale** - Vendas
- **SaleItem** - Itens da venda
- **SalePayment** - Pagamentos da venda

## Deploy na Vercel

1. Conecte o repositorio na Vercel
2. Configure as variaveis de ambiente
3. Deploy automatico a cada push

## Licenca

MIT
