# WeddingWire Teardown + Indonesian Clone

Deep page-by-page analysis of WeddingWire, delivered as a reference document, followed by a fullstack clone localized for the Indonesian wedding market with dual-language support (ID/EN).

## Who it's for
- Engaged couples in Indonesia planning their wedding (venue search, vendor booking, planning tools, guest management).
- Wedding vendors (venues, photographers, MUA, catering, WO, decoration, entertainment) looking to be discovered and manage leads.
- Internal reference for the product/design team studying how WeddingWire structures its marketplace.

## Core features and experience

**Deliverable 1 — Teardown document** (`/app/docs/weddingwire-teardown.md`)
- Page-by-page breakdown for 11 surfaces: Homepage, Vendor Directory, Vendor Profile, Venues, Real Weddings, Wedding Website Builder, Checklist, Budget Tool, Guest List, Registry, Forum.
- Each page covers: layout & UI anatomy, components used, user flows, feature list, information architecture, monetization hooks, SEO patterns.
- Side-by-side notes on what to adapt for Indonesia (adat, local vendor categories, IDR pricing, WhatsApp-first contact).

**Deliverable 2 — Fullstack clone** (localized, dual-language ID/EN)

Couple side
- Homepage with search (location + category), featured vendors, real weddings, planning tools entry.
- Vendor Directory with filters (category, city, price range, rating, availability date) and sorted results.
- Vendor Profile: gallery, services, pricing packages, reviews, availability, contact/inquiry form, save-to-favorites.
- Venues: specialized directory with capacity, indoor/outdoor, ceremony type (adat Jawa, Sunda, Bali, Minang, Batak, Chinese, Modern).
- Real Weddings gallery (inspiration feed with filter by style/adat).
- Wedding Website Builder: pick template, add couple story, event schedule, RSVP, gallery, gift registry link; public shareable URL.
- Planning Tools: Checklist (timeline-based tasks), Budget Tool (categories + IDR tracking), Guest List (RSVP + meal/table), Registry (gift list + cash gift / amplop digital).
- Forum / Community Q&A.
- Auth, saved vendors, inquiries inbox, language switcher (ID/EN).

Vendor side
- Vendor registration & onboarding.
- Vendor dashboard: profile editor, gallery upload, package & pricing management, availability calendar, lead inbox, review responses, basic analytics (views, inquiries).
- Paid listing tiers (Free / Featured / Premium) — structure defined, payment stubbed in Phase 1.

Admin
- Approve vendors, moderate reviews/forum, feature content on homepage.

## Phase 1: what gets built now
1. Teardown document covering all 11 WeddingWire pages, written first and shipped as a markdown reference.
2. Fullstack clone — couple-side end-to-end:
   - Homepage, Vendor Directory + filters, Vendor Profile, Venues, Real Weddings gallery.
   - Checklist, Budget Tool, Guest List (Registry + Website Builder stubbed as "coming soon" cards).
   - Auth (email/password), favorites, inquiry form that stores leads.
   - Dual language ID/EN with ID as default.
3. Fullstack clone — vendor-side minimum viable:
   - Vendor signup, dashboard, profile + gallery + packages editor, lead inbox.
4. Admin: basic vendor approval + content moderation screen.
5. Seed data: ~30 Indonesian vendors across categories and cities (Jakarta, Bandung, Bali, Yogyakarta, Surabaya), 10 real wedding stories, sample reviews.

Deferred to a later phase: Registry gift purchasing, Wedding Website Builder public pages, Forum, paid tier payments, vendor analytics beyond basic counts, mobile app.
