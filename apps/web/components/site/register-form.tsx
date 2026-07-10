"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import { PhoneInput } from "./phone-input";
import { OtpInput } from "./otp-input";

/* Mirrors /api/account/register (code is validated on the verify step). */
const detailsSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().optional(),
  phone: z.string().min(6, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type DetailsValues = z.infer<typeof detailsSchema>;

const inputCls =
  "h-12 w-full rounded-sm border border-input bg-card px-3.5 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

/**
 * Two-step registration: 1) details → Next (requests the OTP automatically),
 * 2) 6-digit verification screen → creates the account.
 */
export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "", password: "" },
  });

  const startCooldown = () => {
    setResendIn(30);
    const timer = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) clearInterval(timer);
        return s - 1;
      });
    }, 1000);
  };

  const requestCode = async () => {
    setCodeError(null);
    setSending(true);
    try {
      const { phone, email } = getValues();
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim() }),
      });
      const d = (await res.json()) as { devCode?: string; channel?: string; sentTo?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not send the code");
      setDevCode(d.devCode ?? null);
      setSentTo(d.channel === "email" ? (d.sentTo ?? "your email") : null);
      setStep(2);
      startCooldown();
      return true;
    } catch (e) {
      setCodeError((e as Error).message);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Step 1 → validates details, then requests the OTP and advances.
  const onNext = handleSubmit(async () => {
    await requestCode();
  });

  // Step 2 → create the account.
  const createAccount = async () => {
    setCodeError(null);
    if (code.trim().length !== 6) return setCodeError("Enter the 6-digit code.");
    setCreating(true);
    try {
      const values = getValues();
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          lastName: values.lastName || undefined,
          phone: values.phone.trim(),
          code: code.trim(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Something went wrong");
      }
      router.push("/account");
      router.refresh();
    } catch (e) {
      setCodeError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* step indicator */}
      <ol className="mb-8 flex items-center justify-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
        {(["Details", "Verify"] as const).map((label, i) => {
          const n = (i + 1) as 1 | 2;
          const isActive = step === n;
          const isDone = step > n;
          return (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="h-px w-8 bg-border" />}
              <span className={cn("flex items-center gap-2", isActive ? "text-foreground" : "text-muted-foreground")}>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[0.65rem]",
                    isActive || isDone ? "border-foreground bg-foreground text-background" : "border-border",
                  )}
                >
                  {n}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <form className="flex flex-col gap-3" onSubmit={onNext}>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="First name" autoComplete="given-name" {...register("firstName")} />
            <input className={inputCls} placeholder="Last name (optional)" autoComplete="family-name" {...register("lastName")} />
          </div>
          <FieldError message={errors.firstName?.message} />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
          <FieldError message={errors.phone?.message} />
          <input className={inputCls} type="email" placeholder="Email" autoComplete="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
          <input className={inputCls} type="password" placeholder="Password (8+ characters)" autoComplete="new-password" {...register("password")} />
          <FieldError message={errors.password?.message} />
          {codeError && <p className="text-sm text-destructive">{codeError}</p>}
          <Button type="submit" variant="solid" size="lg" loading={sending} className="mt-1 w-full">
            Next
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/account/login" className="underline hover:text-foreground">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold tracking-tight">Enter the code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sentTo ? (
                <>We emailed a 6-digit code to <span className="font-semibold text-foreground">{sentTo}</span>.</>
              ) : (
                <>We sent a 6-digit code to <span className="font-semibold text-foreground">{getValues("phone")}</span>.</>
              )}
            </p>
          </div>
          <OtpInput value={code} onChange={setCode} autoFocus />
          {devCode && (
            <p className="text-center text-xs text-muted-foreground">
              Demo code: <span className="font-bold">{devCode}</span>
            </p>
          )}
          {codeError && <p className="text-center text-sm text-destructive">{codeError}</p>}
          <Button type="button" variant="solid" size="lg" loading={creating} onClick={createAccount} className="w-full">
            Verify &amp; create account
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode("");
                setCodeError(null);
              }}
              className="flex cursor-pointer items-center gap-1 underline-offset-2 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="h-3 w-3" /> Edit details
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || sending}
              onClick={requestCode}
              className="cursor-pointer underline-offset-2 hover:text-foreground hover:underline disabled:cursor-default disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
