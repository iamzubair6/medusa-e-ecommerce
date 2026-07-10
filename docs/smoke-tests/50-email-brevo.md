# Test #50 — Real emails (Brevo): OTP code + order confirmation

**What was built:** the site can now send real emails — the OTP verification code
(when you register with an email) and an order-confirmation email after checkout.
Without setup it silently falls back to demo mode (code shown on screen), so
nothing breaks if you skip this.

## One-time free setup (~5 minutes)

1. Go to <https://onboarding.brevo.com/account/register> and create a **free**
   account (300 emails/day, no card needed).
2. In Brevo: **Settings → SMTP & API → API Keys → Generate a new API key.** Copy it.
3. Brevo must know your sender address: **Settings → Senders & Domains → Senders →
   Add a sender.** Use an email you can open (e.g. your Gmail) and confirm the
   verification mail Brevo sends you.
4. Add these to the environment:
   - Local: `apps/web/.env`
     ```
     BREVO_API_KEY=xkeysib-…
     EMAIL_FROM=the-sender-you-verified@example.com
     EMAIL_FROM_NAME=Maison
     ```
   - Live: Vercel → Project → Settings → Environment Variables → add the same
     three → **Redeploy**.

## Important: demo codes in production

For security, the on-screen demo OTP code is now **off in production** unless
you explicitly allow it. Until you finish the Brevo setup above, set
`OTP_DEMO_CODES=true` in Vercel so live registration keeps working — and
**remove it** once Brevo is configured (otherwise anyone could read a
victim's login code from the API response).

Also fixed in this task: the code is only ever emailed to the **account's own
registered email** — an attacker can't ask for your code to be sent to their
inbox.

## Test checklist

- [ ] **OTP by email:** open `/account/login` → Register tab → fill name, phone,
      **a real email you can open**, password → "Send code".
      Expect: message "We emailed the code to …" (no on-screen demo code), and
      the code arrives in that inbox (check spam the first time).
- [ ] Enter the emailed code → registration completes and you are logged in.
- [ ] **Order confirmation:** place any COD order (add to cart → checkout →
      complete). Expect: an email "Order #… confirmed — Maison" with the total
      and a Track Order link.
- [ ] **Fallback still works:** remove `BREVO_API_KEY` (or test on an env without
      it) → "Send code" shows the demo code on screen like before.

## If something is wrong
- No email? Check Brevo → **Transactional → Logs** — it shows every send/reject.
- "Sender not valid" → step 3 wasn't completed for the exact `EMAIL_FROM` address.
