import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AtSign, Check } from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function SetupUsernamePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = useQuery(api.users.current);
  const updateUsername = useMutation(api.users.updateUsername);

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill once user data loads
  const [initialized, setInitialized] = useState(false);
  if (currentUser && !initialized) {
    if (currentUser.username && !currentUser.username.startsWith("ghost_")) {
      setUsername(currentUser.username);
    }
    setInitialized(true);
  }

  const isValid = USERNAME_REGEX.test(username);
  const validationMessage = !username
    ? ""
    : username.length < 3
      ? "Must be at least 3 characters"
      : username.length > 20
        ? "Must be at most 20 characters"
        : !USERNAME_REGEX.test(username)
          ? "Only letters, numbers, and underscores allowed"
          : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    try {
      await updateUsername({ username: username.trim() });
      toast({
        title: "Username updated",
        description: `Your username is now @${username.trim()}`,
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update username",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AtSign className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            Pick a unique username so friends can find and invite you to trips.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="pl-8"
                  maxLength={20}
                  autoFocus
                />
              </div>
              {validationMessage && (
                <p className="text-xs text-destructive">{validationMessage}</p>
              )}
              {isValid && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Looks good!
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                3-20 characters. Letters, numbers, and underscores only.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Username"
              )}
            </Button>

            {currentUser?.username &&
              !currentUser.username.startsWith("ghost_") && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Skip for now
                </Button>
              )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
