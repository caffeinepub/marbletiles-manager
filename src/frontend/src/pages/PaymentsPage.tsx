import { Button } from "@/components/ui/button";
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
import { History, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type Customer,
  type Payment,
  PaymentMode,
  type Sale,
  SaleStatus,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";

const modeLabel = (m: string) => {
  if (m === PaymentMode.upi) return "UPI";
  if (m === PaymentMode.bank) return "Bank";
  if (m === PaymentMode.cheque) return "Cheque";
  return "Cash";
};

export default function PaymentsPage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [saleId, setSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>(PaymentMode.cash);
  const [note, setNote] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional reload trigger
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllCustomers(),
      actor.getAllPayments(),
    ])
      .then(([allSales, custs, allPayments]) => {
        setSales(allSales.sort((a, b) => Number(b.createdAt - a.createdAt)));
        setCustomers(custs);
        setPayments(allPayments.sort((a, b) => Number(b.date - a.date)));
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  // Sales with outstanding dues
  const outstandingSales = sales.filter(
    (s) =>
      s.paymentStatus === SaleStatus.unpaid ||
      s.paymentStatus === SaleStatus.partial,
  );

  const filteredSales = outstandingSales.filter((s) => {
    const cust = customers.find((c) => c.id === s.customerId);
    return !search || cust?.name.toLowerCase().includes(search.toLowerCase());
  });

  const custName = (id: bigint) =>
    customers.find((c) => c.id === id)?.name ?? `#${String(id)}`;

  // Calculate paid amount per sale from payments list
  const paidForSale = (saleId: bigint) =>
    payments
      .filter((p) => p.saleId === saleId)
      .reduce((s, p) => s + p.amount, 0n);

  const handlePay = async () => {
    if (!actor) return;
    if (!saleId) {
      toast.error("Select a sale");
      return;
    }
    if (!amount) {
      toast.error("Enter amount");
      return;
    }
    setSaving(true);
    try {
      const payment: Payment = {
        id: 0n,
        saleId: BigInt(saleId),
        amount: rupeesToPaise(amount),
        mode: mode as PaymentMode,
        notes: note,
        date: BigInt(Date.now()) * 1_000_000n,
      };
      await actor.addPayment(payment);
      toast.success("Payment recorded");
      setOpen(false);
      setSaleId("");
      setAmount("");
      setNote("");
      setMode(PaymentMode.cash);
      reload();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search by customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="payments.search_input"
          />
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={() => setOpen(true)}
          data-ocid="payments.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Record Payment
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Outstanding Dues
        </h2>
        {loading ? (
          <div data-ocid="payments.loading_state" className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <div
            className="bg-white rounded-xl p-8 text-center shadow-card"
            data-ocid="payments.empty_state"
          >
            <p className="text-muted-foreground">
              No outstanding payments. &#127881;
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Invoice
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Total
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Paid
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s, i) => {
                    const paid = paidForSale(s.id);
                    const due = s.grandTotal > paid ? s.grandTotal - paid : 0n;
                    return (
                      <tr
                        key={String(s.id)}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                        data-ocid={`payments.item.${i + 1}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {custName(s.customerId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatINR(s.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {formatINR(paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatINR(due)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Payment History
          </h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="text-muted-foreground">No payment history yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Sale Ref
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Customer
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                      Mode
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => {
                    const sale = sales.find((s) => s.id === p.saleId);
                    return (
                      <tr
                        key={String(p.id)}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                        data-ocid={`payments.row.${i + 1}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {sale?.invoiceNumber ?? `#${String(p.saleId)}`}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {sale ? custName(sale.customerId) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {formatINR(p.amount)}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {modeLabel(p.mode)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {formatDate(p.date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-ocid="payments.dialog">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sale</Label>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger className="mt-1" data-ocid="payments.select">
                  <SelectValue placeholder="Select sale" />
                </SelectTrigger>
                <SelectContent>
                  {outstandingSales.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      {s.invoiceNumber} &#8212; {custName(s.customerId)} &#8212;{" "}
                      {formatINR(s.grandTotal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (&#8377;)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-ocid="payments.input"
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMode.cash}>Cash</SelectItem>
                  <SelectItem value={PaymentMode.upi}>UPI</SelectItem>
                  <SelectItem value={PaymentMode.bank}>
                    Bank Transfer
                  </SelectItem>
                  <SelectItem value={PaymentMode.cheque}>Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Partial payment"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handlePay}
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
