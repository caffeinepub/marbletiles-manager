import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Customer,
  type GSTRate,
  type Payment,
  PaymentMode,
  type Product,
  type Sale,
  type SaleItem,
  SaleStatus,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";

const statusBadge = (s: string) => {
  if (s === "paid")
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-700 tracking-wide">
        PAID
      </span>
    );
  if (s === "unpaid")
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-100 text-red-700 tracking-wide">
        UNPAID
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-100 text-amber-700 tracking-wide">
      PARTIAL
    </span>
  );
};

const modeLabel = (m: string) => {
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    bank: "Bank",
  };
  return map[m] ?? m;
};

interface FormItem {
  productId: string;
  quantity: string;
  unitPrice: string;
  gstRateName: string;
}

function generateInvoiceNumber(count: number): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = String(count + 1).padStart(4, "0");
  return `INV-${ym}-${seq}`;
}

export default function SalesPage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [transport, setTransport] = useState("");
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMode.cash);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    { productId: "", quantity: "1", unitPrice: "0", gstRateName: "" },
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is intentional
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllProducts(),
      actor.getAllCustomers(),
      actor.getAllPayments(),
      actor.getAllGSTRates(),
    ])
      .then(([allSales, prods, custs, allPayments, rates]) => {
        setSales(allSales.sort((a, b) => Number(b.createdAt - a.createdAt)));
        setProducts(prods);
        setCustomers(custs);
        setPayments(allPayments);
        setGstRates(rates.map(([, r]) => r));
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const filtered = sales.filter((s) => {
    const cust = customers.find((c) => c.id === s.customerId);
    const matchSearch =
      !search ||
      cust?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || s.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { productId: "", quantity: "1", unitPrice: "0", gstRateName: "" },
    ]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const setItemField = (idx: number, k: keyof FormItem, v: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (k === "productId") {
          const prod = products.find((p) => String(p.id) === v);
          return {
            ...item,
            productId: v,
            unitPrice: prod ? (Number(prod.basePrice) / 100).toFixed(2) : "0",
          };
        }
        return { ...item, [k]: v };
      }),
    );
  };

  const calcTotals = () => {
    let subtotal = 0n;
    let totalGST = 0n;
    const saleItems: SaleItem[] = items
      .filter((it) => it.productId)
      .map((it) => {
        const qty = BigInt(Math.max(1, Number.parseInt(it.quantity) || 1));
        const unitPrice = rupeesToPaise(it.unitPrice);
        const gstRate = gstRates.find((r) => r.name === it.gstRateName) ?? {
          name: "No GST",
          percentage: 0n,
        };
        const gstAmount = (unitPrice * qty * gstRate.percentage) / 100n;
        subtotal += unitPrice * qty;
        totalGST += gstAmount;
        return {
          productId: BigInt(it.productId),
          quantity: qty,
          unitPrice,
          gstRate,
          gstAmount,
        };
      });
    const transportCharge = rupeesToPaise(transport || "0");
    const discountAmt = rupeesToPaise(discount || "0");
    const grandTotal = subtotal + totalGST + transportCharge - discountAmt;
    return {
      subtotal,
      totalGST,
      transportCharge,
      discountAmt,
      grandTotal,
      saleItems,
    };
  };

  const resetForm = () => {
    setCustomerId("");
    setTransport("");
    setDiscount("");
    setAmountPaid("");
    setPaymentMethod(PaymentMode.cash);
    setNotes("");
    setItems([
      { productId: "", quantity: "1", unitPrice: "0", gstRateName: "" },
    ]);
  };

  const handleCreate = async () => {
    if (!actor) return;
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    if (items.every((it) => !it.productId)) {
      toast.error("Add at least one product");
      return;
    }
    setSaving(true);
    try {
      const {
        subtotal,
        totalGST,
        transportCharge,
        discountAmt,
        grandTotal,
        saleItems,
      } = calcTotals();
      const paidAmt = rupeesToPaise(amountPaid || "0");
      let status = SaleStatus.unpaid;
      if (paidAmt >= grandTotal && grandTotal > 0n) status = SaleStatus.paid;
      else if (paidAmt > 0n) status = SaleStatus.partial;

      const invoiceNumber = generateInvoiceNumber(sales.length);
      const newSale: Sale = {
        id: 0n,
        invoiceNumber,
        customerId: BigInt(customerId),
        items: saleItems,
        subtotal,
        totalGST,
        transportCharge,
        discount: discountAmt,
        grandTotal,
        paymentStatus: status,
        createdBy: Principal.anonymous(),
        createdAt: 0n,
      };
      const saleId = await actor.addSale(newSale);

      if (paidAmt > 0n) {
        const payment: Payment = {
          id: 0n,
          saleId,
          amount: paidAmt,
          mode: paymentMethod as PaymentMode,
          date: 0n,
          notes,
        };
        await actor.addPayment(payment);
      }

      toast.success(`Invoice ${invoiceNumber} created!`);
      setOpen(false);
      resetForm();
      reload();
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const custName = (id: bigint) =>
    customers.find((c) => c.id === id)?.name ?? `#${String(id)}`;
  const _custPhone = (id: bigint) =>
    customers.find((c) => c.id === id)?.phone ?? "";
  const productName = (id: bigint) =>
    products.find((p) => p.id === id)?.name ?? `#${String(id)}`;
  const paidForSale = (sId: bigint) =>
    payments.filter((p) => p.saleId === sId).reduce((s, p) => s + p.amount, 0n);
  const paymentsForSale = (sId: bigint) =>
    payments.filter((p) => p.saleId === sId);

  const { grandTotal: previewTotal, subtotal: previewSub } = calcTotals();

  const handlePrint = () => window.print();

  // Invoice detail view
  if (detailSale) {
    const paid = paidForSale(detailSale.id);
    const due =
      detailSale.grandTotal > paid ? detailSale.grandTotal - paid : 0n;
    const salePayments = paymentsForSale(detailSale.id);
    const cust = customers.find((c) => c.id === detailSale.customerId);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between no-print">
          <Button
            variant="ghost"
            onClick={() => setDetailSale(null)}
            className="flex items-center gap-2"
            data-ocid="sales.cancel_button"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 text-white"
            style={{ backgroundColor: "#B8924A" }}
            data-ocid="sales.primary_button"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </div>

        <div
          ref={printRef}
          className="bg-white rounded-xl shadow-card p-6 print:shadow-none print:p-0"
          data-ocid="sales.panel"
        >
          {/* Invoice header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <img
                  src="/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg"
                  alt="RR Logo"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2
                    className="font-display font-bold text-lg"
                    style={{ color: "#B8924A" }}
                  >
                    RADHA RANI MARBLE HOUSE
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    TILES & MARBLE SHOP
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                📍 Main Market, Marble Street
              </p>
              <p className="text-xs text-muted-foreground">
                📞 +91 98765 43210
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                INVOICE
              </p>
              <p className="text-xl font-bold" style={{ color: "#B8924A" }}>
                {detailSale.invoiceNumber}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Date: {formatDate(detailSale.createdAt)}
              </p>
              <div className="mt-2">
                {statusBadge(detailSale.paymentStatus)}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              BILL TO
            </p>
            <p className="font-bold text-foreground">
              {cust?.name ?? custName(detailSale.customerId)}
            </p>
            {cust?.phone && (
              <p className="text-sm text-muted-foreground">{cust.phone}</p>
            )}
            {cust?.address && (
              <p className="text-sm text-muted-foreground">{cust.address}</p>
            )}
          </div>

          {/* Items table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">
                    #
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">
                    PRODUCT
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">
                    QTY
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">
                    UNIT PRICE
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">
                    GST
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailSale.items.map((item, idx) => (
                  <tr
                    key={`${String(item.productId)}-${idx}`}
                    className="border-b border-border"
                  >
                    <td className="py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 font-medium">
                      {productName(item.productId)}
                    </td>
                    <td className="py-3 text-right">{String(item.quantity)}</td>
                    <td className="py-3 text-right">
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right">
                      {item.gstRate.percentage > 0n
                        ? `${String(item.gstRate.percentage)}%`
                        : "—"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatINR(
                        item.unitPrice * item.quantity + item.gstAmount,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1">
              {/* Notes */}
              {detailSale.items.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold mb-1">Notes</p>
                  <p className="italic">Thank you for your business!</p>
                </div>
              )}
            </div>
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(detailSale.subtotal)}</span>
              </div>
              {detailSale.totalGST > 0n && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST</span>
                  <span>{formatINR(detailSale.totalGST)}</span>
                </div>
              )}
              {detailSale.transportCharge > 0n && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transport</span>
                  <span>{formatINR(detailSale.transportCharge)}</span>
                </div>
              )}
              {detailSale.discount > 0n && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatINR(detailSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-border">
                <span>Total</span>
                <span style={{ color: "#B8924A" }}>
                  {formatINR(detailSale.grandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Paid</span>
                <span>{formatINR(paid)}</span>
              </div>
              {due > 0n && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Due</span>
                  <span>{formatINR(due)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div
          className="bg-white rounded-xl shadow-card p-6"
          data-ocid="sales.table"
        >
          <h3 className="font-semibold text-foreground mb-4">
            Payment History
          </h3>
          {salePayments.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-ocid="sales.empty_state"
            >
              No payments recorded
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-muted-foreground">
                    DATE
                  </th>
                  <th className="text-right py-2 font-semibold text-muted-foreground">
                    AMOUNT
                  </th>
                  <th className="text-right py-2 font-semibold text-muted-foreground">
                    METHOD
                  </th>
                  <th className="text-right py-2 font-semibold text-muted-foreground">
                    NOTES
                  </th>
                </tr>
              </thead>
              <tbody>
                {salePayments.map((p, i) => (
                  <tr
                    key={String(p.id)}
                    className="border-b border-border last:border-0"
                    data-ocid={`sales.row.${i + 1}`}
                  >
                    <td className="py-3">{formatDate(p.date)}</td>
                    <td className="py-3 text-right font-medium text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {modeLabel(p.mode)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {p.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sales & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage invoices
          </p>
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={() => setOpen(true)}
          data-ocid="sales.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> New Invoice
        </Button>
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
            data-ocid="sales.search_input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white" data-ocid="sales.select">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2" data-ocid="sales.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="sales.empty_state"
        >
          <p className="text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    INVOICE
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    CUSTOMER
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden sm:table-cell">
                    DATE
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    TOTAL
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">
                    PAID
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">
                    DUE
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    STATUS
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const paid = paidForSale(s.id);
                  const due = s.grandTotal > paid ? s.grandTotal - paid : 0n;
                  const cust = customers.find((c) => c.id === s.customerId);
                  return (
                    <tr
                      key={String(s.id)}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-ocid={`sales.item.${i + 1}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="font-semibold hover:underline"
                          style={{ color: "#B8924A" }}
                          onClick={() => setDetailSale(s)}
                        >
                          {s.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {custName(s.customerId)}
                        </p>
                        {cust?.phone && (
                          <p className="text-xs text-muted-foreground">
                            {cust.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatINR(s.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 hidden md:table-cell">
                        {formatINR(paid)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {due > 0n ? (
                          <span className="text-red-600 font-medium">
                            {formatINR(due)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {statusBadge(s.paymentStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailSale(s)}
                          className="text-xs"
                          data-ocid={`sales.open_modal_button.${i + 1}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="sales.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Create New Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Customer */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                CUSTOMER *
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1.5" data-ocid="sales.select">
                  <SelectValue placeholder="— Select Customer —" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.name} {c.phone ? `— ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  PRODUCTS *
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  data-ocid="sales.secondary_button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const lineQty = BigInt(
                    Math.max(1, Number.parseInt(item.quantity) || 1),
                  );
                  const linePrice = rupeesToPaise(item.unitPrice);
                  const lineTotal = linePrice * lineQty;
                  return (
                    <div
                      key={`item-${item.productId}-${idx}`}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-5">
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            Product
                          </Label>
                        )}
                        <Select
                          value={item.productId}
                          onValueChange={(v) =>
                            setItemField(idx, "productId", v)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem
                                key={String(p.id)}
                                value={String(p.id)}
                              >
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            Qty
                          </Label>
                        )}
                        <Input
                          className="mt-1"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setItemField(idx, "quantity", e.target.value)
                          }
                          data-ocid="sales.input"
                        />
                      </div>
                      <div className="col-span-3">
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            ₹ Price
                          </Label>
                        )}
                        <Input
                          className="mt-1"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setItemField(idx, "unitPrice", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            Total
                          </Label>
                        )}
                        <p className="mt-1 text-sm font-medium pt-2">
                          {formatINR(lineTotal)}
                        </p>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive mt-1"
                            onClick={() => removeItem(idx)}
                            data-ocid="sales.delete_button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GST / Discount / Transport */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  GST %
                </Label>
                <Select
                  value={items[0]?.gstRateName ?? ""}
                  onValueChange={(v) => {
                    setItems((prev) =>
                      prev.map((it) => ({ ...it, gstRateName: v })),
                    );
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="0%" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">0%</SelectItem>
                    {gstRates.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {String(r.percentage)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  DISCOUNT (₹)
                </Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  TRANSPORT (₹)
                </Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(previewSub)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
                <span>Total</span>
                <span style={{ color: "#B8924A" }}>
                  {formatINR(previewTotal)}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  AMOUNT PAID (₹)
                </Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  data-ocid="sales.input"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  PAYMENT METHOD
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide">
                NOTES
              </Label>
              <Textarea
                className="mt-1.5"
                placeholder="Delivery instructions..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-ocid="sales.textarea"
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
              data-ocid="sales.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleCreate}
              disabled={saving}
              data-ocid="sales.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
