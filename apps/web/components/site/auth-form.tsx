"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, cn, Container } from "@ecom/ui";
import { PhoneInput } from "./phone-input";
import { OtpInput } from "./otp-input";

/* Schemas mirror the API routes (login: any password; register: server rules). */
const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or phone"),
  password: z.string().min(1, "Enter your password"),
});
const registerSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().optional(),
  phone: z.string().min(6, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  code: z.string().length(4, "Enter the 4-digit code"),
});
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const inputCls =
  "h-12 w-full rounded-sm border border-input bg-card px-3.5 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Wrap a required field so a red * shows (placeholder-only inputs). */
function Req({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-destructive">*</span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError(null);
  };

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
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 cursor-pointer rounded-[3px] py-2 font-medium transition-colors",
                mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        {mode === "login" ? (
          <LoginForm error={error} setError={setError} />
        ) : (
          <RegisterForm error={error} setError={setError} />
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="cursor-pointer underline hover:text-foreground"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </Container>
  );
}

function LoginForm({ error, setError }: { error: string | null; setError: (e: string | null) => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Something went wrong");
      }
      router.push("/account");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <Req>
        <input className={inputCls} placeholder="Email or phone" autoComplete="username" {...register("identifier")} />
      </Req>
      <FieldError message={errors.identifier?.message} />
      <Req>
        <input className={inputCls} type="password" placeholder="Password" autoComplete="current-password" {...register("password")} />
      </Req>
      <FieldError message={errors.password?.message} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="solid" size="lg" loading={isSubmitting} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}

function RegisterForm({ error, setError }: { error: string | null; setError: (e: string | null) => void }) {
  const router = useRouter();
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sentByEmail, setSentByEmail] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "", password: "", code: "" },
  });

  const sendCode = async () => {
    setError(null);
    if (!(await trigger(["phone"]))) return;
    setSendingCode(true);
    try {
      const { phone, email } = getValues();
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Email included so the code can be delivered for real (Brevo) when configured.
        body: JSON.stringify({ phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}) }),
      });
      const d = (await res.json()) as { ok?: boolean; devCode?: string; channel?: string; sentTo?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not send code");
      setDevCode(d.devCode ?? null);
      setSentByEmail(d.channel === "email" ? (d.sentTo ?? "your email") : null);
      setOtpSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    if (!otpSent) return setError("Verify your phone — tap “Send code” first.");
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          lastName: values.lastName || undefined,
          phone: values.phone.trim(),
          code: values.code.trim(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Something went wrong");
      }
      router.push("/account");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-3">
        <Req>
          <input className={inputCls} placeholder="First name" autoComplete="given-name" {...register("firstName")} />
        </Req>
        <input className={inputCls} placeholder="Last name (optional)" autoComplete="family-name" {...register("lastName")} />
      </div>
      <FieldError message={errors.firstName?.message} />
      <div className="flex gap-2">
        <div className="flex-1">
          <Controller
            control={control}
            name="phone"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
        </div>
        <Button type="button" variant="outline" size="lg" loading={sendingCode} onClick={sendCode} className="shrink-0">
          {otpSent ? "Resend" : "Send code"}
        </Button>
      </div>
      <FieldError message={errors.phone?.message} />
      {otpSent && (
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="code"
            render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} />}
          />
          <FieldError message={errors.code?.message} />
          {devCode && (
            <p className="text-center text-xs text-muted-foreground">
              Demo code: <span className="font-bold">{devCode}</span>
            </p>
          )}
          {sentByEmail && (
            <p className="text-center text-xs text-muted-foreground">
              We emailed the code to <span className="font-bold">{sentByEmail}</span> — check your inbox.
            </p>
          )}
        </div>
      )}
      <Req>
        <input className={inputCls} type="email" placeholder="Email" autoComplete="email" {...register("email")} />
      </Req>
      <FieldError message={errors.email?.message} />
      <Req>
        <input className={inputCls} type="password" placeholder="Password" autoComplete="new-password" {...register("password")} />
      </Req>
      <FieldError message={errors.password?.message} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="solid" size="lg" loading={isSubmitting} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}
