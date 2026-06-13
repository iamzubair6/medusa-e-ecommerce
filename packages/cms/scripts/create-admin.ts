/**
 * Create (or list) Maison back-office admin users from the command line —
 * the equivalent of Django's `createsuperuser`. Inserts straight into the CMS
 * `AdminUser` table (scrypt-hashed password), so it needs no ADMIN_BOOTSTRAP_*
 * env vars and works whether or not any admins already exist.
 *
 *   bun run --filter @ecom/cms admin:create                       # interactive
 *   bun run --filter @ecom/cms admin:create -- --list             # list admins
 *   bun run --filter @ecom/cms admin:create -- \
 *     --email you@x.com --name "Owner" --role ADMIN               # prompts for password
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Make CMS_DATABASE_URL available from apps/web/.env when not already exported. */
function ensureDbUrl(): void {
  if (process.env.CMS_DATABASE_URL) return;
  const envPath = resolve(HERE, "../../../apps/web/.env");
  try {
    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("CMS_DATABASE_URL="));
    if (line) {
      process.env.CMS_DATABASE_URL = line
        .slice("CMS_DATABASE_URL=".length)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env to read; rely on the ambient environment */
  }
}

interface Args {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  list?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--email") a.email = argv[++i];
    else if (flag === "--name") a.name = argv[++i];
    else if (flag === "--password") a.password = argv[++i];
    else if (flag === "--role") a.role = argv[++i];
    else if (flag === "--list") a.list = true;
    else if (flag === "--help" || flag === "-h") a.help = true;
  }
  return a;
}

function usage(): void {
  stdout.write(
    [
      "",
      "Create or list Maison admin users.",
      "",
      "  bun run --filter @ecom/cms admin:create                 interactive (prompts)",
      "  bun run --filter @ecom/cms admin:create -- --list       list existing admins",
      '  bun run --filter @ecom/cms admin:create -- --email you@x.com --name "Owner" --role ADMIN',
      "",
      "Flags:",
      "  --email <email>       admin email (unique)",
      "  --name <name>         display name",
      "  --password <pw>       password (>=8 chars); omit to be prompted (hidden)",
      "  --role ADMIN|EDITOR   default ADMIN",
      "  --list                list existing admins and exit",
      "  --help, -h            show this help",
      "",
    ].join("\n") + "\n",
  );
}

/** No-echo password prompt (terminal raw mode). Control keys handled by char code. */
function promptHidden(query: string): Promise<string> {
  return new Promise((res) => {
    stdout.write(query);
    const raw = Boolean(stdin.isTTY);
    if (raw) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === 10 || code === 13 || code === 4) {
          // Enter / EOF — done
          if (raw) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          return res(value);
        }
        if (code === 3) {
          // Ctrl-C — abort
          if (raw) stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
        }
        if (code === 127 || code === 8) value = value.slice(0, -1); // DEL / backspace
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  ensureDbUrl();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!process.env.CMS_DATABASE_URL) {
    stdout.write("CMS_DATABASE_URL is not set (and apps/web/.env has none).\n");
    process.exitCode = 1;
    return;
  }

  // Import DB modules only after CMS_DATABASE_URL is set (Prisma reads it on construct).
  const { prisma } = await import("../src/client");
  const { createAdminUser, getAdminUserByEmail, listAdminUsers } = await import("../src/admin-users");
  const { adminUserCreateSchema } = await import("../src/schemas/admin-user");

  try {
    if (args.list) {
      const users = await listAdminUsers();
      if (users.length === 0) {
        stdout.write("No admin users yet. Create one to sign in at /admin/login.\n");
        return;
      }
      stdout.write(`\n${users.length} admin user(s):\n`);
      for (const u of users) {
        stdout.write(`  - ${u.email}  [${u.role}]  ${u.active ? "active" : "inactive"}\n`);
      }
      stdout.write("\n");
      return;
    }

    const rl = createInterface({ input: stdin, output: stdout });
    const ask = async (label: string, provided?: string): Promise<string> =>
      provided && provided.length > 0 ? provided : (await rl.question(label)).trim();

    const email = await ask("Email: ", args.email);
    const name = await ask("Name: ", args.name);
    const role = ((await ask("Role [ADMIN/EDITOR] (default ADMIN): ", args.role)) || "ADMIN").toUpperCase();
    rl.close();

    let password = args.password ?? "";
    if (!password) {
      password = await promptHidden("Password (hidden, >=8 chars): ");
      const confirm = await promptHidden("Confirm password: ");
      if (password !== confirm) {
        stdout.write("Passwords do not match.\n");
        process.exitCode = 1;
        return;
      }
    }

    const parsed = adminUserCreateSchema.safeParse({ email, name, password, role });
    if (!parsed.success) {
      stdout.write("Invalid input:\n");
      for (const issue of parsed.error.issues) {
        stdout.write(`  - ${issue.path.join(".") || "value"}: ${issue.message}\n`);
      }
      process.exitCode = 1;
      return;
    }

    if (await getAdminUserByEmail(parsed.data.email)) {
      stdout.write(`An admin with email ${parsed.data.email} already exists. Edit it in /admin/users.\n`);
      process.exitCode = 1;
      return;
    }

    const user = await createAdminUser(parsed.data);
    stdout.write(`\nCreated ${user.role} admin: ${user.email}\nSign in at /admin/login.\n\n`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e: unknown) => {
  const err = e as { code?: string; message?: string };
  stdout.write(`Failed: ${err.code ?? ""} ${err.message ?? String(e)}\n`);
  process.exitCode = 1;
});
