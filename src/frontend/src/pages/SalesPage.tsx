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
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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

function printInvoice(
  sale: Sale,
  customer: Customer | undefined,
  products: Product[],
  payments: Payment[],
) {
  const itemRows = sale.items
    .map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${prod?.name ?? "Unknown"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${String(item.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(Number(item.unitPrice) / 100).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.gstRate.name} (${String(item.gstRate.percentage)}%)</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(Number(item.gstAmount) / 100).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(Number(item.unitPrice * item.quantity + item.gstAmount) / 100).toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const salePayments = payments.filter((p) => p.saleId === sale.id);
  const paymentRows = salePayments
    .map(
      (p) => `<tr>
    <td style="padding:6px;border-bottom:1px solid #eee">${new Date(Number(p.date) / 1_000_000).toLocaleDateString("en-IN")}</td>
    <td style="padding:6px;border-bottom:1px solid #eee">${modeLabel(p.mode)}</td>
    <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">₹${(Number(p.amount) / 100).toFixed(2)}</td>
    <td style="padding:6px;border-bottom:1px solid #eee">${p.notes}</td>
  </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>Invoice ${sale.invoiceNumber}</title>
  <style>body{font-family:Arial,sans-serif;margin:40px;color:#333} table{width:100%;border-collapse:collapse} th{background:#B8924A;color:white;padding:10px;text-align:left} .gold{color:#B8924A} .right{text-align:right}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:30px">
    <div>
      <h1 style="margin:0;color:#B8924A;font-size:24px">RADHA RANI MARBLE HOUSE</h1>
      <p style="margin:4px 0;color:#666;font-size:12px">Premium Marble & Tiles</p>
    </div>
    <div style="text-align:right">
      <h2 style="margin:0;color:#B8924A">INVOICE</h2>
      <p style="margin:4px 0;font-weight:bold">${sale.invoiceNumber}</p>
      <p style="margin:4px 0;font-size:12px;color:#666">${new Date(Number(sale.createdAt) / 1_000_000).toLocaleDateString("en-IN")}</p>
    </div>
  </div>
  <div style="margin-bottom:24px;padding:16px;background:#fafafa;border-radius:8px">
    <strong>Bill To:</strong><br/>
    <span style="font-size:16px">${customer?.name ?? "Customer"}</span><br/>
    <span style="color:#666">${customer?.phone ?? ""}</span><br/>
    <span style="color:#666">${customer?.address ?? ""}</span>
  </div>
  <table style="margin-bottom:24px">
    <thead><tr><th>Product</th><th>Qty</th><th class="right">Unit Price</th><th>GST</th><th class="right">GST Amt</th><th class="right">Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="float:right;width:300px;margin-bottom:32px">
    <table><tbody>
      <tr><td>Subtotal</td><td style="text-align:right">₹${(Number(sale.subtotal) / 100).toFixed(2)}</td></tr>
      <tr><td>Total GST</td><td style="text-align:right">₹${(Number(sale.totalGST) / 100).toFixed(2)}</td></tr>
      <tr><td>Transport</td><td style="text-align:right">₹${(Number(sale.transportCharge) / 100).toFixed(2)}</td></tr>
      <tr><td>Discount</td><td style="text-align:right">-₹${(Number(sale.discount) / 100).toFixed(2)}</td></tr>
      <tr style="font-weight:bold;font-size:16px;color:#B8924A"><td>Grand Total</td><td style="text-align:right">₹${(Number(sale.grandTotal) / 100).toFixed(2)}</td></tr>
    </tbody></table>
  </div>
  <div style="clear:both"></div>
  ${
    salePayments.length > 0
      ? `<h3 style="color:#B8924A">Payment History</h3>
  <table><thead><tr><th>Date</th><th>Mode</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${paymentRows}</tbody></table>`
      : ""
  }
  <div style="margin-top:40px;text-align:center;color:#999;font-size:11px">Thank you for your business!</div>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
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

  // Form state
  const [selCustomerId, setSelCustomerId] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    { productId: "", quantity: "1", unitPrice: "", gstRateName: "" },
  ]);
  const [transport, setTransport] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<string>(PaymentMode.cash);
  const [notes, setNotes] = useState("");

  const loadData = () => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllProducts(),
      actor.getAllCustomers(),
      actor.getAllPayments(),
      actor.getAllGSTRates(),
    ])
      .then(([s, pr, c, p, gr]) => {
        setSales(s);
        setProducts(pr);
        setCustomers(c);
        setPayments(p);
        setGstRates(gr.map(([, rate]) => rate));
      })
      .finally(() => setLoading(false));
  };

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
      .then(([s, pr, c, p, gr]) => {
        setSales(s);
        setProducts(pr);
        setCustomers(c);
        setPayments(p);
        setGstRates(gr.map(([, rate]) => rate));
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const defaultGstName = gstRates.length > 0 ? gstRates[0].name : "";

  const openModal = () => {
    setSelCustomerId(customers.length > 0 ? String(customers[0].id) : "");
    setItems([
      {
        productId: products.length > 0 ? String(products[0].id) : "",
        quantity: "1",
        unitPrice:
          products.length > 0
            ? String(Number(products[0].basePrice) / 100)
            : "",
        gstRateName: defaultGstName,
      },
    ]);
    setTransport("0");
    setDiscount("0");
    setPaymentMode(PaymentMode.cash);
    setNotes("");
    setOpen(true);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: products.length > 0 ? String(products[0].id) : "",
        quantity: "1",
        unitPrice:
          products.length > 0
            ? String(Number(products[0].basePrice) / 100)
            : "",
        gstRateName: defaultGstName,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof FormItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "productId") {
          const prod = products.find((p) => String(p.id) === value);
          if (prod) updated.unitPrice = String(Number(prod.basePrice) / 100);
        }
        return updated;
      }),
    );
  };

  const calcTotals = () => {
    let subtotal = 0n;
    let totalGST = 0n;
    const saleItems: SaleItem[] = [];

    for (const item of items) {
      const prod = products.find((p) => String(p.id) === item.productId);
      if (!prod) continue;
      const gstRate = gstRates.find((g) => g.name === item.gstRateName);
      const qty = BigInt(Math.max(1, Number(item.quantity) || 1));
      const unitPricePaise = rupeesToPaise(item.unitPrice || "0");
      const lineTotal = unitPricePaise * qty;
      const gstPct = gstRate ? gstRate.percentage : 0n;
      const gstAmt = (lineTotal * gstPct) / 100n;
      subtotal += lineTotal;
      totalGST += gstAmt;
      saleItems.push({
        productId: prod.id,
        quantity: qty,
        unitPrice: unitPricePaise,
        gstRate: gstRate ?? { name: "None", percentage: 0n },
        gstAmount: gstAmt,
      });
    }

    const transportPaise = rupeesToPaise(transport || "0");
    const discountPaise = rupeesToPaise(discount || "0");
    const grandTotal = subtotal + totalGST + transportPaise - discountPaise;

    return {
      subtotal,
      totalGST,
      transportPaise,
      discountPaise,
      grandTotal,
      saleItems,
    };
  };

  const handleCreate = async () => {
    if (!actor) return;
    if (!selCustomerId) {
      toast.error("Select a customer");
      return;
    }
    if (items.length === 0 || items.every((it) => !it.productId)) {
      toast.error("Add at least one product");
      return;
    }

    setSaving(true);
    try {
      const {
        subtotal,
        totalGST,
        transportPaise,
        discountPaise,
        grandTotal,
        saleItems,
      } = calcTotals();
      const invoiceNumber = generateInvoiceNumber(sales.length);

      let paymentStatus: SaleStatus;
      if (grandTotal <= 0n) {
        paymentStatus = SaleStatus.paid;
      } else {
        paymentStatus = SaleStatus.unpaid;
      }

      const sale: Sale = {
        id: 0n,
        customerId: BigInt(selCustomerId),
        invoiceNumber,
        items: saleItems,
        subtotal,
        totalGST,
        transportCharge: transportPaise,
        discount: discountPaise,
        grandTotal,
        paymentStatus,
        createdAt: 0n,
        createdBy: Principal.anonymous(),
      };

      await actor.addSale(sale);

      // Payment is recorded separately via PaymentsPage

      toast.success(`Invoice ${invoiceNumber} created!`);
      setOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(
        `Failed to create invoice: ${err?.message ?? "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const { grandTotal: previewTotal } = calcTotals();

  const filteredSales = sales
    .filter((s) => {
      const matchSearch =
        !search ||
        s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        customers
          .find((c) => c.id === s.customerId)
          ?.name.toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || s.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="sales.loading_state">
        {["s1", "s2", "s3", "s4"].map((k) => (
          <Skeleton key={k} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="sales.page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Sales & Billing</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search invoice or customer..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="sales.search_input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-ocid="sales.select">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
            onClick={openModal}
            data-ocid="sales.open_modal_button"
          >
            <Plus className="w-4 h-4 mr-1" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div
          className="text-center py-16 text-gray-400"
          data-ocid="sales.empty_state"
        >
          No sales found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full" data-ocid="sales.table">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, i) => {
                const cust = customerMap.get(sale.customerId);
                const salePayments = payments.filter(
                  (p) => p.saleId === sale.id,
                );
                const isUnpaidOrPartial = sale.paymentStatus !== "paid";
                return (
                  <tr
                    key={String(sale.id)}
                    className="border-t border-gray-100 hover:bg-gray-50"
                    data-ocid={`sales.row.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#B8924A]">
                        {sale.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {cust?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatINR(sale.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(sale.paymentStatus)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            printInvoice(sale, cust, products, salePayments)
                          }
                          data-ocid={`sales.print_button.${i + 1}`}
                        >
                          <Printer className="w-3 h-3 mr-1" /> Print
                        </Button>
                        {isUnpaidOrPartial && cust?.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300"
                            onClick={() => {
                              const collected = salePayments.reduce(
                                (s, p) => s + p.amount,
                                0n,
                              );
                              const due = sale.grandTotal - collected;
                              const msg = encodeURIComponent(
                                `Dear ${cust.name}, your invoice ${sale.invoiceNumber} has a due of ₹${(Number(due) / 100).toFixed(2)}. Please clear the payment at your earliest. - Radha Rani Marble House`,
                              );
                              window.open(
                                `https://wa.me/${cust.phone.replace(/\D/g, "")}?text=${msg}`,
                                "_blank",
                              );
                            }}
                            data-ocid={`sales.whatsapp_button.${i + 1}`}
                          >
                            <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="sales.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-[#B8924A]">
              Create New Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer */}
            <div>
              <Label className="text-sm font-semibold">Customer *</Label>
              {customers.length === 0 ? (
                <p className="text-sm text-red-500 mt-1">
                  No customers found. Add a customer first.
                </p>
              ) : (
                <Select value={selCustomerId} onValueChange={setSelCustomerId}>
                  <SelectTrigger data-ocid="sales.customer_select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Products *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  data-ocid="sales.add_item_button"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={`prod-${item.productId}-${idx}`}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-4">
                      <Select
                        value={item.productId}
                        onValueChange={(v) => updateItem(idx, "productId", v)}
                      >
                        <SelectTrigger className="text-xs">
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
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Unit Price ₹"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      {gstRates.length > 0 ? (
                        <Select
                          value={item.gstRateName || gstRates[0].name}
                          onValueChange={(v) =>
                            updateItem(idx, "gstRateName", v)
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="GST" />
                          </SelectTrigger>
                          <SelectContent>
                            {gstRates.map((g) => (
                              <SelectItem key={g.name} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-gray-400">No GST</span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        data-ocid={`sales.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">
                  Transport Charge (₹)
                </Label>
                <Input
                  type="number"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  data-ocid="sales.transport_input"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Discount (₹)</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  data-ocid="sales.discount_input"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <Label className="text-sm font-semibold">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger data-ocid="sales.payment_mode_select">
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
                data-ocid="sales.notes_textarea"
              />
            </div>

            {/* Total Preview */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-right">
              <span className="text-sm text-gray-600">Grand Total: </span>
              <span className="text-xl font-bold text-[#B8924A]">
                {formatINR(previewTotal)}
              </span>
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
              className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
              onClick={handleCreate}
              disabled={
                saving || customers.length === 0 || products.length === 0
              }
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
