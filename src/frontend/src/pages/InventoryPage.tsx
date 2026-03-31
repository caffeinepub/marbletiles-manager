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
import { Loader2, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { formatINR, rupeesToPaise } from "../lib/formatting";
import { logAudit } from "../utils/audit";

// Encode extra fields into qrCode: SKU||SEP||size||SEP||unit||SEP||supplier
function encodeExtra(
  sku: string,
  size: string,
  unit: string,
  supplier: string,
) {
  return [sku, size, unit, supplier].join("||SEP||");
}
function decodeExtra(qrCode: string) {
  const parts = qrCode.split("||SEP||");
  return {
    sku: parts[0] || "",
    size: parts[1] || "",
    unit: parts[2] || "sqft",
    supplier: parts[3] || "",
  };
}

const CUSTOM_CATEGORIES_KEY = "rrmh_custom_categories";
function getCustomCategories(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveCustomCategories(cats: string[]) {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
}

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; cardBg: string }
> = {
  marble: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    cardBg: "bg-stone-200",
  },
  granite: { bg: "bg-blue-100", text: "text-blue-800", cardBg: "bg-slate-300" },
  tile: { bg: "bg-sky-100", text: "text-sky-800", cardBg: "bg-sky-100" },
  travertine: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    cardBg: "bg-yellow-200",
  },
  onyx: {
    bg: "bg-orange-200",
    text: "text-orange-900",
    cardBg: "bg-amber-500",
  },
  other: { bg: "bg-gray-100", text: "text-gray-700", cardBg: "bg-gray-200" },
};
function getCategoryStyle(cat: string) {
  return (
    CATEGORY_STYLES[cat] ?? {
      bg: "bg-purple-100",
      text: "text-purple-800",
      cardBg: "bg-purple-200",
    }
  );
}

const emptyForm = () => ({
  name: "",
  sku: "",
  category: "marble" as string,
  customCategory: "",
  size: "",
  unit: "sqft",
  costPriceStr: "0",
  sellingPriceStr: "0",
  currentStockStr: "500",
  minStockAlertStr: "100",
  supplier: "",
});

export default function InventoryPage() {
  const { actor, isFetching } = useActor();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [stockModal, setStockModal] = useState<Product | null>(null);
  const [stockAdjustStr, setStockAdjustStr] = useState("0");
  const [stockAdjustType, setStockAdjustType] = useState<"add" | "reduce">(
    "add",
  );
  const [customCategories, setCustomCategories] = useState<string[]>(
    getCustomCategories(),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState<Product | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers reload
  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getAllProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [actor, isFetching, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const allCategories = [
    "marble",
    "granite",
    "tile",
    "travertine",
    "onyx",
    "other",
    ...customCategories,
  ];

  const filtered = products.filter((p) => {
    const extra = decodeExtra(p.qrCode);
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      extra.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "all" ||
      (p.category as unknown as string) === categoryFilter;
    const isLow = Number(p.currentStock) <= Number(p.minStockAlert);
    if (!matchSearch || !matchCat) return false;
    if (lowStockOnly && !isLow) return false;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const extra = decodeExtra(p.qrCode);
    setForm({
      name: p.name,
      sku: extra.sku,
      category: p.category as unknown as string,
      customCategory: "",
      size: extra.size,
      unit: extra.unit || "sqft",
      costPriceStr: "0",
      sellingPriceStr: (Number(p.basePrice) / 100).toString(),
      currentStockStr: String(p.currentStock),
      minStockAlertStr: String(p.minStockAlert),
      supplier: extra.supplier,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor) return;
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    try {
      const finalCat =
        form.category === "__custom__" ? form.customCategory : form.category;
      const productData: Product = {
        id: editing ? editing.id : 0n,
        name: form.name.trim(),
        category: finalCat as unknown as ProductCategory,
        currentStock: BigInt(Number.parseInt(form.currentStockStr) || 0),
        basePrice: rupeesToPaise(form.sellingPriceStr),
        minStockAlert: BigInt(Number.parseInt(form.minStockAlertStr) || 0),
        qrCode: encodeExtra(form.sku, form.size, form.unit, form.supplier),
        createdAt: editing ? editing.createdAt : 0n,
      };
      if (editing) {
        await actor.updateProduct(editing.name, productData);
        logAudit("UPDATE_PRODUCT", `Updated: ${form.name}`);
        toast.success("Product updated");
      } else {
        await actor.addProduct(productData);
        logAudit("ADD_PRODUCT", `Added: ${form.name}`);
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

  const handleStockAdjust = async () => {
    if (!actor || !stockModal) return;
    const amount = Number.parseInt(stockAdjustStr) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const newStock =
      stockAdjustType === "add"
        ? stockModal.currentStock + BigInt(amount)
        : stockModal.currentStock - BigInt(amount);
    if (newStock < 0n) {
      toast.error("Stock cannot go below 0");
      return;
    }
    setSaving(true);
    try {
      await actor.updateProduct(stockModal.name, {
        ...stockModal,
        currentStock: newStock,
      });
      toast.success(
        `Stock ${stockAdjustType === "add" ? "added" : "reduced"} successfully`,
      );
      setStockModal(null);
      reload();
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleting) return;
    setSaving(true);
    try {
      await actor.updateProduct(deleting.name, {
        ...deleting,
        currentStock: 0n,
        minStockAlert: 0n,
      });
      logAudit("DELETE_PRODUCT", `Deleted: ${deleting.name}`);
      toast.success("Product removed");
      setDeleting(null);
      reload();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Inventory</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage marble, tile &amp; stone stock
          </p>
        </div>
        <Button
          className="text-white font-medium"
          style={{ backgroundColor: "#B8924A" }}
          onClick={openCreate}
          data-ocid="inventory.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> + Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            className="pl-9 bg-white w-52 border-stone-200"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm bg-white text-stone-700"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low Stock Only
        </label>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No products found.</p>
          <Button
            className="mt-4 text-white"
            style={{ backgroundColor: "#B8924A" }}
            onClick={openCreate}
          >
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => {
            const extra = decodeExtra(p.qrCode);
            const isLow =
              Number(p.currentStock) > 0 &&
              Number(p.currentStock) <= Number(p.minStockAlert);
            const isOut = Number(p.currentStock) === 0;
            const style = getCategoryStyle(p.category as unknown as string);
            const catLabel = (p.category as unknown as string).toUpperCase();
            return (
              <div
                key={String(p.id)}
                className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden flex flex-col"
              >
                <div
                  className={`relative h-28 ${style.cardBg} flex items-center justify-center overflow-hidden`}
                >
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded ${style.bg} ${style.text}`}
                  >
                    {catLabel}
                  </span>
                  {isOut && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-red-700 text-white">
                      OUT OF STOCK
                    </span>
                  )}
                  {!isOut && isLow && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-red-700 text-white">
                      LOW STOCK
                    </span>
                  )}
                  {/* Decorative tile pattern */}
                  <svg
                    aria-hidden="true"
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    style={{ opacity: 0.3 }}
                  >
                    <line
                      x1="0"
                      y1="40"
                      x2="80"
                      y2="40"
                      stroke="white"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="0"
                      x2="40"
                      y2="80"
                      stroke="white"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="80"
                      y2="80"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="80"
                      y1="0"
                      x2="0"
                      y2="80"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-semibold text-stone-800 text-sm leading-tight">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {extra.sku || "—"}
                    {extra.size ? ` · ${extra.size}` : ""}
                  </p>
                  <p className="text-amber-600 font-semibold text-sm mt-1.5">
                    {formatINR(p.basePrice)}
                    {extra.unit ? `/${extra.unit}` : ""}
                  </p>
                  <p
                    className={`text-[12px] mt-0.5 ${isOut ? "text-red-600 font-semibold" : isLow ? "text-amber-600" : "text-green-600"}`}
                  >
                    {String(p.currentStock)} {extra.unit || ""} available
                  </p>
                  <div className="flex gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="flex-1 border border-stone-200 rounded text-xs py-1 text-stone-600 hover:bg-stone-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStockModal(p);
                        setStockAdjustStr("0");
                        setStockAdjustType("add");
                      }}
                      className="flex-1 border border-green-200 rounded text-xs py-1 text-green-700 hover:bg-green-50"
                    >
                      Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      className="border border-red-200 rounded text-xs py-1 px-2 text-red-400 hover:bg-red-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" data-ocid="inventory.modal">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                PRODUCT NAME *
              </Label>
              <Input
                className="mt-1"
                placeholder="e.g. Statuario White"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                SKU CODE
              </Label>
              <Input
                className="mt-1"
                placeholder="e.g. MRB-STW-01"
                value={form.sku}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sku: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                CATEGORY *
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">
                    + Add custom category...
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.category === "__custom__" && (
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="New category name"
                    value={form.customCategory}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, customCategory: e.target.value }))
                    }
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const cat = form.customCategory.trim().toLowerCase();
                      if (!cat) return;
                      const updated = [...customCategories, cat];
                      setCustomCategories(updated);
                      saveCustomCategories(updated);
                      setForm((p) => ({
                        ...p,
                        category: cat,
                        customCategory: "",
                      }));
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                SIZE
              </Label>
              <Input
                className="mt-1"
                placeholder="e.g. 24x24 inches"
                value={form.size}
                onChange={(e) =>
                  setForm((p) => ({ ...p, size: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                UNIT
              </Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqft">sqft</SelectItem>
                  <SelectItem value="sqm">sqm</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                  <SelectItem value="slab">slab</SelectItem>
                  <SelectItem value="piece">piece</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                COST PRICE (₹) *
              </Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="120"
                value={form.costPriceStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, costPriceStr: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                SELLING PRICE (₹) *
              </Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="185"
                value={form.sellingPriceStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sellingPriceStr: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                STOCK QUANTITY *
              </Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                placeholder="500"
                value={form.currentStockStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, currentStockStr: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                LOW STOCK ALERT (QTY)
              </Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                placeholder="100"
                value={form.minStockAlertStr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minStockAlertStr: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-500">
                SUPPLIER
              </Label>
              <Input
                className="mt-1"
                placeholder="Supplier name"
                value={form.supplier}
                onChange={(e) =>
                  setForm((p) => ({ ...p, supplier: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#B8924A" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {editing ? "Save" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Modal */}
      <Dialog
        open={!!stockModal}
        onOpenChange={(v) => {
          if (!v) setStockModal(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {stockModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-stone-500">
              Current stock:{" "}
              <span className="font-semibold text-stone-800">
                {String(stockModal?.currentStock ?? 0)}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStockAdjustType("add")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  stockAdjustType === "add"
                    ? "bg-green-600 text-white border-green-600"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                <Plus className="w-4 h-4" /> Add Stock
              </button>
              <button
                type="button"
                onClick={() => setStockAdjustType("reduce")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  stockAdjustType === "reduce"
                    ? "bg-red-600 text-white border-red-600"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                <Minus className="w-4 h-4" /> Reduce Stock
              </button>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                value={stockAdjustStr}
                onChange={(e) => setStockAdjustStr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockModal(null)}>
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{
                backgroundColor:
                  stockAdjustType === "add" ? "#16a34a" : "#dc2626",
              }}
              onClick={handleStockAdjust}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> Delete Product
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600 py-2">
            Are you sure you want to delete <strong>{deleting?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
