import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, LogOut, User, UserCheck } from "lucide-react";
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
      .then((first) => setIsFirstUser(first))
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
      await actor.saveCallerUserProfile({ name: name.trim(), role } as any);
      toast.success(
        isFirstUser
          ? "স্বাগতম! আপনি Super Admin হিসেবে সেট হয়েছেন।"
          : "Profile তৈরি হয়েছে! Admin আপনার role পরিবর্তন করতে পারবেন।",
      );
      onComplete();
    } catch {
      toast.error("Profile save করা যায়নি। আবার চেষ্টা করুন।");
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

        <div className="bg-white rounded-2xl shadow-lg p-8">
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
                    {isFirstUser
                      ? "Owner হিসেবে সেটআপ"
                      : "আপনার Profile তৈরি করুন"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isFirstUser
                      ? "আপনি প্রথম user — আপনি Super Admin হবেন"
                      : "আপনাকে Staff হিসেবে যোগ করা হবে"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>আপনার নাম</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="যেমন: Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                      autoFocus
                      data-ocid="setup.input"
                    />
                  </div>
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
                      ? "আপনি Super Admin হিসেবে সেট হবেন — সব feature-এ access থাকবে"
                      : "আপনাকে Staff হিসেবে যোগ করা হবে। Admin আপনার role পরিবর্তন করতে পারবেন।"}
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
                  {isFirstUser ? "শুরু করুন" : "Setup Complete"}
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
