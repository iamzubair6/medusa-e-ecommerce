# Payments — current state & future online payments

> **Status:** Cash on Delivery (COD) is live. Online card / mobile-money payment
> is **planned, not yet implemented.** This doc is the implementation note for
> when we add it.

## Today (implemented)

- **Cash on Delivery** is the only method. It uses Medusa's built-in **manual
  payment provider** (`pp_system_default`), enabled on the **Bangladesh (BDT)**
  region.
- At checkout the order is tagged `metadata.payment_method = "cod"`. Funds are
  collected on delivery; the admin closes the loop with **Mark Delivered → cash
  collected** on the order.
- The checkout UI shows **COD selected** and a disabled **"Card — coming soon"**
  option (`components/checkout/checkout-client.tsx`).

## Future: add online payments

Goal: let customers pay online with **cards (Stripe)** and/or **Bangladesh mobile
money (bKash / Nagad)**.

### A. Cards — Stripe (well-supported in Medusa)
1. Add Medusa's Stripe payment module to `apps/medusa/apps/backend/medusa-config.ts`
   (`@medusajs/payment-stripe`) with `STRIPE_API_KEY` + `STRIPE_WEBHOOK_SECRET`
   (env only — never commit).
2. Enable the `stripe` provider on the **Bangladesh region** (Settings → Regions,
   or via script) alongside `pp_system_default`.
3. Storefront checkout:
   - Enable the **Card** option (remove the "coming soon" disable).
   - Initiate the payment session, mount **Stripe Elements** for card entry,
     confirm the payment, then complete the cart.
4. Configure the **Stripe webhook** → Medusa (`/hooks/payment/stripe`) so captures
   / failures sync.
5. Keep COD as a parallel option (customer chooses at checkout).

### B. Bangladesh mobile money — bKash / Nagad
- No official Medusa provider. Options:
  1. **Custom Medusa payment provider plugin** wrapping the bKash/Nagad merchant
     API (tokenized checkout, create-payment → execute-payment → callback).
  2. Or a **payment gateway aggregator** (e.g. SSLCOMMERZ / aamarPay) that bundles
     bKash, Nagad, cards, and bank — usually a single redirect/hosted-checkout
     integration, fastest to ship for BD.
- Wire the same way as Stripe: register provider → enable on BD region → checkout
  initiates a session → redirect/confirm → complete cart → verify via callback.

### Checkout changes (either path)
- `checkout-client.tsx`: turn the payment step into a real selector
  (COD / Card / bKash-Nagad), passing the chosen `method` to
  `/api/checkout/complete` (already accepts `method`).
- `/api/checkout/complete`: branch on method — COD stays as-is (manual), online
  methods initiate + authorize the provider session before `completeCart`.

### Secrets / env (set per environment, never commit)
```
STRIPE_API_KEY=…
STRIPE_WEBHOOK_SECRET=…
# or, for an aggregator:
SSLCOMMERZ_STORE_ID=…  SSLCOMMERZ_STORE_PASSWORD=…
```

### Acceptance checklist (when implemented)
- [ ] Provider enabled on the BD region; checkout shows Card / mobile-money.
- [ ] Successful online order is marked **paid** (not "awaiting") in the admin.
- [ ] Webhook/callback verified; failed/cancelled payments don't create paid orders.
- [ ] COD still works unchanged.
- [ ] Refund path documented (online refund vs COD manual cash).
