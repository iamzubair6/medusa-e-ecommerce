"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, ShieldCheck, X } from "lucide-react";
import { Button } from "@ecom/ui";
import { PhoneInput } from "./phone-input";
import { OtpInput } from "./otp-input";

const KEY = "maison_phone_prompt";
export const PHONE_RESOLVED_EVENT = "maison:phone-resolved";

/**
 * First-visit phone capture (optional). Phone → 4-digit OTP → passwordless
 * verified-phone session. On resolve (verify OR skip) it fires
 * PHONE_RESOLVED_EVENT so the promo popup can show afterwards. SMS is mocked —
 * the dev code is shown inline until a real gateway is wired.
 */
export function PhoneCapturePopup() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || localStorage.getItem(KEY) === "done") return;
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
  }, []);

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
    if (code.trim().length !== 4) return setError("Enter the 4-digit code.");
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      resolve();
      router.refresh(); // reflect the new logged-in session
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
              {step === "phone" ? <Phone className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </span>

            {step === "phone" ? (
              <>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">Get 10% Off</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add your phone for offers + faster checkout. We&apos;ll text a quick code.</p>
                <div className="mt-4 flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mobile number<span className="text-destructive"> *</span>
                  </span>
                  <PhoneInput value={phone} onChange={setPhone} autoFocus />
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <Button variant="solid" loading={loading} onClick={sendCode} className="mt-3 w-full rounded-full">Send code</Button>
                <button type="button" onClick={resolve} className="mt-3 cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:underline">No thanks</button>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">Enter code</h2>
                <p className="mt-1 text-sm text-muted-foreground">We sent a 4-digit code to {phone}.</p>
                {devCode && <p className="mt-2 rounded-sm bg-muted px-2 py-1 text-xs">Demo code: <span className="font-bold">{devCode}</span></p>}
                <div className="mt-4">
                  <OtpInput value={code} onChange={setCode} autoFocus />
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <Button variant="solid" loading={loading} onClick={verify} className="mt-3 w-full rounded-full">Verify & continue</Button>
                <button type="button" onClick={() => setStep("phone")} className="mt-3 cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:underline">Change number</button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
