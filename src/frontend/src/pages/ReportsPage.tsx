import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Customer, Expense, Payment, Product, Sale } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";

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
  const netProfit =
    totalRevenue > totalExpenses ? totalRevenue - totalExpenses : 0n;

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
    const exp = expenses
      .filter((e) => {
        if (e.date === 0n) return false;
        const ed = new Date(Number(e.date) / 1_000_000);
        return ed.getMonth() === mn && ed.getFullYear() === yr;
      })
      .reduce((sum, e) => sum + Number(e.amount) / 100, 0);
    return { month: MONTHS[mn], sales: rev, expenses: exp };
  });

  const outstandingSales = sales.filter(
    (s) => s.paymentStatus === "unpaid" || s.paymentStatus === "partial",
  );

  const getCustName = (id: bigint) =>
    customers.find((c) => c.id === id)?.name ?? `#${String(id)}`;

  const inventoryValuation = products.map((p) => ({
    name: p.name,
    category: p.category,
    stock: Number(p.currentStock),
    price: p.basePrice,
    value: p.basePrice * p.currentStock,
  }));

  const totalInventoryValue = inventoryValuation.reduce(
    (s, p) => s + p.value,
    0n,
  );

  const handleExportJSON = () => {
    const data = {
      sales: sales.map((s) => ({
        ...s,
        id: String(s.id),
        grandTotal: String(s.grandTotal),
      })),
      expenses: expenses.map((e) => ({
        ...e,
        id: String(e.id),
        amount: String(e.amount),
      })),
      payments: payments.map((p) => ({
        ...p,
        id: String(p.id),
        amount: String(p.amount),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radharani-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4" data-ocid="reports.loading_state">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Business performance overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            data-ocid="reports.secondary_button"
          >
            <Download className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button
            size="sm"
            className="text-white"
            style={{ backgroundColor: "#B8924A" }}
            onClick={handleExportJSON}
            data-ocid="reports.primary_button"
          >
            <Download className="w-4 h-4 mr-1" /> Export JSON
          </Button>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-3 gap-4" data-ocid="reports.section">
        {[
          {
            label: "Total Revenue",
            value: formatINR(totalRevenue),
            color: "#10b981",
            icon: <TrendingUp className="w-5 h-5" />,
          },
          {
            label: "Total Expenses",
            value: formatINR(totalExpenses),
            color: "#ef4444",
            icon: <TrendingDown className="w-5 h-5" />,
          },
          {
            label: "Net Profit",
            value: formatINR(netProfit),
            color: "#B8924A",
            icon: <TrendingUp className="w-5 h-5" />,
          },
        ].map((kpi, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static config list
          <Card key={i} className="bg-white shadow-card border-0 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-white w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: kpi.color }}
                >
                  {kpi.icon}
                </span>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trend Chart */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Monthly Sales vs Expenses (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={monthlyData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => [`₹${v}`, ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#B8924A"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Sales"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Outstanding Dues */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Outstanding Dues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outstandingSales.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-6"
              data-ocid="reports.empty_state"
            >
              No outstanding dues 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase">
                      Invoice
                    </th>
                    <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase">
                      Customer
                    </th>
                    <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase">
                      Total
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingSales.map((s, i) => (
                    <tr
                      key={String(s.id)}
                      className="border-b border-border last:border-0"
                      data-ocid={`reports.row.${i + 1}`}
                    >
                      <td
                        className="py-2.5 font-medium"
                        style={{ color: "#B8924A" }}
                      >
                        {s.invoiceNumber}
                      </td>
                      <td className="py-2.5">{getCustName(s.customerId)}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatINR(s.grandTotal)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            s.paymentStatus === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
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

      {/* Inventory Valuation */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Inventory Valuation
            <span className="ml-2 text-muted-foreground font-normal">
              Total: {formatINR(totalInventoryValue)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryValuation.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No products in inventory
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase">
                      Product
                    </th>
                    <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase">
                      Stock
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase">
                      Price
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryValuation.map((p, i) => (
                    <tr
                      key={p.name}
                      className="border-b border-border last:border-0"
                      data-ocid={`reports.item.${i + 1}`}
                    >
                      <td className="py-2.5 font-medium">{p.name}</td>
                      <td className="py-2.5 text-muted-foreground capitalize hidden sm:table-cell">
                        {p.category}
                      </td>
                      <td className="py-2.5 text-right">{p.stock}</td>
                      <td className="py-2.5 text-right">
                        {formatINR(p.price)}
                      </td>
                      <td
                        className="py-2.5 text-right font-semibold"
                        style={{ color: "#B8924A" }}
                      >
                        {formatINR(p.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
