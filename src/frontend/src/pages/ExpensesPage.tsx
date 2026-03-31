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
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Expense, ExpenseCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";

const catLabel: Record<string, string> = {
  labour: "Labour",
  electricity: "Electricity",
  transport: "Transport",
  rent: "Rent",
  other: "Other",
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
  category: ExpenseCategory.other as ExpenseCategory,
  description: "",
  amountRupees: "",
  date: new Date().toISOString().split("T")[0],
});

export default function ExpensesPage() {
  const { actor, isFetching } = useActor();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<bigint | null>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is intentional
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getAllExpenses()
      .then((e) => setExpenses(e.sort((a, b) => Number(b.date - a.date))))
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const filtered =
    catFilter === "all"
      ? expenses
      : expenses.filter((e) => e.category === catFilter);

  const total = expenses.reduce((s, e) => s + e.amount, 0n);
  const byCategory = (cat: string) =>
    expenses
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + e.amount, 0n);

  const handleSave = async () => {
    if (!actor) return;
    if (!form.amountRupees || !form.description) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    try {
      await actor.addExpense({
        id: 0n,
        category: form.category,
        description: form.description,
        amount: rupeesToPaise(form.amountRupees),
        date: 0n,
        recordedBy: Principal.anonymous(),
      });
      toast.success("Expense added");
      setOpen(false);
      setForm(emptyForm());
      reload();
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    setDeleting(id);
    try {
      await actor.deleteExpense(id);
      toast.success("Expense deleted");
      reload();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track business expenses by category
          </p>
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
          data-ocid="expenses.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white shadow-card border-0 rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold mt-1 text-red-600">
              {formatINR(total)}
            </p>
          </CardContent>
        </Card>
        {Object.entries(catLabel).map(([key, label]) => (
          <Card key={key} className="bg-white shadow-card border-0 rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className="text-lg font-bold mt-1"
                style={{ color: "#B8924A" }}
              >
                {formatINR(byCategory(key))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Select value={catFilter} onValueChange={setCatFilter}>
        <SelectTrigger className="w-44 bg-white" data-ocid="expenses.select">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {Object.entries(catLabel).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Table */}
      {loading ? (
        <div className="space-y-2" data-ocid="expenses.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="expenses.empty_state"
        >
          <p className="text-muted-foreground">No expenses found.</p>
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
                    CATEGORY
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden sm:table-cell">
                    DESCRIPTION
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    AMOUNT
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={String(e.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`expenses.item.${i + 1}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3">{catBadge(e.category)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {formatINR(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={deleting === e.id}
                        onClick={() => handleDelete(e.id)}
                        data-ocid={`expenses.delete_button.${i + 1}`}
                      >
                        {deleting === e.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-ocid="expenses.dialog">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    category: v as ExpenseCategory,
                  }))
                }
              >
                <SelectTrigger className="mt-1" data-ocid="expenses.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(catLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Monthly electricity bill"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                data-ocid="expenses.input"
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amountRupees}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amountRupees: e.target.value }))
                }
                data-ocid="expenses.input"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
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
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleSave}
              disabled={saving}
              data-ocid="expenses.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
