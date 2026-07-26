"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, ShieldCheck, TicketPercent, X } from "lucide-react";
import { Button } from "@ecom/ui";
import { PhoneInput } from "./phone-input";
import { OtpInput } from "./otp-input";
import { DEFAULT_PHONE_CAPTURE_SETTINGS, type PhoneCaptureSettings } from "@/lib/phone-capture-settings";

const KEY = "maison_phone_prompt";
export const PHONE_RESOLVED_EVENT = "maison:phone-resolved";

/**
 * First-visit phone capture (optional). Phone → 6-digit OTP → passwordless
 * verified-phone session. On resolve (verify OR skip) it fires
 * PHONE_RESOLVED_EVENT so the promo popup can show afterwards. SMS is mocked —
 * the dev code is shown inline until a real gateway is wired. All visible copy
 * is managed from /admin/phone-popup (the "phoneCapture" SiteSetting); `enabled`
 * controls whether the popup renders at all.
 */
export function PhoneCapturePopup({ settings = DEFAULT_PHONE_CAPTURE_SETTINGS }: { settings?: PhoneCaptureSettings }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code" | "reward">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [reward, setReward] = useState<{ code: string; display: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.enabled || typeof window === "undefined" || localStorage.getItem(KEY) === "done") return;
    let cancelled = false;
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d: { loggedIn?: boolean }) => {
        if (cancelled) return;
        if (d.loggedIn) localStorage.setItem(KEY, "done");
        else setTimeout(() => !cancelled && setOpen(true), 2500);
      })
      .catch(() => !cancelled && setTimeout(() => setOpen(true), 2500));
    return () => {
      cancelled = true;
    };
  }, [settings.enabled]);

  const resolve = () => {
    localStorage.setItem(KEY, "done");
    setOpen(false);
    window.dispatchEvent(new Event(PHONE_RESOLVED_EVENT));
  };

  const sendCode = async () => {
    setError(null);
    if (phone.trim().length < 6) return setError("Enter a valid phone number.");
    setLoading(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; devCode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send code");
      setDevCode(data.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (code.trim().length !== 6) return setError("Enter the 6-digit code.");
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reward?: { code: string; display: string; message: string } | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      router.refresh(); // reflect the new logged-in session (and the applied reward)
      if (data.reward) {
        // Show the personal code before closing; localStorage is set on close.
        setReward(data.reward);
        setStep("reward");
      } else {
        resolve();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={resolve} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Get updates"
            initial={reduce ? false : { scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduce ? undefined : { scale: 0.96, y: 16, opacity: 0 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-lg bg-card p-7 text-center shadow-2xl"
          >
            <button type="button" aria-label="Close" onClick={resolve} className="absolute right-3 top-3 cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {step === "phone" ? <Phone className="h-5 w-5" /> : step === "code" ? <ShieldCheck className="h-5 w-5" /> : <TicketPercent className="h-5 w-5 text-gold" />}
            </span>

            {step === "reward" && reward ? (
              <>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">
                  {reward.display} — yours
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{reward.message}</p>
                <p className="mt-4 rounded-md border border-dashed border-gold/60 bg-gold/5 px-3 py-2.5 font-mono text-lg font-bold tracking-widest text-gold">
                  {reward.code}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  One-time use, already applied to your cart — it&rsquo;s also yours to use later at checkout.
                </p>
                <Button variant="solid" onClick={resolve} className="mt-4 w-full rounded-full">
                  Start shopping
                </Button>
              </>
            ) : step === "phone" ? (
              <>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">{settings.heading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{settings.subtext}</p>
                <div className="mt-4 flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mobile number<span className="text-destructive"> *</span>
                  </span>
                  <PhoneInput value={phone} onChange={setPhone} autoFocus />
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <Button variant="solid" loading={loading} onClick={sendCode} className="mt-3 w-full rounded-full">{settings.buttonLabel}</Button>
                <button type="button" onClick={resolve} className="mt-3 cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:underline">No thanks</button>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">{settings.codeHeading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{settings.codeSubtext.replace("{phone}", phone)}</p>
                {devCode && <p className="mt-2 rounded-sm bg-muted px-2 py-1 text-xs">Demo code: <span className="font-bold">{devCode}</span></p>}
                <div className="mt-4">
                  <OtpInput value={code} onChange={setCode} autoFocus />
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <Button variant="solid" loading={loading} onClick={verify} className="mt-3 w-full rounded-full">{settings.successText}</Button>
                <button type="button" onClick={() => setStep("phone")} className="mt-3 cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:underline">Change number</button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
