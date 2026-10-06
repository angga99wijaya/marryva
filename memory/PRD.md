# NikahKita — WeddingWire ID Clone

## Original Problem Statement
"Sebagai senior fullstack engineer saya ingin kamu membedah tiap halaman WeddingWire sampai level UI/UX dan feature-by-feature."

Approved plan: produce a page-by-page WeddingWire teardown document AND build a localized Indonesian clone (NikahKita) with dual-language ID/EN, adat ceremony tags, IDR pricing, WhatsApp-first contact pattern.

## Architecture
- Backend: FastAPI + Motor (MongoDB). JWT auth with bcrypt. All routes under `/api`.
- Frontend: React 19 + React Router 7, Tailwind + shadcn/ui, Cormorant Garamond + Plus Jakarta Sans + JetBrains Mono.
- Data: 32 seeded vendors across 5 cities × 7 categories, 10 real wedding stories, 7 reviews, 3 demo accounts. Seed is idempotent and auto-triggered on frontend mount.

## User Personas
1. Couple — browses, saves, inquires, uses planning tools.
2. Vendor — manages listing, receives inquiries.
3. Admin — approves vendors, sees stats.

## Core Requirements
- Dual language ID (default) / EN runtime toggle.
- Adat tags: Jawa / Sunda / Bali / Minang / Batak / Chinese / Modern.
- IDR pricing (`Rp 85 jt` and `Rp 85.000.000`).
- WhatsApp-first CTA (`wa.me` deeplink + prefilled message).
- WeddingWire 11-surface teardown doc at `/app/docs/weddingwire-teardown.md`.

## What's Been Implemented (2026-02)
- Teardown doc covers all 11 WeddingWire surfaces with layout/components/flows/IA/monetization/SEO/ID-adaptation.
- Backend endpoints: auth, vendors (filters+sort), reviews, favorites, inquiries, checklist/budget/guests CRUD with starter templates, real-weddings, admin stats + approvals, seed.
- Frontend pages: Home, Vendor Directory (+ venues variant), Vendor Profile (gallery+tabs+sticky lead card+WhatsApp CTA+inquiry form), Real Weddings masonry + detail, Checklist, Budget (IDR), Guest List, Favorites, Vendor Dashboard, Admin panel, Signin/Signup.
- Testing agent run #1: backend 100% (26/26), frontend ~90% (bootstrap gating fix applied in-place).

## Demo Accounts
- couple: `demo@nikahkita.id` / `demo123`
- vendor: `vendor@nikahkita.id` / `vendor123`
- admin: `admin@nikahkita.id` / `admin123`

## Phase 2 Backlog
- Wedding Website Builder (public pages, RSVP sync).
- Amplop digital registry (QRIS, bank transfer, e-wallet).
- Forum/Community Q&A with moderation.
- Vendor paid-tier payment (Midtrans/Stripe) + Boost slots.
- WhatsApp Business API lead routing.
- Review submission + proof-of-booking verification.

## Phase 3
- Mobile app, vendor analytics, affiliate Shop, SEO engine, Mandarin support.
