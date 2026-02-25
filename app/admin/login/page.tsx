"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error")) {
      toast.error("Invalid username or password");
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setHasAdmin(true);
        toast.error("Connection slow. Try signing in.");
      }
    }, 8000);

    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          clearTimeout(timeout);
          setHasAdmin(Boolean(d?.hasAdmin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setHasAdmin(true);
          toast.error("Could not reach server. Try signing in.");
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchParams]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/admin/topics");
    } else {
      toast.error("Registered but sign-in failed. Try logging in.");
      setHasAdmin(true);
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await Promise.race([
        signIn("credentials", {
          username,
          password,
          redirect: false,
        }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ]);

      if (result?.ok) {
        router.push("/admin/topics");
      } else {
        toast.error("Invalid username or password");
      }
    } catch {
      toast.error("Sign-in timed out. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = hasAdmin === false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {hasAdmin === null ? "MyPoll Admin" : isRegister ? "Create Admin Account" : "Admin Login"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "No admin found. Set up your account to get started."
              : "Sign in to manage polls and quizzes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAdmin === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gaurav Gambhir"
                    required
                    autoFocus
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus={!isRegister}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Min 6 characters" : "••••••••"}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isRegister ? "Creating…" : "Signing in…"}</>
                ) : (
                  isRegister ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
