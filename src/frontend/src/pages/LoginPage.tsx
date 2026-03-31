import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

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
            className="w-32 h-32 rounded-2xl object-cover shadow-lg mb-4"
            alt="Radha Rani Marble House"
          />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Radha Rani Marble House
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where Luxury Meets Stone
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to access your shop management dashboard.
          </p>

          <Button
            className="w-full text-white font-semibold"
            style={{ backgroundColor: "#B8924A" }}
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="login.primary_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" /> Sign In Securely
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Secured by Internet Identity — no passwords required
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
