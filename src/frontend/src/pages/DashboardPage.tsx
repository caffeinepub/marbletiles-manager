import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  IndianRupee,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

const statusColor = (s: string) => {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "unpaid") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

export default function DashboardPage() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, isFetching]);

  const totalRevenue = sales.reduce(
    (s, sale) => s + sale.grandTotal,
    BigInt(0),
  );
  const totalCollected = payments.reduce((s, p) => s + p.amount, BigInt(0));
  const outstandingDues = totalRevenue - totalCollected;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, BigInt(0));
  const totalProfit = totalCollected - totalExpenses;
  const lowStockItems = products.filter(
    (p) => p.currentStock <= p.minStockAlert,
  );

  // Monthly chart data (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mIdx = d.getMonth();
    const yr = d.getFullYear();
    const monthSales = sales.filter((s) => {
      const sd = new Date(Number(s.createdAt) / 1_000_000);
      return sd.getMonth() === mIdx && sd.getFullYear() === yr;
    });
    const rev = monthSales.reduce((acc, s) => acc + s.grandTotal, 0n);
    return {
      month: MONTHS[mIdx],
      revenue: Number(rev) / 100,
    };
  });

  const recentSales = [...sales]
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 5);

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="dashboard.loading_state">
        {["d1", "d2", "d3", "d4"].map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="dashboard.page">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#B8924A]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#B8924A] mb-1">
              <IndianRupee className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total Revenue
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatINR(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Outstanding Dues
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatINR(outstandingDues < 0n ? 0n : outstandingDues)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total Profit
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatINR(totalProfit < 0n ? 0n : totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Low Stock
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {lowStockItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Monthly Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `₹${(v).toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="#B8924A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div
                className="flex items-center justify-center h-32 text-gray-400 text-sm"
                data-ocid="dashboard.empty_state"
              >
                All stocks are sufficient
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {lowStockItems.map((p, i) => (
                  <div
                    key={String(p.id)}
                    className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {p.name}
                    </span>
                    <Badge className="bg-amber-500 text-white text-xs">
                      {String(p.currentStock)} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales + Customers Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div
                className="text-center text-gray-400 text-sm py-8"
                data-ocid="dashboard.empty_state"
              >
                No sales yet
              </div>
            ) : (
              <div className="space-y-2">
                {recentSales.map((sale, i) => {
                  const cust = customerMap.get(sale.customerId);
                  return (
                    <div
                      key={String(sale.id)}
                      className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50"
                      data-ocid={`dashboard.item.${i + 1}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#B8924A]">
                          {sale.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cust?.name ?? "Unknown"} ·{" "}
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatINR(sale.grandTotal)}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusColor(sale.paymentStatus)}`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B8924A]" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div
                className="text-center text-gray-400 text-sm py-8"
                data-ocid="dashboard.empty_state"
              >
                No customers yet
              </div>
            ) : (
              <div className="space-y-2">
                {[...customers]
                  .sort((a, b) =>
                    b.totalPurchases > a.totalPurchases ? 1 : -1,
                  )
                  .slice(0, 5)
                  .map((c, i) => (
                    <div
                      key={String(c.id)}
                      className="flex items-center justify-between p-2 rounded-lg border border-gray-100"
                      data-ocid={`dashboard.item.${i + 1}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatINR(c.totalPurchases)}
                        </p>
                        {c.outstandingDue > 0n && (
                          <p className="text-xs text-red-500">
                            Due: {formatINR(c.outstandingDue)}
                          </p>
                        )}
                      </div>
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
