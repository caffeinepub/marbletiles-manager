import { Button } from "@/components/ui/button";
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
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Expense, ExpenseCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatDate, formatINR, rupeesToPaise } from "../lib/formatting";

const catColor = (c: string) => {
  if (c === "labour") return "bg-blue-100 text-blue-700";
  if (c === "rent") return "bg-purple-100 text-purple-700";
  if (c === "transport") return "bg-green-100 text-green-700";
  if (c === "electricity") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

const emptyFormState = () => ({
  category: ExpenseCategory.other as ExpenseCategory,
  description: "",
  amountRupees: "",
  date: new Date().toISOString().split("T")[0],
});

export default function ExpensesPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyFormState());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<bigint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional reload trigger
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getAllExpenses()
      .then((all) =>
        setExpenses([...all].sort((a, b) => Number(b.date - a.date))),
      )
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyFormState());
    setOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      category: e.category,
      description: e.description,
      amountRupees: (Number(e.amount) / 100).toString(),
      date: new Date(Number(e.date) / 1_000_000).toISOString().split("T")[0],
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !identity) return;
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setSaving(true);
    try {
      const amount = rupeesToPaise(form.amountRupees || "0");
      const dateMs = new Date(form.date).getTime();
      const dateNano = BigInt(dateMs) * 1_000_000n;
      if (editing) {
        await actor.updateExpense(editing.id, {
          ...editing,
          category: form.category,
          description: form.description,
          amount,
          date: dateNano,
        });
        toast.success("Expense updated");
      } else {
        await actor.addExpense({
          id: 0n,
          category: form.category,
          description: form.description,
          amount,
          date: dateNano,
          recordedBy: identity.getPrincipal(),
        });
        toast.success("Expense added");
      }
      setOpen(false);
      reload();
    } catch {
      toast.error("Failed to save expense");
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

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0n);
  const categories = [
    ExpenseCategory.labour,
    ExpenseCategory.electricity,
    ExpenseCategory.rent,
    ExpenseCategory.transport,
    ExpenseCategory.other,
  ];
  const catTotals = categories.map((cat) => ({
    cat,
    total: expenses
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + e.amount, 0n),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="text-white"
          style={{ backgroundColor: "#B8924A" }}
          onClick={openCreate}
          data-ocid="expenses.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            className="bg-white rounded-xl shadow-card p-4 border-l-4"
            style={{ borderLeftColor: "#B8924A" }}
          >
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-base font-bold" style={{ color: "#B8924A" }}>
              {formatINR(totalAmount)}
            </p>
          </div>
          {catTotals.map(({ cat, total }) => (
            <div key={cat} className="bg-white rounded-xl shadow-card p-4">
              <p className="text-xs text-muted-foreground capitalize">{cat}</p>
              <p className="text-base font-bold text-foreground">
                {formatINR(total)}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div data-ocid="expenses.loading_state" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="expenses.empty_state"
        >
          <p className="text-muted-foreground">No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr
                    key={String(e.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`expenses.item.${i + 1}`}
                  >
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${catColor(e.category)}`}
                      >
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatINR(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(e)}
                          data-ocid={`expenses.edit_button.${i + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                          data-ocid={`expenses.delete_button.${i + 1}`}
                        >
                          {deleting === e.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-ocid="expenses.dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                data-ocid="expenses.input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as ExpenseCategory }))
                }
              >
                <SelectTrigger className="mt-1" data-ocid="expenses.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExpenseCategory.labour}>Labour</SelectItem>
                  <SelectItem value={ExpenseCategory.electricity}>
                    Electricity
                  </SelectItem>
                  <SelectItem value={ExpenseCategory.rent}>Rent</SelectItem>
                  <SelectItem value={ExpenseCategory.transport}>
                    Transport
                  </SelectItem>
                  <SelectItem value={ExpenseCategory.other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (&#8377;)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                value={form.amountRupees}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amountRupees: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
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
              data-ocid="expenses.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editing ? "Update" : "Add"} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
