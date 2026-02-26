/**
 * PDV (Point of Sale) page.
 * Handles cash session management and sale creation.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/utils";
import { savePdvSession, loadPdvSession, clearPdvSession } from "@/lib/pdv-storage";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  Tag,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  stock: number;
  /** Estoque efetivo (derivados/receitas); quando presente, usar no PDV no lugar de stock */
  effectiveStock?: number;
  barcode: string | null;
}

interface Customer {
  id: string;
  name: string;
  blockedForCredit: boolean;
}

interface CashWithdrawalItem {
  id: string;
  amount: number;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface StoreMember {
  id: string;
  user: { id: string; name: string | null; email: string };
}

interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  openedAt: string;
  expectedCash?: number;
  totalWithdrawals?: number;
  withdrawals?: CashWithdrawalItem[];
  currentUserName?: string;
  currentUserId?: string;
  /** true = caixa aberto há mais de 24h; não permite novas vendas até fechar */
  isExpiredForSales?: boolean;
  /** true = esta sessão já estava aberta (valor compartilhado com todos) */
  alreadyOpen?: boolean;
  /** apenas MASTER/OWNER podem fechar; funcionário não vê o botão */
  canCloseSession?: boolean;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface PaymentEntry {
  method: "CASH" | "CREDIT" | "DEBIT" | "PIX" | "FIADO";
  amount: number;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro", icon: <Banknote size={16} /> },
  { value: "CREDIT", label: "Crédito", icon: <CreditCard size={16} /> },
  { value: "DEBIT", label: "Débito", icon: <CreditCard size={16} /> },
  { value: "PIX", label: "PIX", icon: <QrCode size={16} /> },
  { value: "FIADO", label: "Fiado", icon: <Receipt size={16} /> },
];

export default function PosPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string>("CASH");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sellAtCost, setSellAtCost] = useState(false);

  // Modal states
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [sangriaModal, setSangriaModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("0");
  const [sangriaAmount, setSangriaAmount] = useState("");
  const [sangriaLoading, setSangriaLoading] = useState(false);
  const [selectedWithdrawalUserId, setSelectedWithdrawalUserId] = useState("");
  const [storeMembers, setStoreMembers] = useState<StoreMember[]>([]);
  const [saleLoading, setSaleLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionRestoredFromStorage, setSessionRestoredFromStorage] = useState(false);
  const [showSharedCaixaMessage, setShowSharedCaixaMessage] = useState(false);

  const fetchData = useCallback(async (isRetry = false) => {
    setLoading(true);
    try {
      const [prodRes, custRes, sessRes] = await Promise.all([
        fetch(`/api/products?storeId=${storeId}&pageSize=200&forPdv=1`),
        fetch(`/api/customers?storeId=${storeId}&pageSize=200`),
        fetch(`/api/cash-sessions?storeId=${storeId}&action=current`),
      ]);
      const prodJson = await prodRes.json();
      const custJson = await custRes.json();
      const sessJson = await sessRes.json();
      setProducts(prodJson.data || []);
      setCustomers(custJson.data || []);
      const apiSession = sessRes.ok ? (sessJson.data as CashSession | null) : null;
      setSession(apiSession);
      setSessionRestoredFromStorage(false);
      if (apiSession) {
        savePdvSession(storeId, {
          sessionId: apiSession.id,
          status: apiSession.status,
          openingAmount: apiSession.openingAmount,
          expectedCash: apiSession.expectedCash,
          openedAt: apiSession.openedAt,
          currentUserId: apiSession.currentUserId,
          currentUserName: apiSession.currentUserName,
          isExpiredForSales: apiSession.isExpiredForSales,
        });
      } else {
        clearPdvSession(storeId);
        if (!isRetry) {
          const stored = loadPdvSession(storeId);
          if (stored) {
            setSession({
              id: stored.sessionId,
              status: stored.status,
              openingAmount: stored.openingAmount,
              openedAt: stored.openedAt,
              expectedCash: stored.expectedCash,
              currentUserId: stored.currentUserId,
              currentUserName: stored.currentUserName,
              isExpiredForSales: stored.isExpiredForSales,
            });
            setSessionRestoredFromStorage(true);
            setTimeout(() => fetchData(true), 2000);
          }
        }
      }
    } catch {
      if (!isRetry) {
        const stored = loadPdvSession(storeId);
        if (stored) {
          setSession({
            id: stored.sessionId,
            status: stored.status,
            openingAmount: stored.openingAmount,
            openedAt: stored.openedAt,
            expectedCash: stored.expectedCash,
            currentUserId: stored.currentUserId,
            currentUserName: stored.currentUserName,
            isExpiredForSales: stored.isExpiredForSales,
          });
          setSessionRestoredFromStorage(true);
          setTimeout(() => fetchData(true), 2000);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Carrega membros da loja ao abrir o modal de sangria (para o select "Quem está retirando")
  useEffect(() => {
    if (!sangriaModal || !storeId) return;
    fetch(`/api/store-users?storeId=${storeId}`)
      .then((res) => res.json())
      .then((json) => setStoreMembers(json.data ?? []))
      .catch(() => setStoreMembers([]));
  }, [sangriaModal, storeId]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - paymentTotal;

  function getAvailableStock(product: Product) {
    return product.effectiveStock ?? product.stock;
  }

  function getUnitPrice(product: Product): number {
    return sellAtCost ? (product.cost ?? 0) : product.price;
  }

  function addToCart(product: Product) {
    const existingInCart = cart.find((item) => item.productId === product.id);
    const currentQty = existingInCart?.quantity ?? 0;
    const available = getAvailableStock(product);

    if (currentQty >= available) {
      setError(`Estoque insuficiente para ${product.name}. Disponível: ${available}`);
      return;
    }

    const unitPrice = getUnitPrice(product);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQty, price: unitPrice, total: newQty * unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: unitPrice,
          quantity: 1,
          total: unitPrice,
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, delta: number) {
    const product = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          const available = product ? getAvailableStock(product) : 0;
          if (product && newQty > available) {
            setError(`Estoque insuficiente para ${product.name}. Disponível: ${available}`);
            return item;
          }

          return { ...item, quantity: newQty, total: newQty * item.price };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function addPayment() {
    const amount = Number(currentPaymentAmount);
    if (amount <= 0) return;

    const method = currentPaymentMethod as PaymentEntry["method"];
    const remainingBefore = remaining;

    // For cash payments, allow customer to give more than the remaining amount
    if (method === "CASH" && remainingBefore > 0 && amount >= remainingBefore) {
      const usedAmount = remainingBefore;
      const troco = amount - remainingBefore;

      setPayments((prev) => [
        ...prev,
        { method, amount: usedAmount },
      ]);
      setChangeAmount(troco);
    } else {
      setPayments((prev) => [
        ...prev,
        { method, amount },
      ]);
      setChangeAmount(0);
    }

    setCurrentPaymentAmount("");
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleOpenSession() {
    try {
      const result = await apiRequest<CashSession>(`/api/cash-sessions?storeId=${storeId}`, {
        body: { openingAmount: Number(openingAmount) || 0 },
      });
      setSession(result);
      if (result.alreadyOpen) setShowSharedCaixaMessage(true);
      setOpenSessionModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir caixa");
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    try {
      await apiRequest(`/api/cash-sessions?storeId=${storeId}&sessionId=${session.id}`, {
        method: "PATCH",
        body: { closingAmount: Number(closingAmount) || 0 },
      });
      setSession(null);
      clearPdvSession(storeId);
      setCloseSessionModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fechar caixa");
    }
  }

  async function handleSangria() {
    if (!session || !sangriaAmount || Number(sangriaAmount) <= 0) return;
    const amount = Number(sangriaAmount);
    const available = session.expectedCash ?? session.openingAmount;
    if (amount > available + 0.01) {
      setError(`Valor maior que o disponível em caixa (${formatCurrency(available)})`);
      return;
    }
    setSangriaLoading(true);
    setError("");
    try {
      await apiRequest(`/api/cash-sessions/withdraw?storeId=${storeId}`, {
        method: "POST",
        body: {
          sessionId: session.id,
          amount,
          withdrawnUserId: selectedWithdrawalUserId || undefined,
        },
      });
      setSangriaAmount("");
      setSelectedWithdrawalUserId(session.currentUserId ?? "");
      setSangriaModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar sangria");
    } finally {
      setSangriaLoading(false);
    }
  }

  async function handleFinalizeSale() {
    if (!session || cart.length === 0) return;
    if (Math.abs(remaining) > 0.01) {
      setError("O total dos pagamentos deve ser igual ao total da venda");
      return;
    }

    setSaleLoading(true);
    setError("");

    try {
      await apiRequest(`/api/sales?storeId=${storeId}`, {
        body: {
          cashSessionId: session.id,
          customerId: selectedCustomer || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          payments,
          discount,
        },
      });

      // Reset cart
      setCart([]);
      setPayments([]);
      setDiscount(0);
      setSelectedCustomer("");
      setChangeAmount(0);
      setError("");

      // Refresh products (stock updated)
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar venda");
    } finally {
      setSaleLoading(false);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>;
  }

  // No open session
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShoppingCart size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Caixa Fechado</h2>
        <p className="text-gray-500 mb-6">Abra o caixa para iniciar as vendas.</p>
        <Button onClick={() => setOpenSessionModal(true)}>Abrir Caixa</Button>

        {/* Open session modal */}
        <Modal isOpen={openSessionModal} onClose={() => setOpenSessionModal(false)} title="Abrir Caixa">
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Input
              label="Valor Inicial (R$)"
              type="number"
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
            <Button onClick={handleOpenSession} className="w-full">Confirmar Abertura</Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_minmax(400px,440px)] md:gap-6 md:h-[calc(100vh-5rem)]">
      {sessionRestoredFromStorage && (
        <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Restaurado do último acesso. Reconectando ao servidor…
        </div>
      )}
      {showSharedCaixaMessage && (
        <div className="md:col-span-2 flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span>O caixa já estava aberto. O valor em caixa é compartilhado com todos os colaboradores.</span>
          <button type="button" onClick={() => setShowSharedCaixaMessage(false)} className="shrink-0 font-medium hover:underline">
            Fechar
          </button>
        </div>
      )}
      {/* Left: Product search and grid */}
      <div className="flex min-w-0 flex-col overflow-hidden">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">PDV</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
              <span className="font-medium">Em caixa:</span>{" "}
              {formatCurrency(session.expectedCash ?? session.openingAmount)}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSangriaModal(true);
                setSelectedWithdrawalUserId(session?.currentUserId ?? "");
              }}
            >
              <Banknote size={16} className="mr-1" />
              Sangria
            </Button>
            {session.isExpiredForSales ? (
              <Badge variant="danger">Caixa &gt; 24h – vendas bloqueadas</Badge>
            ) : (
              <Badge variant="success">Caixa Aberto</Badge>
            )}
            {session.canCloseSession && (
              <Button variant="danger" size="sm" onClick={() => setCloseSessionModal(true)}>
                Fechar Caixa
              </Button>
            )}
          </div>
        </div>

        {session.isExpiredForSales && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Este caixa está aberto há mais de 24h.</strong>
            {session.canCloseSession
              ? " Feche-o e abra um novo para continuar vendendo."
              : " Peça a um responsável (dono ou gerente) para fechar o caixa."}
          </div>
        )}

        {/* Search + Preço de custo */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Input
            placeholder="Buscar produto por nome ou código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0"
          />
          <Button
            type="button"
            variant={sellAtCost ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSellAtCost((v) => !v)}
            className="shrink-0"
            title={sellAtCost ? "Desativar venda a preço de custo" : "Vender a preço de custo"}
          >
            <Tag size={16} className="mr-1" />
            {sellAtCost ? "Preço de custo (ON)" : "Preço de custo"}
          </Button>
        </div>

        {/* Product list - one row per product */}
        <div className="max-h-[340px] overflow-y-auto rounded-lg border border-gray-200 bg-white md:max-h-none md:flex-1 md:min-h-0 md:border-0 md:bg-transparent">
          <div className="divide-y divide-gray-100">
            {filteredProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Nenhum produto encontrado</p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">Estoque: {getAvailableStock(product)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-blue-600">
                    {formatCurrency(getUnitPrice(product))}
                    {sellAtCost && (
                      <span className="ml-1 text-xs font-normal text-amber-600">(custo)</span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => addToCart(product)}
                    disabled={getAvailableStock(product) <= 0 || session.isExpiredForSales}
                    className="shrink-0"
                  >
                    <Plus size={16} className="mr-1" />
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart - mais espaço no desktop */}
      <div className="mt-2 flex min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-4 md:mt-0 md:min-h-0 md:border-l md:border-t-0 md:bg-transparent md:pl-6 md:pr-0 md:pt-0 md:pb-0">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <ShoppingCart size={20} /> Carrinho
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Cart items - altura mínima no desktop para ver vários itens e scroll visível */}
        <div className="pdv-cart-items-scroll mb-4 max-h-64 flex-1 space-y-2 overflow-y-auto md:min-h-[320px] md:max-h-[50vh] md:flex-none">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Carrinho vazio</p>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)} cada</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateCartQuantity(item.productId, -1)} className="p-1 rounded hover:bg-gray-100">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.productId, 1)} className="p-1 rounded hover:bg-gray-100">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded text-red-500 hover:bg-red-50 ml-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-900 ml-3 w-20 text-right">{formatCurrency(item.total)}</p>
              </div>
            ))
          )}
        </div>

        {/* Customer selection */}
        <div className="mb-3">
          <Select
            label="Cliente (opcional)"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Consumidor final"
          />
        </div>

        {/* Discount */}
        <div className="mb-3">
          <Input
            label="Desconto (R$)"
            type="number"
            step="0.01"
            min="0"
            value={String(discount)}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
          />
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-3 mb-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Desconto:</span>
              <span className="text-red-600">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payments */}
        <div className="border-t border-gray-200 pt-3 mb-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Pagamentos</p>

          {payments.map((payment, index) => (
            <div key={index} className="flex items-center justify-between text-sm mb-1">
              <span>{PAYMENT_METHODS.find((m) => m.value === payment.method)?.label}</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(payment.amount)}</span>
                <button onClick={() => removePayment(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <Select
              value={currentPaymentMethod}
              onChange={(e) => setCurrentPaymentMethod(e.target.value)}
              options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Valor"
              value={currentPaymentAmount}
              onChange={(e) => setCurrentPaymentAmount(e.target.value)}
              className="w-28"
            />
            <Button variant="secondary" size="sm" onClick={addPayment}>
              <Plus size={14} />
            </Button>
          </div>

          {remaining > 0.01 && (
            <p className="mt-2 text-sm text-yellow-600">
              Faltam: {formatCurrency(remaining)}
            </p>
          )}
          {remaining <= 0.01 && changeAmount > 0 && (
            <p className="mt-2 text-sm text-green-700">
              Troco: {formatCurrency(changeAmount)}
            </p>
          )}

          {/* Quick full payment */}
          {payments.length === 0 && total > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPayments([{ method: method.value as PaymentEntry["method"], amount: total }]);
                  }}
                  className="text-xs"
                >
                  {method.icon}
                  <span className="ml-1">{method.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Finalize */}
        <Button
          onClick={handleFinalizeSale}
          loading={saleLoading}
          disabled={cart.length === 0 || Math.abs(remaining) > 0.01 || session.isExpiredForSales}
          className="w-full mb-2 md:mb-0"
          size="lg"
        >
          <DollarSign size={18} className="mr-2" />
          Finalizar Venda
        </Button>
      </div>

      {/* Sangria modal */}
      <Modal
        isOpen={sangriaModal}
        onClose={() => {
          setSangriaModal(false);
          setSangriaAmount("");
          setSelectedWithdrawalUserId("");
          setError("");
        }}
        title="Sangria (retirada de caixa)"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p>
              <span className="font-medium">Total em caixa:</span>{" "}
              {formatCurrency(session.expectedCash ?? session.openingAmount)}
            </p>
          </div>
          <Select
            label="Quem está retirando"
            value={selectedWithdrawalUserId}
            onChange={(e) => setSelectedWithdrawalUserId(e.target.value)}
            options={storeMembers.map((m) => ({
              value: m.user.id,
              label: m.user.name || m.user.email || m.user.id,
            }))}
            placeholder="Selecione a pessoa"
          />
          <Input
            label="Valor a retirar (R$)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={sangriaAmount}
            onChange={(e) => setSangriaAmount(e.target.value)}
          />
          {session.withdrawals && session.withdrawals.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Sangrias desta sessão</p>
              <ul className="max-h-32 overflow-y-auto rounded border border-gray-200 divide-y divide-gray-100 text-sm">
                {session.withdrawals.map((w) => (
                  <li key={w.id} className="flex justify-between items-center px-3 py-2">
                    <span className="text-gray-600">{w.user.name || w.user.email}</span>
                    <span className="font-medium">{formatCurrency(w.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Button
            onClick={handleSangria}
            loading={sangriaLoading}
            disabled={
              !sangriaAmount ||
              Number(sangriaAmount) <= 0 ||
              !selectedWithdrawalUserId
            }
            className="w-full"
          >
            Confirmar sangria
          </Button>
        </div>
      </Modal>

      {/* Close session modal */}
      <Modal isOpen={closeSessionModal} onClose={() => setCloseSessionModal(false)} title="Fechar Caixa">
        <div className="space-y-4">
          {session && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Deveria haver em caixa:</span>{" "}
                {formatCurrency(session.expectedCash ?? session.openingAmount)}
              </p>
            </div>
          )}
          <Input
            label="Valor em Caixa (R$)"
            type="number"
            step="0.01"
            min="0"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
          />
          {session && Number(closingAmount) > 0 && Number(closingAmount) < (session.expectedCash ?? session.openingAmount) - 0.01 && (
            <p className="text-sm text-red-600">
              O valor informado é menor que o esperado. Não é possível fechar o caixa.
            </p>
          )}
          <Button
            onClick={handleCloseSession}
            variant="danger"
            className="w-full"
            disabled={
              !session ||
              Number(closingAmount || 0) < (session.expectedCash ?? session.openingAmount) - 0.01
            }
          >
            Confirmar Fechamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
