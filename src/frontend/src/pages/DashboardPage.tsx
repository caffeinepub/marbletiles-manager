import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Package, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Customer, Product, Reports } from "../backend";
import KPICard from "../components/KPICard";
import { useActor } from "../hooks/useActor";
import { formatINR } from "../lib/formatting";

export default function DashboardPage() {
  const { actor, isFetching } = useActor();
  const [reports, setReports] = useState<Reports | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getReports(),
      actor.getAllCustomers(),
      actor.getAllProducts(),
    ])
      .then(([r, custs, prods]) => {
        setReports(r);
        setCustomers(custs);
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const totalRevenue = reports ? reports.totalRevenue : 0n;
  const totalSales = reports ? reports.totalSales : 0n;
  const totalExpenses = reports
    ? reports.expenses.reduce((s, e) => s + e.amount, 0n)
    : 0n;
  const outstandingDues = customers.reduce((s, c) => s + c.outstandingDue, 0n);
  const lowStockItems = reports ? reports.lowStockReport : [];

  const top5Customers = [...customers]
    .sort((a, b) => Number(b.totalPurchases - a.totalPurchases))
    .slice(0, 5);

  // Dead stock: products with currentStock > 0 but not in topSellingProducts
  const topSellingIds = new Set(
    reports ? reports.topSellingProducts.map((p) => String(p.id)) : [],
  );
  const deadStock = products
    .filter((p) => p.currentStock > 0n && !topSellingIds.has(String(p.id)))
    .slice(0, 5);

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
    <div className="space-y-5">
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.section"
      >
        <KPICard
          title="Total Revenue"
          value={formatINR(totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`${Number(totalSales)} sales`}
        />
        <KPICard
          title="Total Expenses"
          value={formatINR(totalExpenses)}
          icon={<Package className="w-5 h-5" />}
          color="#ef4444"
        />
        <KPICard
          title="Outstanding"
          value={formatINR(outstandingDues)}
          icon={<Clock className="w-5 h-5" />}
          color="#f59e0b"
          subtitle="Pending dues"
        />
        <KPICard
          title="Low Stock Items"
          value={String(lowStockItems.length)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 Customers */}
        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#B8924A" }} />
              Top 5 Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top5Customers.length === 0 ? (
              <p
                className="text-sm text-muted-foreground text-center py-6"
                data-ocid="dashboard.empty_state"
              >
                No customers yet
              </p>
            ) : (
              <div className="space-y-2">
                {top5Customers.map((c, i) => (
                  <div
                    key={String(c.id)}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: "#B8924A" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{c.name}</span>
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

        {/* Low Stock Alerts */}
        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                All stock levels are healthy ✓
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((p, i) => (
                  <div
                    key={String(p.id)}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-ocid={`dashboard.row.${i + 1}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name}
                      </p>
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

      {/* Dead / Slow Moving Stock */}
      {deadStock.length > 0 && (
        <Card className="bg-card rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              Potentially Slow-Moving Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-left pb-2 font-medium">Category</th>
                    <th className="text-right pb-2 font-medium">Stock</th>
                    <th className="text-right pb-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {deadStock.map((p, i) => (
                    <tr
                      key={String(p.id)}
                      className="border-b border-border last:border-0"
                      data-ocid={`dashboard.panel.${i + 1}`}
                    >
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2 text-muted-foreground capitalize">
                        {p.category}
                      </td>
                      <td className="py-2 text-right">
                        {String(p.currentStock)}
                      </td>
                      <td className="py-2 text-right">
                        {formatINR(p.basePrice * p.currentStock)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
