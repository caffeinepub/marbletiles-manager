import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";
import type { Expense, Payment } from "../types";

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

type Transaction = {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: bigint;
  date: bigint;
};

export default function FinancePage() {
  const { actor, isFetching } = useActor();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([actor.getAllPayments(), actor.getAllExpenses()])
      .then(([p, e]) => {
        setPayments(p);
        setExpenses(e);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const totalIncome = payments.reduce((s, p) => s + p.amount, BigInt(0));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, BigInt(0));
  const netProfit = totalIncome - totalExpenses;

  const now = new Date();

  // Monthly income vs expense (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mIdx = d.getMonth();
    const yr = d.getFullYear();
    const mIncome = payments
      .filter((p) => {
        const pd = new Date(Number(p.date) / 1_000_000);
        return pd.getMonth() === mIdx && pd.getFullYear() === yr;
      })
      .reduce((s, p) => s + p.amount, 0n);
    const mExp = expenses
      .filter((e) => {
        const ed = new Date(Number(e.date) / 1_000_000);
        return ed.getMonth() === mIdx && ed.getFullYear() === yr;
      })
      .reduce((s, e) => s + e.amount, 0n);
    return {
      month: MONTHS[mIdx],
      income: Number(mIncome) / 100,
      expense: Number(mExp) / 100,
    };
  });

  // Combined transaction ledger
  const transactions: Transaction[] = [
    ...payments.map((p) => ({
      id: `pay-${String(p.id)}`,
      type: "income" as const,
      description: `Payment received (Invoice #${String(p.saleId)})`,
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
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="finance.loading_state">
        {["f1", "f2", "f3"].map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="finance.page">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Finance Department</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total Income
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatINR(totalIncome)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {payments.length} transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total Expenses
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatINR(totalExpenses)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {expenses.length} entries
            </p>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 ${netProfit >= 0n ? "border-l-[#B8924A]" : "border-l-red-600"}`}
        >
          <CardContent className="p-4">
            <div
              className={`flex items-center gap-2 mb-2 ${netProfit >= 0n ? "text-[#B8924A]" : "text-red-600"}`}
            >
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Net Profit
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${netProfit >= 0n ? "text-gray-900" : "text-red-600"}`}
            >
              {netProfit < 0n ? "-" : ""}
              {formatINR(netProfit < 0n ? -netProfit : netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expense Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Income vs Expenses (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
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
                formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
              />
              <Legend />
              <Bar
                dataKey="income"
                name="Income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction Ledger */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Transaction Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div
              className="text-center py-8 text-gray-400 text-sm"
              data-ocid="finance.empty_state"
            >
              No transactions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-ocid="finance.table">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Description
                    </th>
                    <th className="px-4 py-2 text-center font-semibold">
                      Type
                    </th>
                    <th className="px-4 py-2 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 50).map((t, i) => (
                    <tr
                      key={t.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                      data-ocid={`finance.row.${i + 1}`}
                    >
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {t.description}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            t.type === "income"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.type === "income" ? "INCOME" : "EXPENSE"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold text-sm ${
                          t.type === "income"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {t.type === "expense" ? "-" : ""}
                        {formatINR(t.amount)}
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
