import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Lock,
  Plus,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GSTRate, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const LS_COMPANY = "rrm_company_settings";
const LS_BACKUP = "rrm_last_backup";

interface CompanySettings {
  name: string;
  gstin: string;
  phone: string;
  address: string;
  city: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
}

const defaultCompany: CompanySettings = {
  name: "Radha Rani Marble House",
  gstin: "",
  phone: "",
  address: "",
  city: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
};

export default function SettingsPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Company
  const [company, setCompany] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(LS_COMPANY);
      return saved
        ? { ...defaultCompany, ...JSON.parse(saved) }
        : defaultCompany;
    } catch {
      return defaultCompany;
    }
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // GST
  const [gstRates, setGstRates] = useState<Array<[string, GSTRate]>>([]);
  const [gstLoading, setGstLoading] = useState(true);
  const [newGstName, setNewGstName] = useState("");
  const [newGstPct, setNewGstPct] = useState("");
  const [addingGst, setAddingGst] = useState(false);
  const [deletingGst, setDeletingGst] = useState<string | null>(null);

  // Categories
  const [categories, setCategories] = useState<
    Array<[string, ProductCategory]>
  >([]);
  const [catLoading, setCatLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  // Security
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    name: string;
    username: string;
  } | null>(null);

  // Backup
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem(LS_BACKUP),
  );
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Load data
  useEffect(() => {
    if (!actor || isFetching) return;
    Promise.all([
      actor.getAllGSTRates(),
      actor.getAllProductCategories(),
      actor.getCallerUserProfile(),
    ]).then(([gst, cats, profile]) => {
      setGstRates(gst);
      setGstLoading(false);
      setCategories(cats);
      setCatLoading(false);
      if (profile)
        setMyProfile({
          name: profile.name,
          username: (profile as any).username || "",
        });
    });
  }, [actor, isFetching]);

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      // Save to localStorage
      localStorage.setItem(LS_COMPANY, JSON.stringify(company));
      // Try to save to backend if methods are available
      if (actor && (actor as any).saveCompanySettings) {
        await (actor as any).saveCompanySettings(company);
      }
      toast.success("Company settings saved");
    } catch {
      // If backend fails, localStorage save already succeeded
      toast.success("Company settings saved locally");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAddGst = async () => {
    if (!actor || !newGstName.trim() || !newGstPct) return;
    setAddingGst(true);
    try {
      await actor.addGSTRate({
        name: newGstName.trim(),
        percentage: BigInt(Math.round(Number(newGstPct) * 100)),
      });
      const updated = await actor.getAllGSTRates();
      setGstRates(updated);
      setNewGstName("");
      setNewGstPct("");
      toast.success("GST rate added");
    } catch {
      toast.error("Failed to add GST rate");
    } finally {
      setAddingGst(false);
    }
  };

  const handleDeleteGst = async (name: string) => {
    if (!actor) return;
    setDeletingGst(name);
    try {
      await actor.deleteGSTRate(name);
      setGstRates((prev) => prev.filter(([k]) => k !== name));
      toast.success("GST rate removed");
    } catch {
      toast.error("Failed to remove GST rate");
    } finally {
      setDeletingGst(null);
    }
  };

  const handleAddCat = async () => {
    if (!actor || !newCat.trim()) return;
    setAddingCat(true);
    try {
      await actor.addProductCategory(newCat.trim());
      const updated = await actor.getAllProductCategories();
      setCategories(updated);
      setNewCat("");
      toast.success("Category added");
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCat = async (name: string) => {
    if (!actor) return;
    setDeletingCat(name);
    try {
      await actor.deleteProductCategory(name);
      setCategories((prev) => prev.filter(([k]) => k !== name));
      toast.success("Category removed");
    } catch {
      toast.error("Failed to remove category");
    } finally {
      setDeletingCat(null);
    }
  };

  const handleChangePassword = async () => {
    if (!actor) return;
    if (newPwd !== confirmPwd) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingPwd(true);
    try {
      const ok = await (actor as any).verifyUserPassword(currentPwd);
      if (!ok) {
        toast.error("Current password is incorrect");
        return;
      }
      await (actor as any).setUserPassword(newPwd);
      toast.success("Password updated successfully");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSavingPwd(false);
    }
  };

  const exportJson = async () => {
    if (!actor) return;
    setExportingJson(true);
    try {
      const [sales, products, customers, payments, expenses] =
        await Promise.all([
          actor.getAllSales(),
          actor.getAllProducts(),
          actor.getAllCustomers(),
          actor.getAllPayments(),
          actor.getAllExpenses(),
        ]);
      const data = {
        sales,
        products,
        customers,
        payments,
        expenses,
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
      a.download = `radharani-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const ts = new Date().toLocaleString("en-IN");
      localStorage.setItem(LS_BACKUP, ts);
      setLastBackup(ts);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setExportingJson(false);
    }
  };

  const exportCsv = async () => {
    if (!actor) return;
    setExportingCsv(true);
    try {
      const sales = await actor.getAllSales();
      const headers = ["Invoice", "Grand Total", "Status", "Created At"];
      const rows = sales.map((s) => [
        s.invoiceNumber,
        (Number(s.grandTotal) / 100).toFixed(2),
        s.paymentStatus,
        new Date(Number(s.createdAt) / 1_000_000).toLocaleDateString("en-IN"),
      ]);
      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("CSV export failed");
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5" style={{ color: "#B8924A" }} />
        <h2 className="text-lg font-bold text-foreground">Settings</h2>
      </div>

      <Tabs defaultValue="company" data-ocid="settings.tab">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="gst">GST Rates</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        {/* Company Profile */}
        <TabsContent value="company" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: "#B8924A" }} />
                Company Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Company Name", field: "name" as const },
                { label: "GSTIN", field: "gstin" as const },
                { label: "Phone", field: "phone" as const },
                { label: "Address", field: "address" as const },
                { label: "City", field: "city" as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="mt-1"
                    value={company[field]}
                    onChange={(e) =>
                      setCompany((p) => ({ ...p, [field]: e.target.value }))
                    }
                    data-ocid={`settings.${field}.input`}
                  />
                </div>
              ))}
              <Button
                className="text-white"
                style={{ backgroundColor: "#B8924A" }}
                onClick={saveCompany}
                disabled={savingCompany}
                data-ocid="settings.save_button"
              >
                {savingCompany && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                Save Company Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: "#B8924A" }} />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                Bank details added here will appear on printed invoices in the
                payment section.
              </p>
              {[
                {
                  label: "Bank Name",
                  field: "bankName" as const,
                  placeholder: "e.g. State Bank of India",
                },
                {
                  label: "Account Number",
                  field: "accountNumber" as const,
                  placeholder: "e.g. 1234567890",
                },
                {
                  label: "IFSC Code",
                  field: "ifscCode" as const,
                  placeholder: "e.g. SBIN0001234",
                },
                {
                  label: "Branch",
                  field: "branch" as const,
                  placeholder: "e.g. Main Branch, Jaipur",
                },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="mt-1"
                    placeholder={placeholder}
                    value={company[field]}
                    onChange={(e) =>
                      setCompany((p) => ({ ...p, [field]: e.target.value }))
                    }
                    data-ocid={`settings.${field}.input`}
                  />
                </div>
              ))}
              <Button
                className="text-white"
                style={{ backgroundColor: "#B8924A" }}
                onClick={saveCompany}
                disabled={savingCompany}
                data-ocid="settings.save_button"
              >
                {savingCompany && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                Save Bank Details
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Rates */}
        <TabsContent value="gst" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" /> GST Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gstLoading ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : gstRates.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-4 text-center"
                  data-ocid="settings.empty_state"
                >
                  No GST rates configured
                </p>
              ) : (
                <div className="space-y-2">
                  {gstRates.map(([key, rate], i) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-ocid={`settings.item.${i + 1}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{rate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(Number(rate.percentage) / 100).toFixed(1)}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGst(key)}
                        disabled={deletingGst === key}
                        data-ocid={`settings.delete_button.${i + 1}`}
                      >
                        {deletingGst === key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Name (e.g. GST 18%)"
                  value={newGstName}
                  onChange={(e) => setNewGstName(e.target.value)}
                  data-ocid="settings.input"
                />
                <Input
                  placeholder="%"
                  type="number"
                  min="0"
                  max="100"
                  className="w-24"
                  value={newGstPct}
                  onChange={(e) => setNewGstPct(e.target.value)}
                />
                <Button
                  className="text-white flex-shrink-0"
                  style={{ backgroundColor: "#B8924A" }}
                  onClick={handleAddGst}
                  disabled={addingGst || !newGstName.trim() || !newGstPct}
                  data-ocid="settings.primary_button"
                >
                  {addingGst ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Product Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {catLoading ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No categories yet
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map(([key], i) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-ocid={`settings.row.${i + 1}`}
                    >
                      <p className="text-sm font-medium capitalize">{key}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCat(key)}
                        disabled={deletingCat === key}
                        data-ocid={`settings.delete_button.${i + 1}`}
                      >
                        {deletingCat === key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCat()}
                  data-ocid="settings.search_input"
                />
                <Button
                  className="text-white flex-shrink-0"
                  style={{ backgroundColor: "#B8924A" }}
                  onClick={handleAddCat}
                  disabled={addingCat || !newCat.trim()}
                  data-ocid="settings.secondary_button"
                >
                  {addingCat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myProfile && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">{myProfile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @
                    {myProfile.username ||
                      `${identity?.getPrincipal().toString().slice(0, 12)}...`}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Current Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    data-ocid="settings.password.input"
                  />
                </div>
                <div>
                  <Label className="text-xs">New Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Confirm New Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="text-white"
                style={{ backgroundColor: "#B8924A" }}
                onClick={handleChangePassword}
                disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                data-ocid="settings.submit_button"
              >
                {savingPwd && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="mt-4">
          <Card className="bg-white rounded-xl shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Data Backup & Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastBackup && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-medium">
                    Last backup: {lastBackup}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    Full Data Export (JSON)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Downloads all sales, products, customers, payments, and
                    expenses.
                  </p>
                  <Button
                    className="text-white"
                    style={{ backgroundColor: "#B8924A" }}
                    onClick={exportJson}
                    disabled={exportingJson}
                    data-ocid="settings.upload_button"
                  >
                    {exportingJson ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Export All Data (JSON)
                  </Button>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm font-medium mb-1">Sales CSV Export</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Downloads sales data as a spreadsheet-compatible CSV file.
                  </p>
                  <Button
                    variant="outline"
                    onClick={exportCsv}
                    disabled={exportingCsv}
                    data-ocid="settings.secondary_button"
                  >
                    {exportingCsv ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
