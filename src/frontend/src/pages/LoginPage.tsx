import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { loginLocal } from "../hooks/useLocalAuth";

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = loginLocal(username.trim(), password);
    setLoading(false);
    if (result.success) {
      onLogin();
    } else {
      setError(result.error ?? "Login failed");
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
            src="/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg"
            className="w-32 h-32 rounded-2xl object-cover shadow-lg mb-4"
            alt="Radha Rani Marble House"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-2xl font-bold" style={{ color: "#B8924A" }}>
            RADHA RANI MARBLE HOUSE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where Luxury Meets Stone
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Dashboard-এ প্রবেশ করুন
            </h2>
            <p className="text-sm text-muted-foreground">
              আপনার username ও password দিন
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username লিখুন"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="password লিখুন"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                data-ocid="login.input"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center font-medium">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full text-white font-semibold py-3"
              style={{ backgroundColor: "#B8924A" }}
              disabled={loading}
              data-ocid="login.submit_button"
            >
              {loading ? "Loading..." : "Login করুন"}
            </Button>
          </form>

          <div
            className="rounded-lg p-3 text-xs text-center"
            style={{ backgroundColor: "#B8924A15" }}
          >
            <p className="font-medium" style={{ color: "#B8924A" }}>
              Admin: radharanim123 / radha123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
