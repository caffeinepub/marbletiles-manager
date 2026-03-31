import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, LogOut, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onComplete: () => void;
}

export default function SetupProfilePage({ onComplete }: Props) {
  const { actor } = useActor();
  const { clear } = useInternetIdentity();
  const [name, setName] = useState("");
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!actor) return;
    actor
      .isFirstUser()
      .then(setIsFirstUser)
      .catch(() => setIsFirstUser(false));
  }, [actor]);

  const handleSetup = async () => {
    if (!actor) return;
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSaving(true);
    try {
      const role = isFirstUser ? "superadmin" : "staff";
      await actor.saveCallerUserProfile({ name: name.trim(), role });
      toast.success(
        isFirstUser
          ? "Welcome! You are now set up as Super Admin."
          : "Profile created! You are now set up as Staff.",
      );
      onComplete();
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F3F0EA" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/file-019d443c-2e5b-744a-80bb-f49f214ea06a.jpg"
            className="w-20 h-20 rounded-2xl object-cover shadow-lg mb-4"
            alt="Radha Rani Marble House"
          />
          <h1 className="text-xl font-bold text-foreground">
            Radha Rani Marble House
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-8">
          {isFirstUser === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isFirstUser ? "#B8924A" : "#E8F5E9",
                  }}
                >
                  {isFirstUser ? (
                    <Crown className="w-5 h-5 text-white" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-green-700" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold">
                    {isFirstUser ? "Set Up as Owner" : "Create Your Profile"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isFirstUser
                      ? "You are the first user — you will become Super Admin"
                      : "You will be added as Staff (admin can upgrade your role)"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Your Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                    autoFocus
                    data-ocid="setup.name_input"
                  />
                </div>

                <div
                  className="rounded-lg p-3 text-xs"
                  style={{ backgroundColor: "#B8924A15" }}
                >
                  <p className="font-medium" style={{ color: "#B8924A" }}>
                    Role: {isFirstUser ? "Super Admin" : "Staff"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {isFirstUser
                      ? "Full access to all features including settings, reports, and user management"
                      : "Access to billing and stock check. Super Admin can upgrade your role."}
                  </p>
                </div>

                <Button
                  className="w-full text-white font-semibold"
                  style={{ backgroundColor: "#B8924A" }}
                  onClick={handleSetup}
                  disabled={saving}
                  data-ocid="setup.submit_button"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isFirstUser ? "Set Up My Account" : "Create Profile"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center mt-4">
          <button
            type="button"
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={clear}
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
