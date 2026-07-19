"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";

/** Saves a section's validated config to the admin API and refreshes the route. */
export function useSaveSection(sectionId: string) {
  const router = useRouter();
  const toast = useToast();
  return useMutation({
    mutationFn: async (config: unknown) => {
      const res = await fetch(`/api/admin/sections/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof data.error === "string" ? data.error : "Save failed (check fields)");
      }
      return res.json() as Promise<{ ok: true }>;
    },
    onSuccess: () => {
      toast.success("Saved.");
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message || "Save failed."),
  });
}
