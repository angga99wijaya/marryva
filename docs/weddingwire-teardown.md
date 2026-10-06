# WeddingWire — Page-by-Page Teardown & Indonesia Localization Notes

> Senior fullstack engineering reference. Audience: product/design/engineering team building **NikahKita**, an Indonesian WeddingWire-equivalent.
> Scope: 11 surfaces. Each section covers (1) layout/UI anatomy, (2) components, (3) user flows, (4) feature list, (5) information architecture (IA), (6) monetization hooks, (7) SEO patterns, (8) ID-localization notes.

---

## 0. Global shell (shared across every page)

**Top bar.** Logo (left) → primary nav `Vendors · Venues · Real Weddings · Wedding Planning Tools · Dresses · Forum · Shop` → secondary utility `Sign in / Join now · For Vendors`.
**Footer.** 4 columns: *Planning Tools, Vendors, Inspiration, Company*. Below: badge row (The Knot Worldwide family, press mentions), legal.
**Global primitives.** Search bar (location + category typeahead), category chips, breadcrumb, "Save vendor" heart, star-rating bar, review count, "Request Quote" CTA, newsletter capture.

**ID adaptation.**
- Nav rename: `Vendor · Venue · Real Wedding · Alat Perencanaan · Busana · Forum`.
- Add **language toggle `ID | EN`** in the top bar; default **ID**.
- Replace "Request Quote" with WhatsApp-first CTA `Chat via WhatsApp` (deeplink `https://wa.me/<vendor_phone>?text=<prefilled>`) and keep "Kirim Permintaan Penawaran" as the form fallback.
- Family-of-brands footer is irrelevant; replace with social proof (BRIN, Dekranas, local press).

---

## 1. Homepage (`/`)

**Layout & UI anatomy.**
1. Full-bleed hero image, headline *"Find your wedding vendors"*, two-field search (**Looking for** · **In**) + large submit button.
2. Row of category tiles with iconography: Venues, Photographers, Catering, Florists, DJ, Beauty, …
3. "Real Weddings" editorial carousel (3-up card with couple names, city, photographer credit).
4. "Our Favorite Vendors in [geo-detected city]" vendor grid.
5. "Why WeddingWire" trust strip (reviews count, vendor count, average rating).
6. CTA stripe "Start planning" → routes to signup + planning tools.
7. Deals / sponsored vendors ribbon.
8. Blog teasers → *Advice*.
9. Newsletter signup.

**Components.** HeroSearch, CategoryTile, VendorCard, EditorialCard (real weddings), TrustStat, NewsletterForm.

**User flows.**
- Guest → search → directory results → vendor profile → "Request Quote" (modal captures lead + optional account creation).
- Guest → category tile → directory with that category pre-selected.
- Returning user → sees "Welcome back [name]" and personalized vendors by saved city.

**Feature list.** Geo-detection, personalized vendor suggestions, lead-gen modal, category discovery, editorial inspiration, trust stats, SEO-rich linking into every leaf page.

**IA.** Homepage is the **search funnel entry**; every tile is a canonical URL to the directory with a filter preset.

**Monetization hooks.** Featured vendor slots (paid), sponsored category tile, deals ribbon, affiliate linking to Shop.

**SEO patterns.** H1 branded, structured data (`Organization`, `SearchAction`), internal links to top 50 city/category combinations.

**ID adaptation.**
- Hero copy: *"Temukan vendor pernikahan impianmu"*; subcopy: *"Dari adat Jawa, Sunda, Bali, Minang, Batak sampai modern."*
- Search fields: `Kategori` + `Kota` (default Jakarta). Add third optional field `Tanggal`.
- Category tiles: Venue, Fotografer, Katering, MUA, Dekorasi, Wedding Organizer, Entertainment, Busana (sewa/beli), Cincin, Souvenir, Undangan Digital.
- Add **"Jelajah berdasarkan Adat"** horizontal scroller with 7 adat tags.
- Replace "Deals" ribbon with **"Promo bundling WO + Katering"** block (common in ID).

---

## 2. Vendor Directory (`/<category>/<city>`)

**Layout & UI anatomy.**
- Breadcrumb → H1 *"Wedding Photographers in Chicago, IL"* → result count.
- Left rail: filters (Price $$–$$$$$, Guest capacity for venues, Service area, Style, Rating, Availability date). Collapsible sections.
- Top bar: sort dropdown (Recommended, Rating, Price low→high, Distance, Newest), map toggle.
- Result list: **VendorCard** (160×120 hero, name, rating + review count, price tier, 2–3 chip tags, "Save" heart, primary CTA "Request Quote").
- Right rail (desktop): small map with pins; mobile shows map modal.
- Pagination at bottom; inline "Load more" variant in some tests.
- Lead-magnet band mid-list: *"Request pricing from up to 5 vendors in one click."*

**Components.** FilterGroup, Chip, RangeSlider, DatePicker, SortSelect, VendorCard, Pagination, MapPanel, MultiRequestBanner.

**User flows.** Narrow filters → open profile in new tab → or click "Request Quote" inline (opens modal, captures event date/guest count/phone, requires account).

**Feature list.** 15+ filter facets, availability-aware filtering, multi-select "contact many at once", map view, save vendor to shortlist, compare drawer.

**IA.** URL carries category + city; filters mutate querystring. Each facet maps to a crawlable canonical URL for SEO (`/wedding-photographers/chicago-il?style=photojournalism`).

**Monetization hooks.** Featured/Premium tier floats to top with a "Featured" badge; paid vendors unlock inline video preview; "Boost" slots at positions 1, 5, 10.

**SEO patterns.** H1 category+city, FAQ accordion ("What's the average cost of a photographer in Chicago?"), `ItemList` schema for each card, cross-links to sibling cities.

**ID adaptation.**
- Filters: **Harga (IDR range)** with presets `< 25jt`, `25–50jt`, `50–100jt`, `100–250jt`, `>250jt`; **Adat**; **Kapasitas tamu**; **Indoor/Outdoor**; **Halal catering**; **Availability** (calendar); **Rating**.
- Service-area replaced with **Kota + jangkauan (dalam kota / luar kota / luar pulau)**.
- Add Compare drawer limited to 3 vendors (ID users shortlist via WhatsApp group screenshots — compare bridges that).
- Each row surfaces WhatsApp CTA alongside the inquiry form.

---

## 3. Vendor Profile (`/<category>/<slug>`)

**Layout & UI anatomy.**
1. **Hero gallery** (large primary image, 2×2 thumbnail block, "See all photos" link opens lightbox).
2. Title block: name, star rating + review count, address, "Save" heart, share.
3. Sticky right rail: **Request Quote card** (date, guest count, name, email, phone, message) + "Message vendor" + response-time stat.
4. Tabs below hero: *About · Pricing & Packages · Reviews · FAQ · Deals · Map · Team · Network*.
5. **About.** Paragraph description, services chip list, service area map, awards (WeddingWire Couples' Choice ribbon).
6. **Pricing & Packages.** Package cards (name, inclusions, starting price, book button).
7. **Reviews.** Rating distribution bar, individual review cards with photos, filter by star, "Review this vendor" CTA.
8. **FAQ.** Collapsible rows.
9. **Deals.** Timed promos.
10. **Map.** Service area pin + "Nearby vendors" row.
11. Related vendors carousel.

**Components.** Gallery, Lightbox, StickyLeadCard, Tabs, PackageCard, ReviewCard, RatingHistogram, AwardRibbon, FAQ (Accordion), RelatedCarousel.

**User flows.** Browse gallery → read reviews → submit lead → optionally book (external) → add to shortlist → track in inquiries inbox.

**Feature list.** Multi-image gallery, video embeds, package comparison, review submission (requires email verification), save, share, inquiry form with context payload, direct message thread, "I booked this vendor" tracking that unlocks review eligibility.

**IA.** Slug-based URL; tabs are hash fragments `#reviews`, `#pricing`.

**Monetization hooks.** Premium vendors unlock video, pinned reviews, custom color accent, lead priority routing, outbound website link, "Visit website" button.

**SEO patterns.** `LocalBusiness` + `AggregateRating` + `Review` structured data; H1 vendor name + city.

**ID adaptation.**
- Primary CTA = **"Chat via WhatsApp"** (green, pre-filled template). Secondary = inquiry form.
- Package card uses **IDR formatting** (`Rp 85.000.000`) + "Mulai dari" prefix; show "DP" (down payment) percentage line.
- Add **Adat badge** row (Jawa, Sunda, Bali, …) on hero.
- "Awards" replaced with **"Verifikasi NikahKita"** trust badge + response-time (jam, bukan hari).
- Reviews can be imported via Instagram tag `#namavendor` for proof.

---

## 4. Venues (`/venues/<city>`)

Specialized directory extension of §2 with venue-specific facets.

**Layout.** Same as directory but adds:
- Facet: **Guest capacity** range (0–50, 51–100, 101–200, 200+, 500+).
- Facet: **Setting** (Ballroom, Garden, Beach, Barn, Historic Mansion, Rooftop, Industrial, Winery).
- Facet: **Ceremony type** (Indoor, Outdoor, both).
- Facet: **Catering** (In-house, BYO, Preferred list).
- Venue cards show capacity badge prominently.

**ID adaptation.**
- **Setting**: Gedung, Hotel, Villa, Pantai, Kebun, Rooftop, Masjid Agung, Gereja, Vihara, Wisma Negara.
- **Jenis acara**: Akad, Resepsi, Both; Indoor / Outdoor.
- **Adat support** facet (ceremonial space, pelaminan, ruang siraman).
- Capacity bracket: **100–300 (intimate), 300–800 (medium), 800–2000 (grand), 2000+ (mega)** — ID weddings skew large.
- Facet: **Catering halal** required/optional.
- Price per pax **Rp/pax** display, plus minimum pax (common clause).

---

## 5. Real Weddings (`/real-weddings`)

**Layout & UI anatomy.** Pinterest-style masonry grid of editorial cards. Each card: hero photo, couple names ("Ava & Noah"), city, style tag, photographer credit. Filters top bar: **Style, Season, Setting, Color palette, Budget band**. Clicking a card opens an **editorial detail** page: 20–40 photos, story in long form, vendor credit list (links back to vendor profiles), "Shop this look" affiliate section.

**Components.** MasonryGrid, EditorialCard, StoryHero, VendorCreditList, AffiliateShopRow.

**Feature list.** Submit your wedding form (couple-sourced), moderation flow, vendor cross-promotion (every credit = profile backlink), SEO content, Pinterest social share optimized.

**Monetization hooks.** Affiliate "Shop this look", sponsored stories, backlink juice to premium vendors.

**SEO patterns.** `Article` schema, rich pinterest meta, each wedding is an evergreen URL.

**ID adaptation.**
- Filters: **Adat · Kota · Jumlah tamu · Budget band**.
- Credit list links to NikahKita vendor profiles.
- "Submit cerita pernikahan kamu" form routes to admin moderation queue; approved stories get a one-year free "Featured couple" badge on the Wedding Website Builder.

---

## 6. Wedding Website Builder (`/wedding-website`)

**Layout & UI anatomy.**
- Template picker gallery (filterable by color/style).
- Editor side-panel + live preview iframe.
- Sections: Our Story, Wedding Party, Schedule, Travel, Registry, RSVP, Photos, Q&A, Guest Book.
- Publish → `username.wwsite.com` or custom domain.
- Guest-facing public pages with password protection option.

**Components.** TemplateCard, SectionEditor, LivePreview, RSVPForm, PasswordGate.

**User flows.** Pick template → fill content → invite guests (import from Guest List) → guests RSVP → RSVPs sync to Guest List tool.

**Feature list.** 100+ templates, drag-section reorder, custom domain, password gate, RSVP sync, Registry embed, real-time guest book, mobile preview, analytics (views, RSVPs).

**Monetization hooks.** Custom domain (paid), premium templates, remove-watermark.

**ID adaptation.**
- Add **digital undangan** mode (short, single-page, music + animasi) alongside long-form site.
- Pre-fill with **akad + resepsi dual schedule** by default.
- Registry section embeds **amplop digital** (QRIS / bank transfer / e-wallet DANA/OVO/GoPay) rather than product gift lists.
- Add **wa.me RSVP** option — guest clicks and sends a pre-filled WA to the couple.
- Templates include Jawa, Sunda, Bali, Minang, Batak, Chinese, Modern styles.

---

## 7. Checklist (`/wedding-checklist`)

**Layout.** Timeline split into buckets *12+ months, 10, 8, 6, 4, 2, 1 month, 2 weeks, week of, day of, after*. Each bucket is a collapsible list of checkbox tasks. Progress ring at top. Add-custom-task CTA. Each task may link to a relevant tool (e.g., "Set your budget" → Budget Tool).

**Features.** Preset templates (traditional 12-month, short 6-month, elopement 1-month), reorder tasks, assign to partner, due dates, notifications, sync with calendar export (iCal).

**Monetization hooks.** Vendor cross-promo on tasks ("Book your photographer" → directory with photographer preset).

**ID adaptation.**
- Add culturally specific tasks: **lamaran · siraman · midodareni · akad · resepsi · ngunduh mantu**.
- Checklist template picker: *Pernikahan Adat Lengkap · Modern Minimalis · Intimate Wedding · Destination (Bali/LN)*.
- Due-date presets reflect typical ID lead times (venue 9–12 bulan, katering 6, MUA 4, dekorasi 3).

---

## 8. Budget Tool (`/wedding-budget`)

**Layout.** Top summary cards (Total Budget, Spent, Remaining, % of total). Category table with columns: *Category, Estimated, Actual, Paid, Vendor, Due date, Notes*. Pie chart of allocation. Set-budget wizard on first visit.

**Features.** Auto-allocation suggestion based on average spend %, override per category, mark paid, upload receipt, export CSV, sync vendor from directory.

**ID adaptation.**
- Default allocation preset for ID weddings (Katering 40%, Venue 20%, Dekorasi 12%, MUA + Busana 8%, Dokumentasi 10%, WO 5%, Entertainment 3%, Misc 2%).
- Currency: IDR with `Rp` prefix and thousand separators (`Rp 150.000.000`).
- Payment schedule: track **DP (30%)**, **Pelunasan H-14**, common in ID vendor contracts.
- Export: PDF rencana anggaran yang bisa dibawa ke bank (KPR nikah / pinjaman).

---

## 9. Guest List (`/wedding-guestlist`)

**Layout.** Table of guests with columns *Name, Relationship, Side, Group, RSVP status, Meal, Plus-ones, Address, Phone, Notes*. Top summary (invited, attending, declined, pending). Filters per column. Bulk import CSV. Table-planning drag UI (seat guests at tables).

**Features.** Import CSV / Google Contacts, send save-the-dates & invites (email + print export), online RSVP sync (with Wedding Website Builder), meal preference tracking, allergy flag, table assignment with capacity, address book for mailing labels, thank-you note tracker.

**ID adaptation.**
- Column **Pihak** (Pengantin Pria / Pengantin Wanita / Bersama).
- Column **WhatsApp Number** primary (email secondary).
- "Send invite" → generate **short link ke undangan digital** + bulk WA via WhatsApp Business/Blast integration (external).
- Meal column replaced with **"Makan di tempat / Bawa pulang / Keduanya"** (common dual-serve pattern).
- Table planning adapts to Indonesian round-table-for-10 and standing/buffet layouts.
- Thank-you tracker optional: in ID, thank-yous usually happen in person at the gate (salaman/salam tempel).

---

## 10. Registry (`/wedding-registry`)

**Layout.** Universal registry: pull products from any retailer via URL, OR link existing registries (Amazon, Target). Grid of gift items with price, retailer, "Mark as purchased", group-gift pooling. Cash fund tiles (Honeymoon, House, Experiences).

**Features.** Universal add from URL, cash fund with Stripe/Zelle, group gifting, thank-you tracker, "most popular" sort, categories (Kitchen, Bedroom, Travel, Experiences).

**ID adaptation.**
- Primary focus = **amplop digital** (digital cash gift). Payment rails: **QRIS, bank transfer (BCA, Mandiri, BRI, BNI), e-wallet (DANA, OVO, GoPay, ShopeePay)**.
- Secondary: experience funds (Bali honeymoon, Jepang honeymoon).
- Product registry is **lower priority** in ID culture — relegated to a tab, pre-filled with Tokopedia/Shopee affiliate links.
- Auto-generate a **digital thank-you with couple photo** sent to each contributor via WA.
- Settle-to-bank flow with KYC (Phase 2).

---

## 11. Forum (`/forum`)

**Layout.** Category list → topic list (title, author avatar, replies, last activity) → thread detail with threaded replies. Rich-text editor with photo upload, @mention, like/helpful, mark-as-answer. Sidebar: trending topics, popular tags.

**Features.** Moderation queue, report, badges (First Post, Helpful, Verified Bride), search within forum, email digest subscription.

**Monetization hooks.** Vendor-answered threads with "Verified Vendor" badge → backlink to profile.

**ID adaptation.**
- Categories mirror ID concerns: **Lamaran & Adat · Katering · Venue · MUA · Dokumentasi · Legal (KUA, Gereja, dukcapil) · Budget & Hemat · Honeymoon · Curhat & Tips**.
- Thread templates for FAQ: *"Berapa budget wajar untuk 500 tamu di Jakarta?"*.
- Allow anonymous posting (brides often shy about money topics in ID).
- Integrate **WhatsApp group invites** per topic (bridal community already lives on WA).

---

## Appendix A — Monetization architecture summary

| Lever | Where it appears | Phase |
|---|---|---|
| Free vendor listing | Everywhere | P1 |
| Featured vendor (paid) | Directory top slots, homepage grid | P1 structure, P2 payment |
| Premium vendor (paid+) | Profile video, pinned reviews, outbound link, priority leads | P2 |
| Lead-gen fee per booking confirmation | Vendor dashboard "Mark as booked" | P2 |
| Affiliate (Tokopedia/Shopee) | Real Weddings "Shop the look", Registry | P2 |
| Custom domain (Wedding Website) | Builder publish step | P2 |
| Sponsored content (Real Weddings) | Editorial feed | P3 |

## Appendix B — Data model crib sheet

- `user { id, email, name, role: couple|vendor|admin, city, wedding_date, language }`
- `vendor { id, owner_user_id, name, slug, category, subcategories[], city, address, description, phone, whatsapp, website, cover_image, gallery[], packages[], adat_tags[], indoor_outdoor, capacity_min, capacity_max, price_min, price_max, verified, tier: free|featured|premium, rating_avg, review_count, created_at }`
- `package { id, vendor_id, name, price_idr, inclusions[], dp_percent }`
- `review { id, vendor_id, user_id, rating, title, body, photos[], created_at }`
- `favorite { user_id, vendor_id, created_at }`
- `inquiry { id, user_id, vendor_id, event_date, guest_count, name, email, phone, message, status, created_at }`
- `real_wedding { id, slug, couple_names, city, adat, cover_image, story, gallery[], vendor_credits[], created_at }`
- `checklist_task { id, user_id, title, bucket, due_date, done, notes }`
- `budget_item { id, user_id, category, estimated_idr, actual_idr, paid, vendor_id?, notes }`
- `guest { id, user_id, name, side, group, rsvp_status, phone_wa, meal_pref, notes }`

## Appendix C — Phased build order for the ID clone

**Phase 1 (this delivery).** Teardown doc; couple-side Home/Directory/Profile/Venues/Real Weddings; Checklist/Budget/Guest List; Auth; Favorites; Inquiry form; Vendor dashboard MVP; Admin approval; Seed data (30 vendors, 10 weddings).

**Phase 2.** Wedding Website Builder public pages; Registry (amplop digital with QRIS); Forum; paid tier payments (Stripe/Midtrans); vendor analytics; WA Business API lead routing; review submission + verification.

**Phase 3.** Mobile app; vendor CRM; Shop (affiliate); content SEO engine; multi-language beyond ID/EN (Mandarin for Chinese-ID weddings).
