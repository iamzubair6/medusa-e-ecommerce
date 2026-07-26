# Tests #126–#128 — Discounts & promotions (auto-promo fix, details, editing) + older gaps

**What was built/fixed:** the auto-applied GET20 promo was a leftover *automatic*
promotion (now disabled); every promo row in **/admin/discounts** expands into a
full **edit form**; promo start/expiry dates were silently broken after a Medusa
upgrade and now work again. This file also covers surfaces that never had a
smoke list: price lists, campaigns (as-is), guest leads, phone capture.

## 1. No surprise discounts (the #126 fix)

- [ ] Open the storefront in a private/incognito window, add any product to the
      cart → **no promo code chip and no discount** appear in cart or checkout.
- [ ] If your normal browser still shows an old promo chip in the cart, click
      its ✕ — it must not come back on the next add.

## 2. Promo editing (/admin/discounts, #127–#128)

- [ ] Click a promo's **code** (chevron) → the row expands into an edit form
      prefilled with its current values.
- [ ] The header line shows the type ("Order", "Free shipping", …), what it
      applies to, and the created date — and says type/target can't be changed.
- [ ] Change the percent value → **Save changes** → toast confirms; re-open the
      row — the new value shows in the Discount column and the form.
- [ ] Set a **start date in the future** → save → in an incognito cart the code
      is rejected ("not valid"). Clear the date → save → the code applies.
- [ ] Set an **expiry date in the past** → save → the code is rejected. Clear it.
- [ ] Set **Usage limit → Max total uses = 1**, save → after one completed order
      uses it, a second cart can't apply it. The form shows "X of 1 uses
      redeemed so far".
- [ ] Switch the limit to **Max uses per customer**, save → re-open: kept.
- [ ] Set limit back to **Unlimited**, save → re-open: no limit shown.
- [ ] Tick **Apply automatically** on a test promo → warning copy appears under
      the checkbox; a fresh incognito cart now gets it with no code. **Untick
      it (or Disable the promo)** when done — this is exactly what caused the
      #126 surprise discount.
- [ ] **Delete** (trash) asks for confirmation; deleting removes the row and
      the code stops applying.
- [ ] Create a promo **with a start + expiry date** → it saves without error and
      the dates show when you re-open it (this was the broken-since-upgrade bug).

## 3. Sales & price lists (/admin/price-lists)

- [ ] Create a timed sale for one product/category → the storefront shows the
      reduced price while the sale is active.
- [ ] Delete the price list → prices return to normal.

## 4. Campaigns (/admin/campaigns — as of #128 still a scheduler only)

- [ ] Create a campaign with name + dates (+ optional promo code note).
- [ ] Activate / Pause toggles the status badge.
- [ ] Note: campaigns do **not** change the storefront yet — that lands with
      task #129 (see the round-6 smoke file when it ships).

## 5. Guest leads (/admin/leads)

- [ ] Submit the email popup on the storefront (incognito) → the address shows
      up in /admin/leads with its source.
- [ ] Table paginates; emails/phones are readable.

## 6. Phone capture (storefront popup)

- [ ] In incognito, the phone popup appears → enter a phone → OTP screen →
      correct code verifies without errors; wrong code shows an error.
- [ ] After verifying, the popup doesn't reappear on refresh.
