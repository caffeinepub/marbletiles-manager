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
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";
import {
  type Customer,
  type GSTRate,
  type Payment,
  PaymentMode,
  type Product,
  type Sale,
  type SaleItem,
  SaleStatus,
} from "../types";

const LS_COMPANY = "rrm_company_settings";

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
  const settings = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_COMPANY) || "{}");
    } catch {
      return {};
    }
  })();

  const companyName = settings.name || "RADHA RANI MARBLE HOUSE";
  const companyAddress = settings.address || "";
  const companyCity = settings.city || "";
  const companyPhone = settings.phone || "";
  const companyGstin = settings.gstin || "";
  const bankName = settings.bankName || "";
  const accountNumber = settings.accountNumber || "";
  const ifscCode = settings.ifscCode || "";
  const branch = settings.branch || "";
  const hasBankDetails = bankName || accountNumber || ifscCode || branch;

  const logoUrl = `${window.location.origin}/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg`;
  const invoiceDate = new Date(
    Number(sale.createdAt) / 1_000_000,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const itemRows = sale.items
    .map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      const rowBg = idx % 2 === 0 ? "#fafafa" : "#ffffff";
      return `<tr style="background:${rowBg}">
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;color:#555">${idx + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;font-weight:600;color:#2d2d2d">${prod?.name ?? "Unknown Product"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;text-align:center;color:#555">${String(item.quantity)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;text-align:right;color:#555">&#8377;${(Number(item.unitPrice) / 100).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;text-align:center;color:#555">${item.gstRate.name} (${(Number(item.gstRate.percentage) / 100).toFixed(1)}%)</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;text-align:right;color:#555">&#8377;${(Number(item.gstAmount) / 100).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e9df;font-size:13px;text-align:right;font-weight:600;color:#2d2d2d">&#8377;${((Number(item.unitPrice) * Number(item.quantity) + Number(item.gstAmount)) / 100).toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const salePayments = payments.filter((p) => p.saleId === sale.id);
  const paidAmount = salePayments.reduce((s, p) => s + p.amount, 0n);
  const dueAmount = sale.grandTotal - paidAmount;

  const paymentRows = salePayments
    .map(
      (p) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e9df;font-size:12px;color:#555">${new Date(Number(p.date) / 1_000_000).toLocaleDateString("en-IN")}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e9df;font-size:12px;color:#555">${modeLabel(p.mode)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e9df;font-size:12px;text-align:right;font-weight:600;color:#2d2d2d">&#8377;${(Number(p.amount) / 100).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e9df;font-size:12px;color:#555">${p.notes || "—"}</td>
    </tr>`,
    )
    .join("");

  const bankSection = hasBankDetails
    ? `<div style="margin-top:28px;padding:18px 20px;background:#fffbf5;border:1px solid #f0e9df;border-radius:8px">
        <h3 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#B8924A;letter-spacing:0.5px;text-transform:uppercase">Payment Bank Details</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${bankName ? `<div><p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Bank Name</p><p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#2d2d2d">${bankName}</p></div>` : ""}
          ${accountNumber ? `<div><p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Account Number</p><p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#2d2d2d">${accountNumber}</p></div>` : ""}
          ${ifscCode ? `<div><p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">IFSC Code</p><p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#2d2d2d">${ifscCode}</p></div>` : ""}
          ${branch ? `<div><p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Branch</p><p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#2d2d2d">${branch}</p></div>` : ""}
        </div>
      </div>`
    : "";

  const paymentSection =
    salePayments.length > 0
      ? `<div style="margin-top:28px">
          <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#B8924A;letter-spacing:0.5px;text-transform:uppercase">Payment History</h3>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f0e9df;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#B8924A">
                <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Date</th>
                <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Mode</th>
                <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Amount</th>
                <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Notes</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${sale.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f5f0eb;
      color: #2d2d2d;
      padding: 32px 20px;
    }
    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .invoice-header {
      background: linear-gradient(135deg, #2d1f0e 0%, #4a3218 100%);
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .invoice-body { padding: 28px 32px; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-wrapper { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="invoice-header">
      <div style="display:flex;align-items:center;gap:16px">
        <img src="${logoUrl}" alt="Logo" style="height:72px;width:72px;object-fit:contain;border-radius:6px;background:#fff;padding:4px" />
        <div>
          <h1 style="font-size:20px;font-weight:800;color:#D4A853;letter-spacing:1px;margin-bottom:4px">${companyName.toUpperCase()}</h1>
          <p style="font-size:12px;color:#c9a87a;margin-bottom:6px;letter-spacing:0.5px">Premium Marble &amp; Tiles</p>
          ${companyAddress ? `<p style="font-size:11px;color:#a08060">${companyAddress}${companyCity ? `, ${companyCity}` : ""}</p>` : ""}
          ${companyPhone ? `<p style="font-size:11px;color:#a08060">&#128222; ${companyPhone}</p>` : ""}
          ${companyGstin ? `<p style="font-size:11px;color:#a08060">GSTIN: ${companyGstin}</p>` : ""}
        </div>
      </div>
      <div style="text-align:right">
        <div style="background:rgba(255,255,255,0.10);border:1px solid rgba(212,168,83,0.4);border-radius:8px;padding:12px 16px">
          <p style="font-size:22px;font-weight:800;color:#D4A853;letter-spacing:2px;margin-bottom:6px">INVOICE</p>
          <p style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px">${sale.invoiceNumber}</p>
          <p style="font-size:11px;color:#c9a87a">Date: ${invoiceDate}</p>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(212,168,83,0.3)">
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:${sale.paymentStatus === "paid" ? "#22c55e" : sale.paymentStatus === "partial" ? "#f59e0b" : "#ef4444"};color:#fff">${sale.paymentStatus.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="invoice-body">
      <!-- Bill To -->
      <div style="margin-bottom:24px;padding:16px 20px;background:#fffbf5;border:1px solid #f0e9df;border-radius:8px">
        <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600">Bill To</p>
        <p style="font-size:17px;font-weight:700;color:#2d2d2d;margin-bottom:4px">${customer?.name ?? "Customer"}</p>
        ${customer?.phone ? `<p style="font-size:13px;color:#666;margin-bottom:2px">&#128222; ${customer.phone}</p>` : ""}
        ${customer?.address ? `<p style="font-size:13px;color:#666">&#128205; ${customer.address}</p>` : ""}
      </div>

      <!-- Items Table -->
      <div style="margin-bottom:24px;border:1px solid #f0e9df;border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#B8924A">
              <th style="padding:11px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Sr.</th>
              <th style="padding:11px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Product</th>
              <th style="padding:11px 12px;text-align:center;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Qty</th>
              <th style="padding:11px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Unit Price</th>
              <th style="padding:11px 12px;text-align:center;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">GST Rate</th>
              <th style="padding:11px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">GST Amt</th>
              <th style="padding:11px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
        <div style="width:300px;border:1px solid #f0e9df;border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <tbody>
              <tr style="background:#fafafa">
                <td style="padding:9px 14px;font-size:13px;color:#666">Subtotal</td>
                <td style="padding:9px 14px;font-size:13px;text-align:right;color:#2d2d2d">&#8377;${(Number(sale.subtotal) / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:9px 14px;font-size:13px;color:#666">Total GST</td>
                <td style="padding:9px 14px;font-size:13px;text-align:right;color:#2d2d2d">&#8377;${(Number(sale.totalGST) / 100).toFixed(2)}</td>
              </tr>
              ${Number(sale.transportCharge) > 0 ? `<tr style="background:#fafafa"><td style="padding:9px 14px;font-size:13px;color:#666">Transport</td><td style="padding:9px 14px;font-size:13px;text-align:right;color:#2d2d2d">&#8377;${(Number(sale.transportCharge) / 100).toFixed(2)}</td></tr>` : ""}
              ${Number(sale.discount) > 0 ? `<tr><td style="padding:9px 14px;font-size:13px;color:#666">Discount</td><td style="padding:9px 14px;font-size:13px;text-align:right;color:#22c55e">-&#8377;${(Number(sale.discount) / 100).toFixed(2)}</td></tr>` : ""}
              <tr style="background:#B8924A">
                <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#fff">Grand Total</td>
                <td style="padding:12px 14px;font-size:15px;font-weight:700;text-align:right;color:#fff">&#8377;${(Number(sale.grandTotal) / 100).toFixed(2)}</td>
              </tr>
              ${dueAmount > 0n ? `<tr style="background:#fff8f0"><td style="padding:9px 14px;font-size:12px;color:#c0392b;font-weight:600">Outstanding Due</td><td style="padding:9px 14px;font-size:12px;text-align:right;color:#c0392b;font-weight:600">&#8377;${(Number(dueAmount) / 100).toFixed(2)}</td></tr>` : `<tr style="background:#f0fff4"><td colspan="2" style="padding:9px 14px;font-size:12px;color:#22c55e;font-weight:600;text-align:center">&#10003; Fully Paid</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      ${paymentSection}
      ${bankSection}

      <!-- Footer -->
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0e9df;text-align:center">
        <p style="font-size:15px;font-weight:600;color:#B8924A;margin-bottom:6px">Thank you for your business!</p>
        <p style="font-size:11px;color:#aaa">All disputes subject to local jurisdiction.</p>
        <p style="font-size:12px;color:#B8924A;font-weight:600;margin-top:8px;letter-spacing:0.5px">${companyName.toUpperCase()}</p>
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

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
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
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
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
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
