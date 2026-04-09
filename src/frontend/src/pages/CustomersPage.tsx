import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Edit2, Loader2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { formatDate, formatINR } from "../lib/formatting";
import type { Customer, Sale } from "../types";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  address: "",
  outstandingBalance: "",
});

export default function CustomersPage() {
  const { actor, isFetching } = useActor();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is intentional
  useEffect(() => {
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([actor.getAllCustomers(), actor.getAllSales()])
      .then(([custs, s]) => {
        setCustomers(custs);
        setSales(s);
      })
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
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
      outstandingBalance: (Number(c.outstandingDue) / 100).toFixed(2),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const balancePaise = BigInt(
          Math.round(Number(form.outstandingBalance || "0") * 100),
        );
        await actor.updateCustomer(editing.id, {
          ...editing,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          outstandingDue: balancePaise,
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

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setDeleting(true);
    try {
      await (actor as any).deleteCustomer(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      reload();
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const custSales = ledgerCustomer
    ? sales
        .filter((s) => s.customerId === ledgerCustomer.id)
        .sort((a, b) => Number(b.createdAt - a.createdAt))
    : [];

  const totalCustomers = customers.length;
  const totalDue = customers.reduce((s, c) => s + c.outstandingDue, 0n);
  const totalPurchases = customers.reduce((s, c) => s + c.totalPurchases, 0n);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer database
          </p>
        </div>
        <Button
          className="text-white flex-shrink-0"
          style={{ backgroundColor: "#B8924A" }}
          onClick={openCreate}
          data-ocid="customers.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Customer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Customers",
            value: String(totalCustomers),
            icon: <Users className="w-4 h-4" />,
          },
          {
            label: "Total Purchases",
            value: formatINR(totalPurchases),
            icon: null,
          },
          { label: "Outstanding Dues", value: formatINR(totalDue), icon: null },
        ].map((c) => (
          <Card
            key={c.label}
            className="bg-white shadow-card border-0 rounded-xl"
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p
                className="text-lg font-bold mt-1"
                style={{ color: "#B8924A" }}
              >
                {c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 bg-white"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="customers.search_input"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2" data-ocid="customers.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    NAME
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden sm:table-cell">
                    PHONE
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">
                    EMAIL
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    TOTAL PURCHASES
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    OUTSTANDING
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                    ACTIONS
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
                      <p className="font-medium">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {c.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatINR(c.totalPurchases)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.outstandingDue > 0n ? (
                        <span className="text-red-600 font-semibold">
                          {formatINR(c.outstandingDue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(c)}
                          data-ocid={`customers.edit_button.${i + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLedgerCustomer(c)}
                          data-ocid={`customers.open_modal_button.${i + 1}`}
                        >
                          Ledger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(c)}
                          data-ocid={`customers.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-ocid="customers.dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: "Name *", key: "name", placeholder: "Customer name" },
              { label: "Phone", key: "phone", placeholder: "+91 98765 43210" },
              {
                label: "Email",
                key: "email",
                placeholder: "customer@example.com",
              },
              { label: "Address", key: "address", placeholder: "Full address" },
            ].map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  className="mt-1"
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  data-ocid="customers.input"
                />
              </div>
            ))}
            {editing && (
              <div>
                <Label>Outstanding Balance (₹)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.outstandingBalance}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      outstandingBalance: e.target.value,
                    }))
                  }
                  data-ocid="customers.balance_input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Manually adjust the outstanding balance for this customer.
                </p>
              </div>
            )}
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
              data-ocid="customers.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editing ? "Update" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="customers.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              data-ocid="customers.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
              data-ocid="customers.confirm_button"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ledger Dialog */}
      <Dialog
        open={!!ledgerCustomer}
        onOpenChange={(v) => !v && setLedgerCustomer(null)}
      >
        <DialogContent className="max-w-2xl" data-ocid="customers.modal">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Ledger — {ledgerCustomer?.name}</DialogTitle>
            </div>
          </DialogHeader>
          {ledgerCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground">Total Purchases</p>
                  <p className="font-bold text-lg" style={{ color: "#B8924A" }}>
                    {formatINR(ledgerCustomer.totalPurchases)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground">Outstanding Due</p>
                  <p className="font-bold text-lg text-red-600">
                    {formatINR(ledgerCustomer.outstandingDue)}
                  </p>
                </div>
              </div>
              {custSales.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">
                  No invoices found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          Invoice
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-right py-2 font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-right py-2 font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {custSales.map((s, i) => (
                        <tr
                          key={String(s.id)}
                          className="border-b border-border last:border-0"
                          data-ocid={`customers.row.${i + 1}`}
                        >
                          <td
                            className="py-2 font-medium"
                            style={{ color: "#B8924A" }}
                          >
                            {s.invoiceNumber}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {formatDate(s.createdAt)}
                          </td>
                          <td className="py-2 text-right">
                            {formatINR(s.grandTotal)}
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                s.paymentStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : s.paymentStatus === "unpaid"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
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
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLedgerCustomer(null)}
              data-ocid="customers.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
