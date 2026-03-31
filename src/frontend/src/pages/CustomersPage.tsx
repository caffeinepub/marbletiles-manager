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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit2,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Customer } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatINR } from "../lib/formatting";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  address: "",
});

export default function CustomersPage() {
  const { actor, isFetching } = useActor();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional reload trigger
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getAllCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalWithDue = customers.filter((c) => c.outstandingDue > 0n).length;
  const totalDueAmount = customers.reduce(
    (sum, c) => sum + c.outstandingDue,
    0n,
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor) return;
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await actor.updateCustomer(editing.id, {
          ...editing,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        });
        toast.success("Customer updated");
      } else {
        await actor.addCustomer({
          id: 0n,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          totalPurchases: 0n,
          outstandingDue: 0n,
          createdAt: 0n,
        });
        toast.success("Customer added");
      }
      setOpen(false);
      reload();
    } catch {
      toast.error("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const whatsappReminder = (c: Customer) => {
    const phone = c.phone.replace(/\D/g, "");
    const amount = (Number(c.outstandingDue) / 100).toFixed(2);
    const msg = encodeURIComponent(
      `Dear ${c.name}, you have an outstanding due of \u20B9${amount} at RADHA RANI MARBLE HOUSE. Please clear at your earliest. Thank you.`,
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#B8924A20" }}
            >
              <Users className="w-5 h-5" style={{ color: "#B8924A" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-xl font-bold text-foreground">
                {customers.length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50">
              <span className="text-red-500 font-bold text-sm">&#8377;</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Due</p>
              <p className="text-xl font-bold text-red-600">
                {formatINR(totalDueAmount)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
              <span className="text-amber-500 font-bold text-sm">#</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Dues</p>
              <p className="text-xl font-bold text-amber-600">
                {totalWithDue} customers
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="customers.search_input"
          />
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={openCreate}
          data-ocid="customers.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Customer
        </Button>
      </div>

      {loading ? (
        <div data-ocid="customers.loading_state" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="customers.empty_state"
        >
          <p className="text-muted-foreground">No customers found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Total Purchases
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Outstanding
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={String(c.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`customers.item.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.address}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-foreground">{c.phone}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {formatINR(c.totalPurchases)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.outstandingDue > 0n ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {formatINR(c.outstandingDue)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Cleared
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.outstandingDue > 0n && c.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => whatsappReminder(c)}
                            data-ocid={`customers.secondary_button.${i + 1}`}
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          data-ocid={`customers.edit_button.${i + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
        <DialogContent className="max-w-md" data-ocid="customers.dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Name</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                data-ocid="customers.input"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                className="mt-1"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="customers.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleSave}
              disabled={saving}
              data-ocid="customers.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editing ? "Update" : "Add"} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
