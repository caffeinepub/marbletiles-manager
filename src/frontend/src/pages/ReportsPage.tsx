import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";
import type { Customer, Expense, Payment, Product, Sale } from "../types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ReportsPage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllPayments(),
      actor.getAllExpenses(),
      actor.getAllProducts(),
      actor.getAllCustomers(),
    ])
      .then(([s, p, e, pr, c]) => {
        setSales(s);
        setPayments(p);
        setExpenses(e);
        setProducts(pr);
        setCustomers(c);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const now = new Date();

  // Monthly sales & profit (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mIdx = d.getMonth();
    const yr = d.getFullYear();
    const monthSales = sales.filter((s) => {
      const sd = new Date(Number(s.createdAt) / 1_000_000);
      return sd.getMonth() === mIdx && sd.getFullYear() === yr;
    });
    const monthPayments = payments.filter((p) => {
      const pd = new Date(Number(p.date) / 1_000_000);
      return pd.getMonth() === mIdx && pd.getFullYear() === yr;
    });
    const monthExpenses = expenses.filter((e) => {
      const ed = new Date(Number(e.date) / 1_000_000);
      return ed.getMonth() === mIdx && ed.getFullYear() === yr;
    });
    const revenue =
      Number(monthSales.reduce((a, s) => a + s.grandTotal, 0n)) / 100;
    const collected =
      Number(monthPayments.reduce((a, p) => a + p.amount, 0n)) / 100;
    const exp = Number(monthExpenses.reduce((a, e) => a + e.amount, 0n)) / 100;
    const profit = collected - exp;
    return {
      month: MONTHS[mIdx],
      revenue,
      profit,
    };
  });

  // Inventory valuation
  const inventoryValue = products.reduce(
    (s, p) => s + p.basePrice * p.currentStock,
    BigInt(0),
  );

  // Outstanding customers
  const outstandingCustomers = customers
    .filter((c) => c.outstandingDue > 0n)
    .sort((a, b) => (b.outstandingDue > a.outstandingDue ? 1 : -1));

  const totalRevenue = sales.reduce(
    (s, sale) => s + sale.grandTotal,
    BigInt(0),
  );
  const totalCollected = payments.reduce((s, p) => s + p.amount, BigInt(0));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, BigInt(0));
  const netProfit = totalCollected - totalExpenses;

  const exportCSV = () => {
    const rows = [
      ["Invoice #", "Customer", "Date", "Amount", "Status"],
      ...sales.map((s) => {
        const cust = customers.find((c) => c.id === s.customerId);
        return [
          s.invoiceNumber,
          cust?.name ?? "Unknown",
          new Date(Number(s.createdAt) / 1_000_000).toLocaleDateString("en-IN"),
          (Number(s.grandTotal) / 100).toFixed(2),
          s.paymentStatus,
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="reports.loading_state">
        {["r1", "r2", "r3"].map((k) => (
          <Skeleton key={k} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="reports.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="border-[#B8924A] text-[#B8924A] hover:bg-amber-50"
          data-ocid="reports.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#B8924A]">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-[#B8924A] uppercase mb-1">
              Total Revenue
            </div>
            <p className="text-xl font-bold">{formatINR(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">
              Collected
            </div>
            <p className="text-xl font-bold">{formatINR(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-red-500 uppercase mb-1">
              Total Expenses
            </div>
            <p className="text-xl font-bold">{formatINR(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 ${netProfit >= 0n ? "border-l-emerald-600" : "border-l-red-600"}`}
        >
          <CardContent className="p-4">
            <div
              className={`text-xs font-semibold uppercase mb-1 flex items-center gap-1 ${netProfit >= 0n ? "text-emerald-600" : "text-red-600"}`}
            >
              {netProfit >= 0n ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              Net Profit
            </div>
            <p
              className={`text-xl font-bold ${netProfit >= 0n ? "text-emerald-700" : "text-red-700"}`}
            >
              {formatINR(netProfit < 0n ? -netProfit : netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Sales BarChart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Monthly Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `₹${v.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="#B8924A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Profit LineChart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Monthly Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `₹${v.toLocaleString("en-IN")}`,
                    "Profit",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Valuation + Outstanding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Inventory Valuation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Total Stock Value
              </p>
              <p className="text-3xl font-bold text-[#B8924A]">
                {formatINR(inventoryValue)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {products.length} products ·{" "}
                {products
                  .reduce((s, p) => s + p.currentStock, BigInt(0))
                  .toString()}{" "}
                units
              </p>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {products
                .filter((p) => p.currentStock > 0n)
                .sort((a, b) =>
                  b.basePrice * b.currentStock > a.basePrice * a.currentStock
                    ? 1
                    : -1,
                )
                .slice(0, 8)
                .map((p, i) => (
                  <div
                    key={String(p.id)}
                    className="flex items-center justify-between text-sm"
                    data-ocid={`reports.item.${i + 1}`}
                  >
                    <span className="text-gray-700">{p.name}</span>
                    <span className="font-semibold">
                      {formatINR(p.basePrice * p.currentStock)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Outstanding Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingCustomers.length === 0 ? (
              <div
                className="text-center py-8 text-gray-400 text-sm"
                data-ocid="reports.empty_state"
              >
                No outstanding dues 🎉
              </div>
            ) : (
              <div
                className="space-y-2 max-h-56 overflow-y-auto"
                data-ocid="reports.table"
              >
                {outstandingCustomers.map((c, i) => (
                  <div
                    key={String(c.id)}
                    className="flex items-center justify-between p-2 rounded border border-red-100 bg-red-50"
                    data-ocid={`reports.row.${i + 1}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </div>
                    <span className="font-bold text-red-600 text-sm">
                      {formatINR(c.outstandingDue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
