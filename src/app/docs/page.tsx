import { Card } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
          Documentação pública
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          PDV SaaS – Visão de Negócio e Técnica
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Esta página descreve, em linguagem de negócio e em linguagem técnica, o funcionamento
          do sistema de PDV, seus módulos principais e as decisões de arquitetura adotadas.
        </p>
      </header>

      <Card
        title="Visão de Negócio"
        description="Descrição funcional do produto para lojistas, times de negócio e stakeholders."
      >
        <section className="space-y-4 text-sm leading-relaxed text-gray-700">
          <p>
            O sistema é um <strong>PDV SaaS para lojas físicas</strong>, multi-loja e
            multiusuário, com foco forte em <strong>fiado/contas a receber</strong>, controle de
            crédito por cliente e gestão simples de <strong>caixa</strong> e{" "}
            <strong>estoque</strong>.
          </p>

          <h2 className="text-base font-semibold text-gray-900">Módulos principais</h2>

          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Lojas e usuários</strong>: cadastro de lojas com status ativo/inativo e
              vínculo de usuários com papéis (<code>MASTER</code>, <code>OWNER</code>,{" "}
              <code>EMPLOYEE</code>). Controle de acesso por loja e por papel.
            </li>
            <li>
              <strong>Produtos e estoque</strong>: cadastro de produtos por loja (nome, preço,
              custo, código de barras, unidade, estoque, estoque mínimo), com suporte a{" "}
              <strong>produtos derivados</strong> (ex.: caixa = N unidades) e{" "}
              <strong>produtos com receita/ingredientes</strong>. O estoque é controlado por
              movimentações ({'"'}
              <code>SALE</code>
              {", "}
              <code>RESTOCK</code>, <code>ADJUSTMENT</code>, <code>CANCELLATION</code>
              {'"'}) registrando estoque anterior, novo e motivo.
            </li>
            <li>
              <strong>Clientes e crédito</strong>: cadastro de clientes com dados básicos e{" "}
              <strong>limite de crédito</strong> por cliente. O sistema controla saldo devedor e
              suporta bloqueio automático/manual para novas compras a prazo.
            </li>
            <li>
              <strong>Vendas (PDV)</strong>: tela de PDV focada em velocidade, com busca por
              nome/código de barras, carrinho de itens, desconto, múltiplas formas de pagamento
              (dinheiro, crédito, débito, PIX, fiado) e opção de venda a preço de custo. Para
              vendas fiado, cada cliente pode receber um título separado em Contas a Receber.
            </li>
            <li>
              <strong>Sessões de caixa</strong>: abertura e fechamento de caixa com valor
              inicial, controle de status (<code>OPEN</code>, <code>CLOSED</code>), valor
              esperado em caixa e <strong>sangrias</strong> (retiradas) com identificação de
              quem retirou. Caixas com mais de 24h abertas bloqueiam novas vendas até serem
              fechadas.
            </li>
            <li>
              <strong>Contas a receber (Fiado)</strong>: geração automática de títulos ao vender
              fiado, com valor total, valor pago, saldo e status (
              <code>OPEN</code>, <code>PARTIAL</code>, <code>PAID</code>,{" "}
              <code>CANCELLED</code>). Suporta pagamentos parciais, atualização automática de
              status e reavaliação de bloqueio de crédito do cliente.
            </li>
            <li>
              <strong>Relatórios e visão gerencial</strong>: histórico de vendas com filtros
              (período, cliente, produto, forma de pagamento, faixa de valor), somatórios por
              loja e globais, visão de estoque baixo, movimentações e fluxo de caixa esperado.
            </li>
          </ul>
        </section>
      </Card>

      <Card
        title="Visão Técnica"
        description="Arquitetura, camadas e padrões utilizados na implementação do sistema."
      >
        <section className="space-y-4 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-semibold text-gray-900">Stack principal</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Frontend / Backend</strong>: Next.js (App Router) em TypeScript.
            </li>
            <li>
              <strong>Banco de dados</strong>: PostgreSQL com Prisma (client gerado em{" "}
              <code>src/generated/prisma</code>).
            </li>
            <li>
              <strong>Autenticação</strong>: Supabase Auth integrado à tabela interna de usuários.
            </li>
            <li>
              <strong>UI</strong>: componentes reutilizáveis em <code>src/components/ui</code>{" "}
              (button, input, table, modal, card, etc.), estilização via Tailwind.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-gray-900">Camadas e organização</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Páginas e UI</strong> (<code>src/app/**</code>,{" "}
              <code>src/components/**</code>): telas de autenticação, dashboard, PDV, produtos,
              clientes, estoque, recebíveis e histórico de caixa. Consomem APIs internas e
              renderizam a experiência para o usuário final.
            </li>
            <li>
              <strong>API (controladores HTTP)</strong> (<code>src/app/api/**</code>): rotas
              responsáveis por extrair parâmetros, validar entradas, aplicar autorização via{" "}
              <code>authService</code>, chamar os serviços de domínio e traduzir erros em
              respostas JSON consistentes usando <code>handleApiError</code>.
            </li>
            <li>
              <strong>Regras de negócio (services)</strong> (<code>src/services/**</code>):{" "}
              implementam o domínio do PDV:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <code>sale.service.ts</code>: fluxo completo de venda, sessão de caixa,
                  estoque, pagamentos e criação de títulos fiado.
                </li>
                <li>
                  <code>receivable.service.ts</code>: limite de crédito, criação/atualização/
                  cancelamento de títulos e bloqueio/desbloqueio de cliente.
                </li>
                <li>
                  <code>product.service.ts</code>: produtos, derivados, receitas, ajustes e
                  movimentações de estoque.
                </li>
                <li>Demais serviços: caixa, clientes, lojas, dashboard e autenticação.</li>
              </ul>
            </li>
            <li>
              <strong>Acesso a dados (repositories)</strong> (<code>src/repositories/**</code>):
              encapsulam o uso do Prisma, expondo operações orientadas ao domínio (buscas por
              loja, agregações, paginação, somatórios) sem vazar detalhes de consultas SQL para
              as camadas superiores.
            </li>
            <li>
              <strong>Infra e utilitários</strong>: singleton do Prisma, integração Supabase,
              logger, helpers de formatação, armazenamento local do estado do PDV no navegador,
              middleware de autenticação e tipagem compartilhada em <code>src/types</code>.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-gray-900">Boas práticas e extensibilidade</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Clean Code / DRY</strong>: nomes claros, hierarquia de erros centralizada,
              validações coesas e reaproveitadas, e separação explícita entre UI, domínio e
              persistência.
            </li>
            <li>
              <strong>SOLID (estilo modular/funcional)</strong>: cada serviço é responsável por
              um agregado (venda, produto, cliente, caixa, recebíveis), com baixo acoplamento às
              demais camadas.
            </li>
            <li>
              <strong>Integrações externas</strong>: a concentração das regras de fiado e contas
              a receber em <code>receivable.service.ts</code> e <code>sale.service.ts</code>{" "}
              permite integrar provedores externos (por exemplo, Asaas) criando um módulo
              específico de integração e plugando-o em pontos bem definidos do fluxo, sem
              impactar o núcleo do domínio.
            </li>
          </ul>
        </section>
      </Card>

      <footer className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p>
          Esta documentação descreve o estado atual do sistema de PDV e serve como referência
          para desenvolvimento, integração e comunicação com stakeholders técnicos e de negócio.
        </p>
      </footer>
    </main>
  );
}

