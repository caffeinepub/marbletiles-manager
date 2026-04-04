import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote,
  CreditCard,
  Loader2,
  Plus,
  Search,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Customer, Payment, Sale } from "../backend";
import { PaymentMode } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";

const modeLabel = (m: string) => {
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    bank: "Bank",
  };
  return map[m] ?? m;
};

const modeBadge = (m: string) => {
  const classes: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    upi: "bg-blue-100 text-blue-700",
    cheque: "bg-purple-100 text-purple-700",
    bank: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-bold ${classes[m] ?? "bg-gray-100 text-gray-700"}`}
    >
      {modeLabel(m)}
    </span>
  );
};

export default function PaymentsPage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Add payment modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selCustomerId, setSelCustomerId] = useState("");
  const [selSaleId, setSelSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>(PaymentMode.cash);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!actor || isFetching) return;
    // refreshKey is used to trigger re-fetch after mutations
    void refreshKey;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllCustomers(),
      actor.getAllPayments(),
    ])
      .then(([s, c, p]) => {
        setSales(s);
        setCustomers(c);
        setPayments(p);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  // Pending sales for selected customer
  const pendingSales = selCustomerId
    ? sales.filter(
        (s) =>
          String(s.customerId) === selCustomerId && s.paymentStatus !== "paid",
      )
    : [];

  // Compute due for a sale
  const getDue = (saleId: bigint) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return 0n;
    const collected = payments
      .filter((p) => p.saleId === saleId)
      .reduce((acc, p) => acc + p.amount, 0n);
    return sale.grandTotal - collected;
  };

  const openModal = () => {
    const firstCustomer = customers[0];
    const firstId = firstCustomer ? String(firstCustomer.id) : "";
    setSelCustomerId(firstId);
    const pending = firstId
      ? sales.filter(
          (s) => String(s.customerId) === firstId && s.paymentStatus !== "paid",
        )
      : [];
    const firstSale = pending[0];
    setSelSaleId(firstSale ? String(firstSale.id) : "");
    if (firstSale) {
      const due = getDue(firstSale.id);
      setAmount(String(Number(due) / 100));
    } else {
      setAmount("");
    }
    setMode(PaymentMode.cash);
    setNotes("");
    setOpen(true);
  };

  const handleCustomerChange = (custId: string) => {
    setSelCustomerId(custId);
    const pending = sales.filter(
      (s) => String(s.customerId) === custId && s.paymentStatus !== "paid",
    );
    const firstSale = pending[0];
    setSelSaleId(firstSale ? String(firstSale.id) : "");
    if (firstSale) {
      const due = getDue(firstSale.id);
      setAmount(String(Number(due) / 100));
    } else {
      setAmount("");
    }
  };

  const handleSaleChange = (sId: string) => {
    setSelSaleId(sId);
    if (sId) {
      const due = getDue(BigInt(sId));
      setAmount(String(Number(due) / 100));
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async () => {
    if (!actor) return;
    if (!selSaleId) {
      toast.error("Select an invoice");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const payment: Payment = {
        id: 0n,
        saleId: BigInt(selSaleId),
        amount: rupeesToPaise(amount),
        mode: mode as any,
        date: BigInt(Date.now()) * 1_000_000n,
        notes,
      };
      await actor.addPayment(payment);
      toast.success("Payment recorded successfully!");
      setOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(
        `Failed to record payment: ${err?.message ?? "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const saleMap = new Map(sales.map((s) => [s.id, s]));

  const filteredPayments = payments
    .filter((p) => {
      const sale = saleMap.get(p.saleId);
      const cust = sale ? customerMap.get(sale.customerId) : undefined;
      const matchSearch =
        !search ||
        (sale?.invoiceNumber ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (cust?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchMode = modeFilter === "all" || p.mode === modeFilter;
      return matchSearch && matchMode;
    })
    .sort((a, b) => (b.date > a.date ? 1 : -1));

  // Summary cards
  const totalCash = payments
    .filter((p) => p.mode === "cash")
    .reduce((s, p) => s + p.amount, 0n);
  const totalUpi = payments
    .filter((p) => p.mode === "upi")
    .reduce((s, p) => s + p.amount, 0n);
  const totalCheque = payments
    .filter((p) => p.mode === "cheque")
    .reduce((s, p) => s + p.amount, 0n);
  const totalBank = payments
    .filter((p) => p.mode === "bank")
    .reduce((s, p) => s + p.amount, 0n);

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="payments.loading_state">
        {["p1", "p2", "p3"].map((k) => (
          <Skeleton key={k} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="payments.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        <Button
          className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
          onClick={openModal}
          data-ocid="payments.open_modal_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-green-500" />
              <span className="text-xs font-semibold text-green-700">Cash</span>
            </div>
            <p className="font-bold text-gray-900">{formatINR(totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">UPI</span>
            </div>
            <p className="font-bold text-gray-900">{formatINR(totalUpi)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-purple-700">
                Cheque
              </span>
            </div>
            <p className="font-bold text-gray-900">{formatINR(totalCheque)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700">
                Bank
              </span>
            </div>
            <p className="font-bold text-gray-900">{formatINR(totalBank)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search invoice or customer..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="payments.search_input"
          />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-32" data-ocid="payments.mode_select">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div
          className="text-center py-16 text-gray-400"
          data-ocid="payments.empty_state"
        >
          No payments recorded yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full" data-ocid="payments.table">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-center font-semibold">Mode</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, i) => {
                const sale = saleMap.get(p.saleId);
                const cust = sale
                  ? customerMap.get(sale.customerId)
                  : undefined;
                return (
                  <tr
                    key={String(p.id)}
                    className="border-t border-gray-100 hover:bg-gray-50"
                    data-ocid={`payments.row.${i + 1}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#B8924A] text-sm">
                        {sale?.invoiceNumber ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {cust?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {modeBadge(p.mode)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.notes || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-ocid="payments.dialog">
          <DialogHeader>
            <DialogTitle className="text-[#B8924A]">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer */}
            <div>
              <Label className="text-sm font-semibold">Customer *</Label>
              {customers.length === 0 ? (
                <p className="text-sm text-red-500 mt-1">
                  No customers available.
                </p>
              ) : (
                <Select
                  value={selCustomerId}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger data-ocid="payments.customer_select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Invoice / Sale */}
            <div>
              <Label className="text-sm font-semibold">Invoice *</Label>
              {pendingSales.length === 0 ? (
                <p className="text-sm text-amber-600 mt-1">
                  No pending invoices for this customer.
                </p>
              ) : (
                <Select value={selSaleId} onValueChange={handleSaleChange}>
                  <SelectTrigger data-ocid="payments.invoice_select">
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingSales.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.invoiceNumber} — Due: {formatINR(getDue(s.id))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="text-sm font-semibold">Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-ocid="payments.amount_input"
              />
            </div>

            {/* Mode */}
            <div>
              <Label className="text-sm font-semibold">Payment Mode *</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger data-ocid="payments.mode_input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMode.cash}>Cash</SelectItem>
                  <SelectItem value={PaymentMode.upi}>UPI</SelectItem>
                  <SelectItem value={PaymentMode.cheque}>Cheque</SelectItem>
                  <SelectItem value={PaymentMode.bank}>
                    Bank Transfer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-semibold">Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                data-ocid="payments.notes_textarea"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="payments.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
              onClick={handleSubmit}
              disabled={saving || !selSaleId || pendingSales.length === 0}
              data-ocid="payments.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
