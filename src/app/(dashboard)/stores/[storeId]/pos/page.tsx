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
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
}

interface Customer {
  id: string;
  name: string;
  blockedForCredit: boolean;
}

interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  openedAt: string;
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
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("0");
  const [saleLoading, setSaleLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, sessRes] = await Promise.all([
        fetch(`/api/products?storeId=${storeId}&pageSize=200`),
        fetch(`/api/customers?storeId=${storeId}&pageSize=200`),
        fetch(`/api/cash-sessions?storeId=${storeId}&action=current`),
      ]);
      const prodJson = await prodRes.json();
      const custJson = await custRes.json();
      const sessJson = await sessRes.json();
      setProducts(prodJson.data || []);
      setCustomers(custJson.data || []);
      setSession(sessJson.data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - paymentTotal;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
      }];
    });
  }

  function updateCartQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
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

    setPayments((prev) => [
      ...prev,
      { method: currentPaymentMethod as PaymentEntry["method"], amount },
    ]);
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
      setCloseSessionModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fechar caixa");
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
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* Left: Product search and grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">PDV</h1>
          <div className="flex items-center gap-2">
            <Badge variant="success">Caixa Aberto</Badge>
            <Button variant="danger" size="sm" onClick={() => setCloseSessionModal(true)}>
              Fechar Caixa
            </Button>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar produto por nome ou código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(product.price)}</p>
                <p className="text-xs text-gray-400">Estoque: {product.stock}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 flex flex-col border-l border-gray-200 pl-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart size={20} /> Carrinho
        </h2>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
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
            <p className="text-sm text-yellow-600 mt-2">
              Faltam: {formatCurrency(remaining)}
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
          disabled={cart.length === 0 || Math.abs(remaining) > 0.01}
          className="w-full"
          size="lg"
        >
          <DollarSign size={18} className="mr-2" />
          Finalizar Venda
        </Button>
      </div>

      {/* Close session modal */}
      <Modal isOpen={closeSessionModal} onClose={() => setCloseSessionModal(false)} title="Fechar Caixa">
        <div className="space-y-4">
          <Input
            label="Valor em Caixa (R$)"
            type="number"
            step="0.01"
            min="0"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
          />
          <Button onClick={handleCloseSession} variant="danger" className="w-full">
            Confirmar Fechamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
