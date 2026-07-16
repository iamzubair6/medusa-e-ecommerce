"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button, Card, cn, ConfirmDialog } from "@ecom/ui";
import { adminUserCreateSchema, type AdminRole, type AdminUserCreateInput } from "@ecom/cms";
import { TextField } from "./fields";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin — full access" },
  { value: "EDITOR", label: "Editor — no user mgmt" },
] as const satisfies readonly { value: AdminRole; label: string }[];

async function api(url: string, method: string, body?: unknown): Promise<{ error?: string } & Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as { error?: string } & Record<string, unknown>;
}

export function UsersManager({ users: initial, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwDraft, setPwDraft] = useState<Record<string, string>>({});
  const [confirmingRemove, setConfirmingRemove] = useState<AdminUserRow | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserCreateInput>({
    resolver: zodResolver(adminUserCreateSchema),
    defaultValues: { name: "", email: "", password: "", role: "EDITOR" },
  });

  const onCreate = async (values: AdminUserCreateInput) => {
    try {
      const data = await api("/api/admin/users", "POST", values);
      const user = data.user as AdminUserRow;
      setUsers((u) => [...u, { ...user, lastLoginAt: null }]);
      reset({ name: "", email: "", password: "", role: "EDITOR" });
      toast.success(`${user.name} added.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patch = async (id: string, body: Partial<Pick<AdminUserRow, "role" | "active">> & { password?: string }) => {
    setBusyId(id);
    try {
      const data = await api(`/api/admin/users/${id}`, "PATCH", body);
      const user = data.user as AdminUserRow;
      setUsers((u) => u.map((x) => (x.id === id ? { ...x, role: user.role, active: user.active, name: user.name } : x)));
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: AdminUserRow) => {
    setBusyId(row.id);
    try {
      await api(`/api/admin/users/${row.id}`, "DELETE");
      setUsers((u) => u.filter((x) => x.id !== row.id));
      toast.success(`${row.name} removed.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmingRemove(null);
    }
  };

  const savePassword = async (row: AdminUserRow) => {
    const password = pwDraft[row.id] ?? "";
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (await patch(row.id, { password })) {
      setPwDraft((d) => ({ ...d, [row.id]: "" }));
      toast.success(`Password updated for ${row.name}.`);
    }
  };

  const role = watch("role");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* Create */}
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UserPlus className="h-4 w-4" /> Add a team member
        </h3>
        <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" required error={errors.name?.message} {...register("name")} />
            <TextField
              label="Email"
              type="email"
              required
              error={errors.email?.message}
              autoComplete="off"
              {...register("email")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Temporary password"
              type="password"
              required
              error={errors.password?.message}
              autoComplete="new-password"
              {...register("password")}
            />
            <EnumCombobox<AdminRole>
              label="Role"
              required
              value={role}
              onChange={(v) => setValue("role", v, { shouldValidate: true })}
              options={ROLE_OPTIONS}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="gold" loading={isSubmitting}>
              <Plus className="h-4 w-4" /> Add member
            </Button>
          </div>
        </form>
      </Card>

      {/* List */}
      <Card className="flex flex-col gap-3 p-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Team members ({users.length})
        </h3>
        {users.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
        {users.map((row) => {
          const isSelf = row.id === currentUserId;
          const busy = busyId === row.id;
          return (
            <div key={row.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {row.name}
                    {isSelf && <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">(you)</span>}
                    {!row.active && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[0.625rem] uppercase text-destructive">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    {row.lastLoginAt ? `Last login ${new Date(row.lastLoginAt).toLocaleString()}` : "Never signed in"}
                  </p>
                </div>
                <div className="w-48">
                  <EnumCombobox<AdminRole>
                    label="Role"
                    value={row.role}
                    onChange={(v) => void patch(row.id, { role: v })}
                    options={ROLE_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <TextField
                  label="Reset password"
                  type="password"
                  className="flex-1 min-w-[12rem]"
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                  value={pwDraft[row.id] ?? ""}
                  onChange={(e) => setPwDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !(pwDraft[row.id] ?? "")}
                  onClick={() => void savePassword(row)}
                >
                  <KeyRound className="h-4 w-4" /> Set
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void patch(row.id, { active: !row.active })}
                  className={cn(row.active && "text-muted-foreground")}
                >
                  {row.active ? "Deactivate" : "Reactivate"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || isSelf}
                  onClick={() => setConfirmingRemove(row)}
                  title={isSelf ? "You can't remove your own account" : undefined}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-xs text-muted-foreground">
          The last active admin can&apos;t be demoted, deactivated or removed — so you never get locked out.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmingRemove !== null}
        title={`Remove ${confirmingRemove?.name ?? ""}?`}
        description="They will lose all admin access."
        confirmLabel="Remove"
        destructive
        loading={confirmingRemove !== null && busyId === confirmingRemove.id}
        onConfirm={() => {
          if (confirmingRemove) void remove(confirmingRemove);
        }}
        onCancel={() => setConfirmingRemove(null)}
      />
    </div>
  );
}
