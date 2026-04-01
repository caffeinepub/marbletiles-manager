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

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentional
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllCustomers(),
      actor.getAllPayments(),
    ])
      .then(([s, c, p]) => {
        setSales(s);
        setCustomers(c);
        setPayments(p.sort((a, b) => Number(b.date - a.date)));
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const getSale = (sId: bigint) => sales.find((s) => s.id === sId);
  const getCust = (sId: bigint) => {
    const sale = getSale(sId);
    if (!sale) return "—";
    return customers.find((c) => c.id === sale.customerId)?.name ?? "—";
  };

  const paidForSale = (sId: bigint) =>
    payments.filter((p) => p.saleId === sId).reduce((s, p) => s + p.amount, 0n);

  // Sales for selected customer that are not fully paid
  const customerSales = selCustomerId
    ? sales.filter((s) => {
        const custId = BigInt(selCustomerId);
        if (s.customerId !== custId) return false;
        const paid = paidForSale(s.id);
        return paid < s.grandTotal; // has due
      })
    : [];

  const selectedSale = selSaleId
    ? sales.find((s) => String(s.id) === selSaleId)
    : null;
  const selectedSaleDue = selectedSale
    ? selectedSale.grandTotal - paidForSale(selectedSale.id)
    : 0n;

  const filtered = payments.filter((p) => {
    const sale = getSale(p.saleId);
    const cust = sale ? customers.find((c) => c.id === sale.customerId) : null;
    const matchSearch =
      !search ||
      sale?.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      cust?.name.toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === "all" || p.mode === modeFilter;
    return matchSearch && matchMode;
  });

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0n);
  const byMode = (m: string) =>
    payments.filter((p) => p.mode === m).reduce((s, p) => s + p.amount, 0n);

  const resetForm = () => {
    setSelCustomerId("");
    setSelSaleId("");
    setAmount("");
    setMode(PaymentMode.cash);
    setNotes("");
  };

  const handleAddPayment = async () => {
    if (!actor) return;
    if (!selSaleId) {
      toast.error("Please select an invoice");
      return;
    }
    const amt = rupeesToPaise(amount || "0");
    if (amt <= 0n) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const payment = {
        id: 0n,
        saleId: BigInt(selSaleId),
        amount: amt,
        mode: mode as PaymentMode,
        date: 0n,
        notes,
      };
      await actor.addPayment(payment as Payment);

      // Update sale payment status
      const sale = sales.find((s) => String(s.id) === selSaleId);
      if (sale) {
        const totalPaid = paidForSale(sale.id) + amt;
        let newStatus = sale.paymentStatus;
        if (totalPaid >= sale.grandTotal)
          newStatus = "paid" as typeof sale.paymentStatus;
        else if (totalPaid > 0n)
          newStatus = "partial" as typeof sale.paymentStatus;
        await actor.updateSale(sale.id, { ...sale, paymentStatus: newStatus });
      }

      toast.success("Payment recorded!");
      setOpen(false);
      resetForm();
      reload();
    } catch (err) {
      console.error(err);
      toast.error(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground">
            All payment records and collections
          </p>
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={() => setOpen(true)}
          data-ocid="payments.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Collected",
            value: formatINR(totalCollected),
            icon: <Wallet className="w-4 h-4" />,
            color: "#B8924A",
          },
          {
            label: "Cash",
            value: formatINR(byMode(PaymentMode.cash)),
            icon: <Banknote className="w-4 h-4" />,
            color: "#10b981",
          },
          {
            label: "UPI",
            value: formatINR(byMode(PaymentMode.upi)),
            icon: <Smartphone className="w-4 h-4" />,
            color: "#3b82f6",
          },
          {
            label: "Cheque / Bank",
            value: formatINR(
              byMode(PaymentMode.cheque) + byMode(PaymentMode.bank),
            ),
            icon: <CreditCard className="w-4 h-4" />,
            color: "#8b5cf6",
          },
        ].map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static config list
          <Card key={i} className="bg-white shadow-card border-0 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.icon}
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: c.color }}>
                {c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="payments.search_input"
          />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-40 bg-white" data-ocid="payments.select">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value={PaymentMode.cash}>Cash</SelectItem>
            <SelectItem value={PaymentMode.upi}>UPI</SelectItem>
            <SelectItem value={PaymentMode.cheque}>Cheque</SelectItem>
            <SelectItem value={PaymentMode.bank}>Bank</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2" data-ocid="payments.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="payments.empty_state"
        >
          <p className="text-muted-foreground">No payment records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    DATE
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    INVOICE
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden sm:table-cell">
                    CUSTOMER
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    AMOUNT
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    METHOD
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">
                    NOTES
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={String(p.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`payments.item.${i + 1}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.date)}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#B8924A" }}
                    >
                      {getSale(p.saleId)?.invoiceNumber ??
                        `#${String(p.saleId)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {getCust(p.saleId)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {modeBadge(p.mode)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {p.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-md" data-ocid="payments.dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                CUSTOMER *
              </Label>
              <Select
                value={selCustomerId}
                onValueChange={(v) => {
                  setSelCustomerId(v);
                  setSelSaleId("");
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="— Select Customer —" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.name}
                      {c.phone ? ` — ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                INVOICE *
              </Label>
              <Select
                value={selSaleId}
                onValueChange={(v) => {
                  setSelSaleId(v);
                  // Auto-fill due amount
                  const sale = sales.find((s) => String(s.id) === v);
                  if (sale) {
                    const due = sale.grandTotal - paidForSale(sale.id);
                    setAmount((Number(due) / 100).toFixed(2));
                  }
                }}
                disabled={!selCustomerId}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue
                    placeholder={
                      !selCustomerId
                        ? "Select customer first"
                        : customerSales.length === 0
                          ? "No pending invoices"
                          : "— Select Invoice —"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customerSales.map((s) => {
                    const due = s.grandTotal - paidForSale(s.id);
                    return (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.invoiceNumber} — Due: {formatINR(due)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedSale && selectedSaleDue > 0n && (
                <p className="text-xs text-amber-600 mt-1">
                  Outstanding due: {formatINR(selectedSaleDue)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                AMOUNT (₹) *
              </Label>
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-ocid="payments.input"
              />
            </div>

            {/* Method */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                PAYMENT METHOD
              </Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMode.cash}>Cash</SelectItem>
                  <SelectItem value={PaymentMode.upi}>UPI</SelectItem>
                  <SelectItem value={PaymentMode.cheque}>Cheque</SelectItem>
                  <SelectItem value={PaymentMode.bank}>Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                NOTES
              </Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="Optional note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              data-ocid="payments.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleAddPayment}
              disabled={saving}
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
