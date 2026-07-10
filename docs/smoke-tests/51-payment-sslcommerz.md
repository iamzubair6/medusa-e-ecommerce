# Test #51 — Online payment (SSLCommerz sandbox: bKash / cards, no real money)

**What was built:** a "Pay Online — bKash / Card" option at checkout. It sends the
shopper to SSLCommerz's hosted payment page (sandbox = fake money), verifies the
payment server-side, then completes the order. COD is untouched.

## One-time free setup (~10 minutes)

1. Register a free **sandbox** store: <https://developer.sslcommerz.com/registration/>
   (any business name works; this is test-only).
2. You'll get two emails — one contains your **Store ID** and **Store Password**.
3. Add to the environment:
   - Local: `apps/web/.env`
     ```
     SSLCOMMERZ_STORE_ID=your-store-id
     SSLCOMMERZ_STORE_PASSWORD=your-store-password
     ```
   - Live: same two vars in Vercel → Redeploy. (Do **not** set `SSLCOMMERZ_LIVE`
     — that's only for a real production store later.)
4. Enable the method in admin: **/admin/payments** → make sure a method with id
   **`sslcommerz`** exists and is **enabled** (label e.g. "Pay Online — bKash / Card").
   If your saved config predates this task, add it: id `sslcommerz`.

## Official sandbox test credentials

**Cards** (from the [SSLCommerz v4 docs](https://developer.sslcommerz.com/doc/v4/)):

| Method | Number | Expiry | CVV |
| --- | --- | --- | --- |
| VISA | `4111 1111 1111 1111` | 12/26 (any future works) | 111 |
| Mastercard | `5111 1111 1111 1111` | 12/26 | 111 |
| American Express | `3711 1111 1111 111` | 12/26 | 111 |

- **Bank page OTP** (after the card form): `111111` (or `123456`).
- **Mobile banking (bKash / Nagad / Rocket):** pick it on the gateway page —
  the sandbox shows a simulated wallet screen; use any wallet number and
  OTP `111111` or `123456`. (No real bKash app involved; it's a simulator.)
- **Simulating outcomes:** the sandbox bank page shows **Success / Fail**
  buttons after the OTP — press Success for a paid order, Fail for a declined
  one, or use the gateway's Cancel/back link for the cancel path.

## What should happen after paying (the success page)

Payment done → SSLCommerz sends your browser back to
`/api/checkout/pay/callback` → we verify the payment server-side → you are
redirected to **`/checkout/success`** showing the branded order number
(MSN-000XX), total and payment method. You never stay on the callback URL.

> If you were redirected to **port 3000** before: fixed — callback URLs now use
> the exact origin you're browsing on (`localhost:3200` in dev, the live domain
> in production), regardless of env settings.

## Test checklist

- [ ] Checkout shows **two** payment choices: Cash on Delivery + Pay Online.
- [ ] Choose Pay Online → Place order. Expect: redirect to the SSLCommerz sandbox
      page showing the correct BDT amount.
- [ ] **Card success:** VISA `4111 1111 1111 1111` · 12/26 · CVV 111 → OTP
      `111111` → press **Success**. Expect: our **success page** with the
      MSN-order number; order in **/admin/orders**; confirmation email (if #50
      is set up).
- [ ] **Mobile banking:** repeat choosing bKash on the gateway → OTP `111111`.
      Same success flow.
- [ ] **Cancel path:** start again, press Cancel on the gateway. Expect: back at
      checkout with "Payment was cancelled" and the bag intact.
- [ ] **Fail path:** press **Fail** on the bank page. Expect: "The payment didn't
      go through" banner, nothing charged, no order created.
- [ ] **COD unchanged:** a COD order still completes exactly as before.

## If something is wrong

- "Online payment is not configured" → env vars missing where you're testing.
- "Online payment is not enabled" → step 4 (admin payments) not done.
- Redirect works but order never completes → check the SSLCommerz sandbox panel
  (report email) that the transaction shows VALID, and that the site URL the
  gateway redirects to is reachable from the internet (on localhost, use the
  live site to test the full round-trip).
