import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Landmark,
  MessageCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Customer, Expense, Payment, Sale } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";

type Transaction = {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: bigint;
  date: bigint;
};

type MonthlyRow = {
  month: string;
  income: bigint;
  expense: bigint;
  profit: bigint;
};

export default function FinancePage() {
  const { actor, isFetching } = useActor();
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getAllSales(),
      actor.getAllPayments(),
      actor.getAllExpenses(),
      actor.getAllCustomers(),
    ])
      .then(([s, p, e, c]) => {
        setSales(s);
        setPayments(p);
        setExpenses(e);
        setCustomers(c);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0n);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0n);
  const netProfit = totalRevenue - totalExpenses;
  const outstandingDues = customers.reduce((s, c) => s + c.outstandingDue, 0n);

  // Monthly cash flow
  const monthlyMap: Record<string, { income: bigint; expense: bigint }> = {};
  for (const p of payments) {
    const d = new Date(Number(p.date) / 1_000_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0n, expense: 0n };
    monthlyMap[key].income += p.amount;
  }
  for (const e of expenses) {
    const d = new Date(Number(e.date) / 1_000_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0n, expense: 0n };
    monthlyMap[key].expense += e.amount;
  }
  const monthlyRows: MonthlyRow[] = Object.entries(monthlyMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      profit: income - expense,
    }));

  // Recent transactions
  const transactions: Transaction[] = [
    ...payments.map((p) => ({
      id: `pay-${String(p.id)}`,
      type: "income" as const,
      description: `Payment #${String(p.id)} (${p.mode})`,
      amount: p.amount,
      date: p.date,
    })),
    ...expenses.map((e) => ({
      id: `exp-${String(e.id)}`,
      type: "expense" as const,
      description: e.description,
      amount: e.amount,
      date: e.date,
    })),
  ]
    .sort((a, b) => Number(b.date - a.date))
    .slice(0, 20);

  // Outstanding sales
  const outstandingSales = sales
    .filter((s) => s.paymentStatus !== "paid")
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const getCustomer = (id: bigint) => customers.find((c) => c.id === id);

  const handleExport = () => {
    const data = {
      sales,
      payments,
      expenses,
      customers,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob(
      [
        JSON.stringify(
          data,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-5" data-ocid="finance.loading_state">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5" style={{ color: "#B8924A" }} />
          <h2 className="text-lg font-bold text-foreground">
            Finance Department
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          data-ocid="finance.primary_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export JSON
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: formatINR(totalRevenue),
            color: "#22c55e",
            icon: <TrendingUp className="w-5 h-5" />,
          },
          {
            title: "Total Expenses",
            value: formatINR(totalExpenses),
            color: "#ef4444",
            icon: <TrendingDown className="w-5 h-5" />,
          },
          {
            title: "Net Profit",
            value: formatINR(netProfit < 0n ? 0n - netProfit : netProfit),
            color: netProfit >= 0n ? "#B8924A" : "#ef4444",
            icon: <TrendingUp className="w-5 h-5" />,
          },
          {
            title: "Outstanding Dues",
            value: formatINR(outstandingDues),
            color: "#f59e0b",
            icon: <Landmark className="w-5 h-5" />,
          },
        ].map((kpi) => (
          <Card
            key={kpi.title}
            className="bg-white rounded-xl shadow-card border-0"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Cash Flow */}
        <Card className="bg-white rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Monthly Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p
                className="text-sm text-muted-foreground text-center py-6"
                data-ocid="finance.empty_state"
              >
                No data available
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-2 font-semibold text-muted-foreground">
                        Month
                      </th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">
                        Income
                      </th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">
                        Expense
                      </th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row, i) => (
                      <tr
                        key={row.month}
                        className="border-b border-border last:border-0"
                        data-ocid={`finance.item.${i + 1}`}
                      >
                        <td className="py-2 font-medium">{row.month}</td>
                        <td className="py-2 text-right text-green-600">
                          {formatINR(row.income)}
                        </td>
                        <td className="py-2 text-right text-red-500">
                          {formatINR(row.expense)}
                        </td>
                        <td
                          className="py-2 text-right font-semibold"
                          style={{
                            color: row.profit >= 0n ? "#B8924A" : "#ef4444",
                          }}
                        >
                          {row.profit < 0n ? "-" : ""}
                          {formatINR(
                            row.profit < 0n ? 0n - row.profit : row.profit,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-white rounded-xl shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {transactions.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                    data-ocid={`finance.row.${i + 1}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          t.type === "income"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                      <span className="text-sm truncate">{t.description}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p
                        className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-500"}`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatINR(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Outstanding Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outstandingSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              All payments are cleared ✓
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-2 font-semibold text-muted-foreground">
                      Invoice
                    </th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">
                      Customer
                    </th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">
                      Due Amount
                    </th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">
                      Remind
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingSales.map((s, i) => {
                    const cust = getCustomer(s.customerId);
                    const phone = cust?.phone?.replace(/\D/g, "") || "";
                    const waMsg = encodeURIComponent(
                      `Dear ${cust?.name || "Customer"}, your payment of ${formatINR(s.grandTotal)} for Invoice ${s.invoiceNumber} is pending. Please clear at earliest. - Radha Rani Marble House`,
                    );
                    const waUrl = `https://wa.me/91${phone}?text=${waMsg}`;
                    return (
                      <tr
                        key={String(s.id)}
                        className="border-b border-border last:border-0"
                        data-ocid={`finance.item.${i + 1}`}
                      >
                        <td className="py-2 font-medium">{s.invoiceNumber}</td>
                        <td className="py-2">{cust?.name || "-"}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.paymentStatus === "unpaid"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {s.paymentStatus === "unpaid"
                              ? "Unpaid"
                              : "Partial"}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold text-red-600">
                          {formatINR(s.grandTotal)}
                        </td>
                        <td className="py-2 text-right">
                          {phone ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                              style={{ backgroundColor: "#25D366" }}
                              data-ocid={`finance.button.${i + 1}`}
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No phone
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
