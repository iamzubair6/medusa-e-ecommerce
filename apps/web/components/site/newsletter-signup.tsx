"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export function NewsletterSignup() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, source: "footer-newsletter" }),
    }).catch(() => {});
  };

  if (isSubmitSuccessful) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-gold-soft">
        <Check className="h-4 w-4" /> Thanks — you're on the list!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-1">
      <div className="flex">
        <input
          type="email"
          placeholder="Enter your email"
          aria-label="Email"
          {...register("email")}
          className="w-full rounded-l-md border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-r-md bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90 disabled:opacity-60"
        >
          {isSubmitting ? "..." : "Sign Up"}
        </button>
      </div>
      {errors.email && <span className="text-xs text-accent">{errors.email.message}</span>}
    </form>
  );
}
