import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CreditCard, Search, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { Customer, Payment, Sale } from "../backend";
import { PaymentMode } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";

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
  }, [actor, isFetching]);

  const getSale = (sId: bigint) => sales.find((s) => s.id === sId);
  const getCust = (sId: bigint) => {
    const sale = getSale(sId);
    if (!sale) return "—";
    return customers.find((c) => c.id === sale.customerId)?.name ?? "—";
  };

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">
          All payment records and collections
        </p>
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
    </div>
  );
}
