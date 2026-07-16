# LESSONS.md — do-not-repeat log

> Owner corrections and proven mistakes. **Read at every session start.**
> Append a row whenever the owner corrects something. Never repeat an entry here.

| # | Date | Mistake / correction | Rule going forward |
|---|------|----------------------|--------------------|
| 1 | 2026-07-10 | Commits were pushed with `Co-Authored-By` AI attribution although the owner had said not to at the very beginning | Plain Conventional Commit messages only — no co-author / AI lines, ever |
| 2 | 2026-07-10 | Large multi-file commits | Commit 2–3 files at a time, coherent units |
| 3 | 2026-07-10 | Status doc drifted from reality (tasks marked "pending commit" that were long committed) | Update `docs/IMPLEMENTATION_STATUS.md` in the same change as the work; verify claims against git before writing |
| 4 | 2026-07-10 | Pipeline agents (code-reviewer, test-writer, doc-writer) sometimes skipped | Run them properly on every feature before "done" |
| 5 | 2026-07-10 | Risk of editing code without knowing its role | Read file structure + purpose first; change only what's needed |
| 6 | 2026-07-10 | Relying on assistant-side memory for project state | Repo docs are the source of truth (IMPLEMENTATION_STATUS, LESSONS, guides); write context there |
| 7 | 2026-07-11 | Auth built as combined sign-in/sign-up tabs with a "Send code" button and 4-digit OTP — owner wants dedicated pages and a guided flow | Auth-like flows: separate pages per intent, multi-step (details → Next → verify screen), 6-digit OTP |
| 8 | 2026-07-11 | A failing step after OTP verification burned the code (user stuck: 500 then 401 on retry) | Never consume one-time tokens before the whole operation succeeds; keep them retryable until expiry |
| 9 | 2026-07-16 | Seeded catalog had mismatched demo data (men's denim with a child-dress variant image; images not matching division/product) | Seed data must be internally consistent: men's products get men's images/variants, women's get women's, kids' get kids' — never filler/random images. Applies to every future seed/import |
