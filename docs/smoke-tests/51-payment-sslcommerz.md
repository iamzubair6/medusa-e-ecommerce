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

## Test checklist

- [ ] Checkout shows **two** payment choices: Cash on Delivery + Pay Online.
- [ ] Choose Pay Online → Place order. Expect: redirect to the SSLCommerz sandbox
      payment page showing the correct amount in BDT.
- [ ] Pay with a **test card**: `4111 1111 1111 1111`, any future expiry, CVV 111,
      any OTP (sandbox accepts it). Expect: redirected back to our success page
      with the order number; order appears in **/admin/orders**; confirmation
      email arrives (if #50 is set up).
- [ ] **Cancel path:** start again, press Cancel on the gateway page. Expect:
      back at checkout with "Payment was cancelled" and the bag intact.
- [ ] **Fail path:** use the sandbox "Failure" card `4111 1111 1111 1112` (or the
      Fail button if shown). Expect: "The payment didn't go through" banner,
      nothing charged, no order created.
- [ ] **COD unchanged:** a COD order still completes exactly as before.

## If something is wrong
- "Online payment is not configured" → env vars missing where you're testing.
- "Online payment is not enabled" → step 4 (admin payments) not done.
- Redirect works but order never completes → check the SSLCommerz sandbox panel
  (report email) that the transaction shows VALID, and that the site URL the
  gateway redirects to is reachable from the internet (on localhost, use the
  live site to test the full round-trip).
