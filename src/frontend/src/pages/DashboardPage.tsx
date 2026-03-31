import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
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
import type { Customer, Expense, Payment, Product, Sale } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";

const statusColor = (s: string) => {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "unpaid") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

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

export default function DashboardPage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
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

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0n);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0n);
  const profit =
    totalRevenue > totalExpenses ? totalRevenue - totalExpenses : 0n;
  const outstandingDues = customers.reduce((s, c) => s + c.outstandingDue, 0n);
  const lowStockItems = products.filter(
    (p) => p.currentStock <= p.minStockAlert && p.minStockAlert > 0n,
  );

  const recentSales = [...sales]
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, 5);

  // Monthly chart — last 6 months
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mn = d.getMonth();
    const yr = d.getFullYear();
    const rev = sales
      .filter((s) => {
        if (s.createdAt === 0n) return false;
        const sd = new Date(Number(s.createdAt) / 1_000_000);
        return sd.getMonth() === mn && sd.getFullYear() === yr;
      })
      .reduce((sum, s) => sum + Number(s.grandTotal) / 100, 0);
    return { month: MONTHS[mn], revenue: rev };
  });

  const custName = (id: bigint) =>
    customers.find((c) => c.id === id)?.name ?? `#${String(id)}`;

  if (loading) {
    return (
      <div className="space-y-5" data-ocid="dashboard.loading_state">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="dashboard.section">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: formatINR(totalRevenue),
            sub: `${sales.length} invoices`,
            icon: <TrendingUp className="w-5 h-5" />,
            color: "#B8924A",
          },
          {
            title: "Net Profit",
            value: formatINR(profit),
            sub: `Expenses: ${formatINR(totalExpenses)}`,
            icon: <ArrowUpRight className="w-5 h-5" />,
            color: "#10b981",
          },
          {
            title: "Outstanding Dues",
            value: formatINR(outstandingDues),
            sub: "Pending from customers",
            icon: <Clock className="w-5 h-5" />,
            color: "#f59e0b",
          },
          {
            title: "Low Stock Items",
            value: String(lowStockItems.length),
            sub: `${products.length} total products`,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: lowStockItems.length > 0 ? "#ef4444" : "#10b981",
          },
        ].map((kpi) => (
          <Card
            key={kpi.title}
            className="bg-white rounded-xl shadow-card border-0"
            data-ocid="dashboard.card"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </p>
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: kpi.color }}
                >
                  {kpi.icon}
                </span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2 bg-white rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "#B8924A" }} />
              Monthly Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#B8924A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="bg-white rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                All stock healthy ✓
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 6).map((p, i) => (
                  <div
                    key={String(p.id)}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {p.category}
                      </p>
                    </div>
                    <Badge variant="destructive" className="ml-2 flex-shrink-0">
                      {String(p.currentStock)} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "#B8924A" }} />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-6"
              data-ocid="dashboard.empty_state"
            >
              No transactions yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-muted-foreground text-xs uppercase">
                      Invoice
                    </th>
                    <th className="text-left pb-2 font-medium text-muted-foreground text-xs uppercase">
                      Customer
                    </th>
                    <th className="text-left pb-2 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-right pb-2 font-medium text-muted-foreground text-xs uppercase">
                      Amount
                    </th>
                    <th className="text-right pb-2 font-medium text-muted-foreground text-xs uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s, i) => (
                    <tr
                      key={String(s.id)}
                      className="border-b border-border last:border-0"
                      data-ocid={`dashboard.row.${i + 1}`}
                    >
                      <td
                        className="py-2.5 font-medium"
                        style={{ color: "#B8924A" }}
                      >
                        {s.invoiceNumber}
                      </td>
                      <td className="py-2.5">{custName(s.customerId)}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatINR(s.grandTotal)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusColor(s.paymentStatus)}`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: "#B8924A" }} />
            Top Customers by Purchase
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No customers yet
            </p>
          ) : (
            <div className="space-y-2">
              {[...customers]
                .sort((a, b) => Number(b.totalPurchases - a.totalPurchases))
                .slice(0, 5)
                .map((c, i) => (
                  <div
                    key={String(c.id)}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-ocid={`dashboard.panel.${i + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: "#B8924A" }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground">
                            {c.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#B8924A" }}
                    >
                      {formatINR(c.totalPurchases)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
