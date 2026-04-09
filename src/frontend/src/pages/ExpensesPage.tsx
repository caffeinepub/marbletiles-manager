import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Principal } from "@icp-sdk/core/principal";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";
import { type Expense, ExpenseCategory } from "../types";

const catLabel: Record<string, string> = {
  labour: "Labour",
  electricity: "Electricity",
  transport: "Transport",
  rent: "Rent",
  other: "Other",
};

const catColor: Record<string, string> = {
  labour: "#3b82f6",
  electricity: "#f59e0b",
  transport: "#22c55e",
  rent: "#a855f7",
  other: "#94a3b8",
};

const catBadge = (c: string) => {
  const cls: Record<string, string> = {
    labour: "bg-blue-100 text-blue-700",
    rent: "bg-purple-100 text-purple-700",
    transport: "bg-green-100 text-green-700",
    electricity: "bg-yellow-100 text-yellow-700",
    other: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-bold ${cls[c] ?? "bg-gray-100 text-gray-700"}`}
    >
      {catLabel[c] ?? c}
    </span>
  );
};

const emptyForm = () => ({
  category: ExpenseCategory.other as string,
  description: "",
  amountRupees: "",
  date: new Date().toISOString().split("T")[0],
});

export default function ExpensesPage() {
  const { actor, isFetching } = useActor();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
    // refreshKey triggers re-fetch after mutations
    void refreshKey;
    setLoading(true);
    actor
      .getAllExpenses()
      .then(setExpenses)
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditId(exp.id);
    setForm({
      category: exp.category as string,
      description: exp.description,
      amountRupees: String(Number(exp.amount) / 100),
      date: new Date(Number(exp.date) / 1_000_000).toISOString().split("T")[0],
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!actor) return;
    if (!form.description.trim()) {
      toast.error("Enter description");
      return;
    }
    if (!form.amountRupees || Number(form.amountRupees) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const dateMs = form.date ? new Date(form.date).getTime() : Date.now();
      const expense: Expense = {
        id: editId ?? 0n,
        category: form.category,
        description: form.description,
        amount: rupeesToPaise(form.amountRupees),
        date: BigInt(dateMs) * 1_000_000n,
        recordedBy: Principal.anonymous(),
      };

      if (editId !== null) {
        await actor.updateExpense(editId, expense);
        toast.success("Expense updated!");
      } else {
        await actor.addExpense(expense);
        toast.success("Expense added!");
      }
      setOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(`Failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    try {
      await actor.deleteExpense(id);
      toast.success("Expense deleted");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(`Failed to delete: ${err?.message ?? "Unknown error"}`);
    }
  };

  // Category totals
  const categories = Object.values(ExpenseCategory) as string[];
  const catTotals = categories
    .map((cat) => ({
      name: catLabel[cat] ?? cat,
      value:
        Number(
          expenses
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + e.amount, BigInt(0)),
        ) / 100,
      key: cat,
    }))
    .filter((c) => c.value > 0);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, BigInt(0));

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-ocid="expenses.loading_state">
        {["e1", "e2", "e3", "e4"].map((k) => (
          <Skeleton key={k} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="expenses.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
        <Button
          className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
          onClick={openAdd}
          data-ocid="expenses.open_modal_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Summary + Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Cards */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const amt = expenses
              .filter((e) => e.category === cat)
              .reduce((s, e) => s + e.amount, BigInt(0));
            return (
              <Card
                key={cat}
                className="border-l-4"
                style={{ borderLeftColor: catColor[cat] }}
              >
                <CardContent className="p-3">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: catColor[cat] }}
                  >
                    {catLabel[cat]}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">
                    {formatINR(amt)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-l-4 border-l-[#B8924A] col-span-2">
            <CardContent className="p-3">
              <div className="text-xs font-semibold mb-1 text-[#B8924A]">
                Total Expenses
              </div>
              <p className="font-bold text-gray-900">
                {formatINR(totalExpenses)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart */}
        <Card>
          <CardContent className="p-4">
            {catTotals.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No expense data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={catTotals}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {catTotals.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={catColor[entry.key] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div
          className="text-center py-16 text-gray-400"
          data-ocid="expenses.empty_state"
        >
          No expenses recorded yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full" data-ocid="expenses.table">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Description
                </th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...expenses]
                .sort((a, b) => (b.date > a.date ? 1 : -1))
                .map((exp, i) => (
                  <tr
                    key={String(exp.id)}
                    className="border-t border-gray-100 hover:bg-gray-50"
                    data-ocid={`expenses.row.${i + 1}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-4 py-3">{catBadge(exp.category)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {exp.description}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(exp)}
                          data-ocid={`expenses.edit_button.${i + 1}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => handleDelete(exp.id)}
                          data-ocid={`expenses.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" data-ocid="expenses.dialog">
          <DialogHeader>
            <DialogTitle className="text-[#B8924A]">
              {editId !== null ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as string }))
                }
              >
                <SelectTrigger data-ocid="expenses.category_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExpenseCategory.labour}>Labour</SelectItem>
                  <SelectItem value={ExpenseCategory.electricity}>
                    Electricity
                  </SelectItem>
                  <SelectItem value={ExpenseCategory.transport}>
                    Transport
                  </SelectItem>
                  <SelectItem value={ExpenseCategory.rent}>Rent</SelectItem>
                  <SelectItem value={ExpenseCategory.other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold">Description *</Label>
              <Input
                placeholder="e.g. Monthly rent payment"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                data-ocid="expenses.description_input"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={form.amountRupees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amountRupees: e.target.value }))
                }
                data-ocid="expenses.amount_input"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="expenses.date_input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="expenses.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#B8924A] hover:bg-[#9a7a3e] text-white"
              onClick={handleSubmit}
              disabled={saving}
              data-ocid="expenses.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editId !== null ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
