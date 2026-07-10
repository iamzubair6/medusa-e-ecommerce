"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@ecom/ui";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or phone"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

const inputCls =
  "h-12 w-full rounded-sm border border-input bg-card px-3.5 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Sign-in — minimal centered card; registration lives on its own page. */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Sign in with your email or phone number.</p>

        <form className="mt-8 flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
          <input className={inputCls} placeholder="Email or phone" autoComplete="username" {...register("identifier")} />
          {errors.identifier?.message && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
          <input className={inputCls} type="password" placeholder="Password" autoComplete="current-password" {...register("password")} />
          {errors.password?.message && <p className="text-xs text-destructive">{errors.password.message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="solid" size="lg" loading={isSubmitting} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">New to Maison?</p>
          <Button asChild variant="outline" size="lg" className="mt-3 w-full">
            <Link href="/account/register">Create an account</Link>
          </Button>
      </div>
    </div>
  );
}
