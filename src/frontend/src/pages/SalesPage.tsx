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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type Customer,
  type GSTRate,
  type Payment,
  type Product,
  type Sale,
  type SaleItem,
  SaleStatus,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";
import { logAudit } from "../utils/audit";

const statusColor = (s: string) => {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "unpaid") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

interface FormItem {
  productId: string;
  quantity: string;
  unitPrice: string;
  gstRateName: string;
}

export default function SalesPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [transport, setTransport] = useState("");
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    { productId: "", quantity: "1", unitPrice: "0", gstRateName: "" },
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional reload trigger
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
    return (
      !search ||
      cust?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    );
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
        const qty = BigInt(Number.parseInt(it.quantity) || 1);
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

  const handleCreate = async () => {
    if (!actor || !identity) return;
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
      const newSale: Sale = {
        id: 0n,
        invoiceNumber: `INV-${Date.now()}`,
        customerId: BigInt(customerId),
        items: saleItems,
        subtotal,
        totalGST,
        transportCharge,
        discount: discountAmt,
        grandTotal,
        paymentStatus: SaleStatus.unpaid,
        createdBy: identity.getPrincipal(),
        createdAt: 0n,
      };
      const saleId = await actor.addSale(newSale);
      logAudit(
        "CREATE_SALE",
        `Created invoice for customer #${customerId}, total ${Number(grandTotal) / 100}`,
      );
      toast.success(`Sale created: INV-${saleId}`);
      setOpen(false);
      setItems([
        { productId: "", quantity: "1", unitPrice: "0", gstRateName: "" },
      ]);
      setCustomerId("");
      setTransport("");
      setDiscount("");
      reload();
    } catch {
      toast.error("Failed to create sale");
    } finally {
      setSaving(false);
    }
  };

  const custName = (id: bigint) =>
    customers.find((c) => c.id === id)?.name ?? `#${String(id)}`;

  const productName = (id: bigint) =>
    products.find((p) => p.id === id)?.name ?? `#${String(id)}`;

  const paidForSale = (sId: bigint) =>
    payments.filter((p) => p.saleId === sId).reduce((s, p) => s + p.amount, 0n);

  const { grandTotal: previewTotal } = calcTotals();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="sales.search_input"
          />
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={() => setOpen(true)}
          data-ocid="sales.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> New Invoice
        </Button>
      </div>

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
          <p className="text-muted-foreground">No sales found.</p>
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
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Paid
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const paid = paidForSale(s.id);
                  return (
                    <tr
                      key={String(s.id)}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                      data-ocid={`sales.item.${i + 1}`}
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
                      <td className="px-4 py-3 text-right font-medium">
                        {formatINR(s.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-emerald-600">
                        {formatINR(paid)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(s.paymentStatus)}`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailSale(s)}
                          data-ocid={`sales.open_modal_button.${i + 1}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Sale Detail */}
      <Dialog
        open={!!detailSale}
        onOpenChange={(v) => !v && setDetailSale(null)}
      >
        <DialogContent className="max-w-lg" data-ocid="sales.modal">
          <DialogHeader>
            <DialogTitle>
              {detailSale?.invoiceNumber ?? "Sale Detail"}
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">
                  {custName(detailSale.customerId)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(detailSale.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(detailSale.paymentStatus)}`}
                >
                  {detailSale.paymentStatus}
                </span>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Items
                </p>
                <div className="space-y-2">
                  {detailSale.items.map((item, idx) => (
                    <div
                      key={`${String(item.productId)}-${idx}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {productName(item.productId)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          x{String(item.quantity)}
                        </span>
                        {item.gstRate.percentage > 0n && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (GST {String(item.gstRate.percentage)}%)
                          </span>
                        )}
                      </div>
                      <span>{formatINR(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
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
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>Grand Total</span>
                  <span>{formatINR(detailSale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid</span>
                  <span>{formatINR(paidForSale(detailSale.id))}</span>
                </div>
                {detailSale.grandTotal > paidForSale(detailSale.id) && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Due</span>
                    <span>
                      {formatINR(
                        detailSale.grandTotal - paidForSale(detailSale.id),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailSale(null)}
              data-ocid="sales.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sale Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="sales.dialog"
        >
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="mt-1" data-ocid="sales.select">
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
              </div>
              <div>
                <Label>Transport Charge (&#8377;)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  data-ocid="sales.input"
                />
              </div>
              <div>
                <Label>Discount (&#8377;)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  + Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional items
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs">Product</Label>}
                      <Select
                        value={item.productId}
                        onValueChange={(v) => setItemField(idx, "productId", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={String(p.id)} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Qty</Label>}
                      <Input
                        className="mt-1"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          setItemField(idx, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && (
                        <Label className="text-xs">Price (&#8377;)</Label>
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
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">GST</Label>}
                      <Select
                        value={item.gstRateName}
                        onValueChange={(v) =>
                          setItemField(idx, "gstRateName", v)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {gstRates.map((r) => (
                            <SelectItem key={r.name} value={r.name}>
                              {r.name} ({String(r.percentage)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Estimated Total</span>
                <span style={{ color: "#B8924A" }}>
                  {formatINR(previewTotal)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
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
