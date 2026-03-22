import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wallet, Users, Receipt, ArrowRight } from "lucide-react";
import { useState } from "react";

export function AuthPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [signingIn, setSigningIn] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn("google");
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            HangoutPay
          </h1>
          <p className="max-w-sm text-lg text-muted-foreground">
            Split expenses effortlessly with friends. Track who owes what, settle
            up, and keep your group trips stress-free.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mb-10 grid w-full max-w-sm gap-3">
          <FeatureRow
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Group Trips"
            description="Create trips and invite friends"
          />
          <FeatureRow
            icon={<Receipt className="h-5 w-5 text-primary" />}
            title="Smart Splitting"
            description="Split bills equally or custom amounts"
          />
          <FeatureRow
            icon={<ArrowRight className="h-5 w-5 text-primary" />}
            title="Easy Settlements"
            description="Optimized payments to settle debts"
          />
        </div>

        {/* Sign-in Card */}
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {signingIn ? "Signing in..." : "Continue with Google"}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
