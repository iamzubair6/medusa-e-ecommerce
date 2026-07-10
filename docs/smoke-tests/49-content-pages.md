# Test #49 — Footer pages + Content Pages admin

**What was built:** every footer link now opens a real page (Help Center, Size
Guide, Shipping, Returns, About, Careers, Contact, Sustainability, Gift Cards)
plus new Privacy Policy and Terms links in the footer bottom bar. All of them
are editable in admin — you can also create brand-new pages. No setup needed.

## Test checklist (storefront)

- [ ] Click every footer link — none should 404:
      Help Center, Track Order, Size Guide, Shipping, Returns, About, Careers,
      Contact, Sustainability, New In, Sale, Trending, Gift Cards,
      Privacy Policy, Terms of Service.
- [ ] Pages look on-brand (title + readable content, working in-page links).
- [ ] A made-up URL like `/no-such-page` shows the 404 page.

## Test checklist (admin)

- [ ] **/admin/content-pages** lists 11 pages, collapsed.
- [ ] Open "Contact Us", change the phone number, save → refresh `/contact` —
      the change is live (no deploy).
- [ ] Untick "Visible on the storefront" for Careers, save → `/careers` now 404s.
      Re-enable it, save → it's back.
- [ ] **Add page**: slug `help/faq`, title "FAQ", some content, save →
      `/help/faq` works.
- [ ] Try slug `cart` → inline error "reserved route" (protects real pages).
- [ ] Delete the FAQ page (confirm dialog) → save → `/help/faq` 404s again.
