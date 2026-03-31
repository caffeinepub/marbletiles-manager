import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Customer, Payment, Product, Reports, Sale } from "../backend";
import KPICard from "../components/KPICard";
import { useActor } from "../hooks/useActor";
import { formatINR } from "../lib/formatting";

const COLORS = ["#B8924A", "#10b981", "#6366f1", "#f59e0b", "#ef4444"];

export default function ReportsPage() {
  const { actor, isFetching } = useActor();
  const [reports, setReports] = useState<Reports | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getReports(),
      actor.getAllCustomers(),
      actor.getAllProducts(),
      actor.getAllSales(),
      actor.getAllPayments(),
    ])
      .then(([r, custs, prods, allSales, allPayments]) => {
        setReports(r);
        setCustomers(custs);
        setProducts(prods);
        setSales(allSales);
        setPayments(allPayments);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const totalRevenue = reports?.totalRevenue ?? 0n;
  const totalExpenses = reports
    ? reports.expenses.reduce((s, e) => s + e.amount, 0n)
    : 0n;
  const netProfit =
    totalRevenue > totalExpenses ? totalRevenue - totalExpenses : 0n;
  const outstandingDues = customers.reduce((s, c) => s + c.outstandingDue, 0n);
  const totalSales = reports?.totalSales ?? 0n;

  const productData = (reports?.topSellingProducts ?? [])
    .slice(0, 8)
    .map((p) => ({
      name: p.name.length > 14 ? `${p.name.slice(0, 14)}\u2026` : p.name,
      stock: Number(p.currentStock),
      value: Number(p.basePrice * p.currentStock) / 100,
    }));

  const top5Customers = [...customers]
    .sort((a, b) => Number(b.totalPurchases - a.totalPurchases))
    .slice(0, 5);

  const expenseBreakdown = Object.entries(
    (reports?.expenses ?? []).reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0n) + e.amount;
        return acc;
      },
      {} as Record<string, bigint>,
    ),
  ).map(([name, value]) => ({ name, value: Number(value) / 100 }));

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      products,
      customers,
      sales,
      payments,
      expenses: reports?.expenses ?? [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rrm-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-5" data-ocid="reports.loading_state">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="reports.section">
      <div className="flex justify-end">
        <Button
          onClick={exportData}
          className="text-white"
          style={{ backgroundColor: "#B8924A" }}
          data-ocid="reports.primary_button"
        >
          <Download className="w-4 h-4 mr-2" /> Export All Data
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatINR(totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          title="Net Profit"
          value={formatINR(netProfit)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="#10b981"
        />
        <KPICard
          title="Total Sales"
          value={String(totalSales)}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="#6366f1"
        />
        <KPICard
          title="Outstanding"
          value={formatINR(outstandingDues)}
          icon={<Package className="w-5 h-5" />}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Top Selling Products (Stock)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productData.length === 0 ? (
              <div
                className="h-48 flex items-center justify-center text-muted-foreground text-sm"
                data-ocid="reports.empty_state"
              >
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="stock"
                    fill="#B8924A"
                    radius={[4, 4, 0, 0]}
                    name="Stock"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No expense data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {expenseBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(v) => [
                      `\u20B9${Number(v).toFixed(0)}`,
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {top5Customers.length > 0 && (
        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Customers by Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 font-medium">#</th>
                    <th className="text-left pb-2 font-medium">Customer</th>
                    <th className="text-left pb-2 font-medium">Phone</th>
                    <th className="text-right pb-2 font-medium">
                      Total Purchases
                    </th>
                    <th className="text-right pb-2 font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Customers.map((c, i) => (
                    <tr
                      key={String(c.id)}
                      className="border-b border-border last:border-0"
                      data-ocid={`reports.row.${i + 1}`}
                    >
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2 text-muted-foreground">{c.phone}</td>
                      <td className="py-2 text-right">
                        {formatINR(c.totalPurchases)}
                      </td>
                      <td className="py-2 text-right">
                        {c.outstandingDue > 0n ? (
                          <span className="text-red-600">
                            {formatINR(c.outstandingDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground pt-4">
        &copy; {new Date().getFullYear()}. Built with &#10084;&#65039; using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
