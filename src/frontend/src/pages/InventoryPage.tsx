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
import { Edit2, Loader2, Plus, QrCode, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Product, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatINR, rupeesToPaise } from "../lib/formatting";
import { useQRScanner } from "../qr-code/useQRScanner";
import { logAudit } from "../utils/audit";

const emptyForm = () => ({
  name: "",
  category: ProductCategory.marble as ProductCategory,
  currentStockStr: "0",
  basePriceStr: "0",
  minStockAlertStr: "10",
  qrCode: "",
});

const categoryColor = (c: string) => {
  if (c === "marble") return "bg-blue-100 text-blue-700";
  if (c === "tile") return "bg-green-100 text-green-700";
  if (c === "granite") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-700";
};

function QRScanModal({
  onScan,
  onClose,
}: { onScan: (data: string) => void; onClose: () => void }) {
  const scanner = useQRScanner({
    facingMode: "environment",
    scanInterval: 200,
    maxResults: 1,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: scanner functions are stable on mount
  useEffect(() => {
    scanner.startScanning();
    return () => {
      scanner.stopScanning();
    };
  }, []);

  useEffect(() => {
    if (scanner.qrResults.length > 0) {
      onScan(scanner.qrResults[0].data);
    }
  }, [scanner.qrResults, onScan]);

  return (
    <div className="space-y-3">
      {scanner.error ? (
        <p className="text-sm text-destructive">
          Camera error: {scanner.error.message}
        </p>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            ref={scanner.videoRef}
            style={{ width: "100%", height: 240 }}
            playsInline
            muted
          />
          <canvas ref={scanner.canvasRef} style={{ display: "none" }} />
          {scanner.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional reload trigger
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getAllProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.qrCode.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "low")
      return p.currentStock <= p.minStockAlert && p.currentStock > 0n;
    if (filter === "out") return p.currentStock === 0n;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      currentStockStr: String(p.currentStock),
      basePriceStr: (Number(p.basePrice) / 100).toString(),
      minStockAlertStr: String(p.minStockAlert),
      qrCode: p.qrCode,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !identity) return;
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    try {
      const productData: Product = {
        id: editing ? editing.id : 0n,
        name: form.name.trim(),
        category: form.category,
        currentStock: BigInt(Number.parseInt(form.currentStockStr) || 0),
        basePrice: rupeesToPaise(form.basePriceStr),
        minStockAlert: BigInt(Number.parseInt(form.minStockAlertStr) || 0),
        qrCode: form.qrCode,
        createdAt: editing ? editing.createdAt : 0n,
      };
      if (editing) {
        await actor.updateProduct(editing.name, productData);
        logAudit("UPDATE_PRODUCT", `Updated product: ${form.name}`);
        toast.success("Product updated");
      } else {
        await actor.addProduct(productData);
        logAudit("ADD_PRODUCT", `Added product: ${form.name}`);
        toast.success("Product added");
      }
      setOpen(false);
      reload();
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleQRScan = (data: string) => {
    setQrOpen(false);
    setSearch(data);
    toast.success(`QR scanned: ${data}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="inventory.search_input"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrOpen(true)}
            title="Scan QR Code"
            data-ocid="inventory.upload_button"
          >
            <QrCode className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["all", "low", "out"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:bg-muted"
                }`}
                data-ocid={`inventory.toggle.${f}`}
              >
                {f === "all"
                  ? "All"
                  : f === "low"
                    ? "Low Stock"
                    : "Out of Stock"}
              </button>
            ))}
          </div>
          <Button
            className="text-white flex-shrink-0"
            style={{ backgroundColor: "#B8924A" }}
            onClick={openCreate}
            data-ocid="inventory.add_button"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" data-ocid="inventory.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center shadow-card"
          data-ocid="inventory.empty_state"
        >
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Stock
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={String(p.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`inventory.item.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.qrCode && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.qrCode}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColor(p.category)}`}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatINR(p.basePrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          p.currentStock === 0n
                            ? "text-red-600 font-semibold"
                            : p.currentStock <= p.minStockAlert
                              ? "text-amber-600 font-semibold"
                              : "text-foreground"
                        }
                      >
                        {String(p.currentStock)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                        data-ocid={`inventory.edit_button.${i + 1}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm" data-ocid="inventory.dialog">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          {qrOpen && (
            <QRScanModal
              onScan={handleQRScan}
              onClose={() => setQrOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-ocid="inventory.modal">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Product Name</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                data-ocid="inventory.input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as ProductCategory }))
                }
              >
                <SelectTrigger className="mt-1" data-ocid="inventory.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProductCategory.marble}>Marble</SelectItem>
                  <SelectItem value={ProductCategory.tile}>Tile</SelectItem>
                  <SelectItem value={ProductCategory.granite}>
                    Granite
                  </SelectItem>
                  <SelectItem value={ProductCategory.other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>QR / Lot Code</Label>
              <Input
                className="mt-1"
                placeholder="e.g. LOT-001"
                value={form.qrCode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, qrCode: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Base Price (&#8377;/unit)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                value={form.basePriceStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, basePriceStr: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Current Stock</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                value={form.currentStockStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, currentStockStr: e.target.value }))
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Low Stock Alert At</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                value={form.minStockAlertStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minStockAlertStr: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="inventory.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleSave}
              disabled={saving}
              data-ocid="inventory.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editing ? "Update" : "Add"} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
