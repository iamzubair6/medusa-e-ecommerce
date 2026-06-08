"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, cn, Container } from "@ecom/ui";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identifier, setIdentifier] = useState(""); // login: email or phone
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    if (phone.trim().length < 6) return setError("Enter a valid phone number first.");
    setSendingCode(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const d = (await res.json()) as { ok?: boolean; devCode?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not send code");
      setDevCode(d.devCode ?? null);
      setOtpSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingCode(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (mode === "register" && !otpSent) return setError("Verify your phone — tap “Send code” first.");
    setBusy(true);
    try {
      const url = mode === "login" ? "/api/account/login" : "/api/account/register";
      const body =
        mode === "login"
          ? { identifier, password }
          : { firstName, lastName: lastName || undefined, phone: phone.trim(), email, password, code: code.trim() };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Something went wrong");
      }
      router.push("/account");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = "h-12 w-full rounded-sm border border-input bg-card px-3.5 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-3xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <div className="mt-6 flex rounded-sm border border-border p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={cn(
                "flex-1 cursor-pointer rounded-[3px] py-2 font-medium transition-colors",
                mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === "login" ? (
            <input className={input} placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={input} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                <input className={input} placeholder="Last name (optional)" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </div>
              <div className="flex gap-2">
                <input className={input} type="tel" inputMode="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                <Button type="button" variant="outline" size="lg" loading={sendingCode} onClick={sendCode} className="shrink-0">
                  {otpSent ? "Resend" : "Send code"}
                </Button>
              </div>
              {otpSent && (
                <div>
                  <input className={cn(input, "tracking-[0.4em]")} inputMode="numeric" maxLength={4} placeholder="4-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                  {devCode && <p className="mt-1 text-xs text-muted-foreground">Demo code: <span className="font-bold">{devCode}</span></p>}
                </div>
              )}
              <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </>
          )}
          <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="solid" size="lg" loading={busy} className="mt-1 w-full">
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            className="cursor-pointer underline hover:text-foreground"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </Container>
  );
}
