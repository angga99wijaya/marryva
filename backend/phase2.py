"""Phase 2 feature routes for NikahKita.

Registry (amplop digital), Website Builder, Vendor Boost (stub), WhatsApp Blast,
AI Planner Assistant (Claude Sonnet 5.5 via emergentintegrations).

All routes mount onto the shared /api router from server.py.
"""
import os
import re
import time
import uuid
import hmac
import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, HttpUrl

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    LLM_AVAILABLE = True
except Exception:
    LLM_AVAILABLE = False

phase2 = APIRouter()  # mounted under /api in server.py


# ---------- utilities ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def _clean(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    return {k: v for k, v in doc.items() if k != "_id"}

SLUG_RE = re.compile(r"[^a-z0-9-]+")
def slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"\s+", "-", s)
    s = SLUG_RE.sub("", s)
    return s[:60] or new_id()[:8]


# ============================================================
# REGISTRY — amplop digital
# ============================================================
class BankAccount(BaseModel):
    bank: Literal['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB', 'Permata', 'Other']
    account_number: str
    account_holder: str

class RegistryIn(BaseModel):
    enabled: bool = True
    message: str = "Doa restu adalah hadiah terbaik. Jika ingin memberi tanda kasih, bisa melalui amplop digital di bawah."
    qris_image_url: Optional[str] = ""
    bank_accounts: List[BankAccount] = []
    thank_you_message: str = "Terima kasih atas doa dan amplop digitalnya. Semoga Tuhan membalas kebaikanmu berlipat."

class ContributionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount_idr: int = Field(ge=1_000, le=1_000_000_000)
    method: Literal['QRIS', 'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB', 'Permata', 'Other']
    note: Optional[str] = Field(default="", max_length=500)

def _mount_registry(db, get_current_user):
    @phase2.get("/registry")
    async def get_registry(user=Depends(get_current_user)):
        reg = await db.registry.find_one({"user_id": user["id"]}, {"_id": 0})
        if not reg:
            reg = {
                "user_id": user["id"],
                "enabled": False,
                "message": "Doa restu adalah hadiah terbaik. Jika ingin memberi tanda kasih, bisa melalui amplop digital di bawah.",
                "qris_image_url": "",
                "bank_accounts": [],
                "thank_you_message": "Terima kasih atas doa dan amplop digitalnya.",
                "created_at": now_iso(),
            }
            await db.registry.insert_one(dict(reg))
            reg = {k: v for k, v in reg.items() if k != "_id"}
        contributions = await db.contributions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
        reg["contributions"] = contributions
        reg["total_idr"] = sum(c.get("amount_idr", 0) for c in contributions)
        return reg

    @phase2.put("/registry")
    async def update_registry(data: RegistryIn, user=Depends(get_current_user)):
        patch = data.model_dump()
        await db.registry.update_one(
            {"user_id": user["id"]},
            {"$set": patch, "$setOnInsert": {"user_id": user["id"], "created_at": now_iso()}},
            upsert=True,
        )
        return await db.registry.find_one({"user_id": user["id"]}, {"_id": 0})

    @phase2.post("/registry/contributions")
    async def log_contribution(data: ContributionIn, user=Depends(get_current_user)):
        """Couple logs an amplop they received. Keeps thank-you tracker."""
        doc = data.model_dump()
        doc["id"] = new_id()
        doc["user_id"] = user["id"]
        doc["thanked"] = False
        doc["created_at"] = now_iso()
        await db.contributions.insert_one(doc)
        return _clean(doc)

    @phase2.delete("/registry/contributions/{cid}")
    async def delete_contribution(cid: str, user=Depends(get_current_user)):
        await db.contributions.delete_one({"id": cid, "user_id": user["id"]})
        return {"ok": True}

    @phase2.post("/registry/contributions/{cid}/thanked")
    async def mark_thanked(cid: str, user=Depends(get_current_user)):
        r = await db.contributions.update_one({"id": cid, "user_id": user["id"]}, {"$set": {"thanked": True}})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}


# ============================================================
# WEDDING WEBSITE BUILDER
# ============================================================
TEMPLATE_KEYS = ["jawa", "sunda", "bali", "minang", "batak", "chinese", "modern"]

class EventIn(BaseModel):
    title: str
    date: Optional[str] = ""
    time: Optional[str] = ""
    venue: Optional[str] = ""
    address: Optional[str] = ""

class WebsiteIn(BaseModel):
    template: Literal['jawa', 'sunda', 'bali', 'minang', 'batak', 'chinese', 'modern'] = 'modern'
    bride_name: str = Field(max_length=80)
    groom_name: str = Field(max_length=80)
    bride_parents: Optional[str] = ""
    groom_parents: Optional[str] = ""
    wedding_date: Optional[str] = ""
    cover_image: Optional[str] = ""
    story: Optional[str] = Field(default="", max_length=4000)
    events: List[EventIn] = []
    gallery: List[str] = []
    rsvp_enabled: bool = True
    registry_enabled: bool = True
    password: Optional[str] = ""      # optional guest-side password
    published: bool = False

class PublicRSVPIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    attending: bool
    phone_wa: Optional[str] = Field(default="", max_length=20)
    message: Optional[str] = Field(default="", max_length=600)
    guests: int = Field(default=1, ge=1, le=20)

def _mount_website(db, get_current_user):
    @phase2.get("/website/mine")
    async def get_mine(user=Depends(get_current_user)):
        site = await db.websites.find_one({"user_id": user["id"]}, {"_id": 0, "password": 0, "password_hash": 0})
        if not site:
            return None
        return site

    @phase2.put("/website/mine")
    async def update_mine(data: WebsiteIn, user=Depends(get_current_user)):
        existing = await db.websites.find_one({"user_id": user["id"]})
        # Hash the password if provided; keep empty string when cleared
        password_hash = ""
        if data.password:
            password_hash = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        patch = data.model_dump()
        patch.pop("password", None)
        patch["password_hash"] = password_hash
        patch["has_password"] = bool(password_hash)
        if existing:
            # If password field submitted empty AND it was previously set, keep existing hash (user not changing password).
            if not data.password and existing.get("password_hash"):
                patch["password_hash"] = existing["password_hash"]
                patch["has_password"] = True
            slug = existing["slug"]
            patch["slug"] = slug
            # Also unset any legacy plaintext "password" field left from older schema
            await db.websites.update_one({"user_id": user["id"]}, {"$set": patch, "$unset": {"password": ""}})
        else:
            base_slug = slugify(f"{data.bride_name}-{data.groom_name}") or new_id()[:8]
            slug = base_slug
            n = 1
            while await db.websites.find_one({"slug": slug}):
                n += 1
                slug = f"{base_slug}-{n}"
            doc = patch
            doc.update({
                "id": new_id(),
                "user_id": user["id"],
                "slug": slug,
                "created_at": now_iso(),
            })
            await db.websites.insert_one(doc)
        # Return without password_hash
        out = await db.websites.find_one({"user_id": user["id"]}, {"_id": 0, "password": 0, "password_hash": 0})
        return out

    @phase2.get("/website/public/{slug}")
    async def get_public(slug: str, password: Optional[str] = None):
        site = await db.websites.find_one({"slug": slug}, {"_id": 0, "user_id": 0})
        if not site or not site.get("published"):
            raise HTTPException(status_code=404, detail="Site not found or not published")
        pwd_hash = site.get("password_hash") or ""
        if pwd_hash:
            if not password or not bcrypt.checkpw(password.encode("utf-8"), pwd_hash.encode("utf-8")):
                return {"locked": True, "slug": slug, "bride_name": site.get("bride_name"), "groom_name": site.get("groom_name")}
        site.pop("password_hash", None)
        site.pop("password", None)
        return site

    @phase2.post("/website/public/{slug}/rsvp")
    async def submit_rsvp(slug: str, data: PublicRSVPIn, request: Request):
        # per-slug + per-IP throttle: 5 submissions / minute
        ip = request.client.host if request.client else "anon"
        key = f"rsvp:{slug}:{ip}"
        now = time.time()
        bucket = _rsvp_buckets[key]
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= 5:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba beberapa menit lagi.")
        bucket.append(now)

        site = await db.websites.find_one({"slug": slug})
        if not site or not site.get("published"):
            raise HTTPException(status_code=404, detail="Site not found")
        if not site.get("rsvp_enabled", True):
            raise HTTPException(status_code=400, detail="RSVP disabled")
        rsvp = data.model_dump()
        rsvp["id"] = new_id()
        rsvp["website_slug"] = slug
        rsvp["user_id"] = site["user_id"]
        rsvp["source_ip"] = ip
        rsvp["created_at"] = now_iso()
        await db.rsvps.insert_one(rsvp)
        # SYNC into guest list — match on name AND (phone_wa if provided), else append new.
        guest_query = {
            "user_id": site["user_id"],
            "name": {"$regex": f"^{re.escape(rsvp['name'])}$", "$options": "i"},
        }
        if data.phone_wa:
            guest_query["phone_wa"] = data.phone_wa
        existing_guest = await db.guests.find_one(guest_query)
        status = "attending" if data.attending else "declined"
        if existing_guest:
            await db.guests.update_one(
                {"id": existing_guest["id"]},
                {"$set": {"rsvp_status": status, "phone_wa": data.phone_wa or existing_guest.get("phone_wa", ""), "notes": (data.message or "")[:300]}},
            )
        else:
            await db.guests.insert_one({
                "id": new_id(),
                "user_id": site["user_id"],
                "name": data.name,
                "side": "both",
                "group": "RSVP via website",
                "rsvp_status": status,
                "phone_wa": data.phone_wa or "",
                "meal_pref": "",
                "notes": data.message or "",
                "created_at": now_iso(),
            })
        return {"ok": True}

    @phase2.get("/website/rsvps")
    async def my_rsvps(user=Depends(get_current_user)):
        return await db.rsvps.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


# ============================================================
# VENDOR BOOST SLOTS (Midtrans stub)
# ============================================================
BOOST_TIERS: Dict[str, Dict[str, Any]] = {
    "featured": {"name": "Featured", "price_idr": 499_000, "duration_days": 30, "perks": [
        "Badge Featured di card", "Prioritas urutan di direktori", "1x boost di homepage mingguan",
    ]},
    "premium": {"name": "Premium", "price_idr": 1_499_000, "duration_days": 30, "perks": [
        "Semua di Featured", "Badge Premium berwarna emas", "Spotlight di top-of-fold direktori",
        "Lead inbox prioritas", "Analytics mingguan via email",
    ]},
}

class BoostOrderIn(BaseModel):
    tier: Literal['featured', 'premium']

def _mount_boost(db, get_current_user):
    @phase2.get("/boost/plans")
    async def plans():
        return BOOST_TIERS

    @phase2.get("/boost/mine")
    async def mine(user=Depends(get_current_user)):
        orders = await db.boost_orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return orders

    @phase2.post("/boost/orders")
    async def create_order(data: BoostOrderIn, user=Depends(get_current_user)):
        if user["role"] != "vendor" and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only vendor accounts can purchase boost")
        vendor = await db.vendors.find_one({"owner_user_id": user["id"]})
        if not vendor:
            raise HTTPException(status_code=400, detail="Create your vendor profile first")
        tier_info = BOOST_TIERS[data.tier]
        order = {
            "id": new_id(),
            "user_id": user["id"],
            "vendor_id": vendor["id"],
            "tier": data.tier,
            "amount_idr": tier_info["price_idr"],
            "duration_days": tier_info["duration_days"],
            "status": "pending",
            "midtrans_order_id": f"MT-{new_id()[:12].upper()}",
            "created_at": now_iso(),
            "paid_at": None,
        }
        await db.boost_orders.insert_one(order)
        return _clean(order)

    @phase2.post("/boost/orders/{order_id}/simulate-paid")
    async def simulate_paid(order_id: str, user=Depends(get_current_user)):
        """STUB payment success — flips order to paid and bumps vendor tier."""
        order = await db.boost_orders.find_one({"id": order_id, "user_id": user["id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["status"] == "paid":
            return _clean(order)
        await db.boost_orders.update_one({"id": order_id}, {"$set": {"status": "paid", "paid_at": now_iso()}})
        await db.vendors.update_one({"id": order["vendor_id"]}, {"$set": {"tier": order["tier"]}})
        return _clean(await db.boost_orders.find_one({"id": order_id}))


# ============================================================
# WHATSAPP BLAST (wa.me deeplink, mark delivered on click)
# ============================================================
WA_RE = re.compile(r"\D")
def _wa_number(s: str) -> str:
    s = WA_RE.sub("", s or "")
    if not s:
        return ""
    if s.startswith("0"):
        s = "62" + s[1:]
    return s

class BlastRenderIn(BaseModel):
    message: str = Field(min_length=5, max_length=2000)
    guest_ids: Optional[List[str]] = None   # if None → all guests

class BlastMarkSentIn(BaseModel):
    guest_id: str

def _mount_blast(db, get_current_user):
    @phase2.post("/blast/render")
    async def render(data: BlastRenderIn, user=Depends(get_current_user)):
        q: Dict[str, Any] = {"user_id": user["id"]}
        if data.guest_ids:
            q["id"] = {"$in": data.guest_ids}
        guests = await db.guests.find(q, {"_id": 0}).to_list(5000)
        rendered = []
        for g in guests:
            wa = _wa_number(g.get("phone_wa") or "")
            if not wa:
                continue
            msg = data.message.replace("{nama}", g.get("name", ""))\
                             .replace("{name}", g.get("name", ""))
            rendered.append({
                "guest_id": g["id"],
                "name": g.get("name"),
                "phone_wa": wa,
                "message": msg,
                "wa_url": f"https://wa.me/{wa}?text={_url_encode(msg)}",
                "sent_at": g.get("blast_sent_at", ""),
            })
        return {"count": len(rendered), "guests": rendered}

    @phase2.post("/blast/mark-sent")
    async def mark_sent(data: BlastMarkSentIn, user=Depends(get_current_user)):
        r = await db.guests.update_one(
            {"id": data.guest_id, "user_id": user["id"]},
            {"$set": {"blast_sent_at": now_iso()}},
        )
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Guest not found")
        return {"ok": True}

    @phase2.get("/blast/stats")
    async def stats(user=Depends(get_current_user)):
        total = await db.guests.count_documents({"user_id": user["id"]})
        sent = await db.guests.count_documents({"user_id": user["id"], "blast_sent_at": {"$exists": True, "$ne": ""}})
        with_wa = await db.guests.count_documents({"user_id": user["id"], "phone_wa": {"$exists": True, "$ne": ""}})
        return {"total": total, "with_whatsapp": with_wa, "sent": sent}

def _url_encode(s: str) -> str:
    from urllib.parse import quote
    return quote(s or "", safe="")


# ============================================================
# AI PLANNER ASSISTANT (Claude Sonnet 5.5 streaming)
# ============================================================
_rate_buckets: Dict[str, deque] = defaultdict(deque)
_rsvp_buckets: Dict[str, deque] = defaultdict(deque)
AI_RATE_LIMIT = 30
AI_RATE_WINDOW = 3600  # seconds

def _rate_check(user_id: str) -> bool:
    now = time.time()
    bucket = _rate_buckets[user_id]
    while bucket and bucket[0] < now - AI_RATE_WINDOW:
        bucket.popleft()
    if len(bucket) >= AI_RATE_LIMIT:
        return False
    bucket.append(now)
    return True

SYSTEM_PROMPT = """Kamu adalah **NikahKita AI Planner**, asisten pernikahan Indonesia yang berpengalaman.

Peran kamu:
- Bantu pasangan Indonesia merencanakan pernikahan dari 0.
- Jawab pertanyaan soal adat (Jawa, Sunda, Bali, Minang, Batak, Chinese, Modern), budget wajar dalam IDR, timeline, pilihan vendor, legalitas (KUA, catatan sipil, gereja), undangan digital, dan logistik.
- Berikan jawaban ringkas, aktionable, dalam Bahasa Indonesia yang hangat tapi profesional. Pakai bullet point & angka IDR konkret kalau relevan.
- Kalau user menyinggung angka budget, breakdown ke kategori: Katering, Venue, Dekorasi, MUA & Busana, Dokumentasi, WO, Entertainment, Lain-lain.
- Kalau direkomendasikan vendor konkret, bilang "cek direktori NikahKita untuk filter per kota dan adat"—jangan asal rekomendasi nama brand di luar yang user sebutkan.
- Jangan janjikan harga pasti dari vendor pihak ketiga. Berikan rentang.
- Jangan buat klaim medis, hukum tajam, atau finansial yang sensitif—kalau ditanya legalitas detail (misal syariat/konversi agama), minta user konsultasi ke KUA / pemuka agama.
- Panjang jawaban: 3–8 paragraf pendek. Hindari jawaban terlalu panjang kecuali diminta rinci.
"""

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None
    stream: bool = False

def _mount_ai(db, get_current_user):
    @phase2.get("/ai/sessions")
    async def list_sessions(user=Depends(get_current_user)):
        return await db.ai_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(50)

    @phase2.get("/ai/sessions/{session_id}")
    async def get_session(session_id: str, user=Depends(get_current_user)):
        session = await db.ai_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Not found")
        msgs = await db.ai_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
        session["messages"] = msgs
        return session

    @phase2.post("/ai/chat")
    async def chat(data: ChatIn, user=Depends(get_current_user)):
        if not LLM_AVAILABLE:
            raise HTTPException(status_code=503, detail="AI service unavailable")
        if not _rate_check(user["id"]):
            raise HTTPException(status_code=429, detail="Terlalu banyak pesan. Coba lagi dalam 1 jam.")

        session_id = data.session_id
        if not session_id:
            session_id = new_id()
            await db.ai_sessions.insert_one({
                "id": session_id,
                "user_id": user["id"],
                "title": data.message[:60],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            })
        else:
            s = await db.ai_sessions.find_one({"id": session_id, "user_id": user["id"]})
            if not s:
                raise HTTPException(status_code=404, detail="Session not found")

        # persist user message
        await db.ai_messages.insert_one({
            "id": new_id(),
            "session_id": session_id,
            "role": "user",
            "content": data.message,
            "created_at": now_iso(),
        })

        # load prior messages (persistent memory outside LlmChat)
        prior = await db.ai_messages.find(
            {"session_id": session_id},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1},
        ).sort("created_at", 1).to_list(50)

        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise HTTPException(status_code=503, detail="LLM key not configured")

        # Build system message that includes recent context inline, since LlmChat's internal
        # history starts fresh per instance. We fold the last ~10 turns into the system message as context,
        # then send the latest user message.
        context_lines = []
        for m in prior[:-1][-10:]:
            prefix = "User" if m["role"] == "user" else "Assistant"
            context_lines.append(f"{prefix}: {m['content']}")
        system = SYSTEM_PROMPT
        if context_lines:
            system += "\n\n---\nRiwayat percakapan sebelumnya:\n" + "\n".join(context_lines)

        chat_obj = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-5-5")

        if data.stream:
            async def event_gen():
                full = ""
                try:
                    async for ev in chat_obj.stream_message(UserMessage(text=data.message)):
                        if isinstance(ev, TextDelta):
                            full += ev.content
                            yield f"data: {ev.content}\n\n"
                        elif isinstance(ev, StreamDone):
                            break
                except Exception as e:
                    yield f"event: error\ndata: {str(e)[:200]}\n\n"
                # persist assistant message
                await db.ai_messages.insert_one({
                    "id": new_id(),
                    "session_id": session_id,
                    "role": "assistant",
                    "content": full,
                    "created_at": now_iso(),
                })
                await db.ai_sessions.update_one({"id": session_id}, {"$set": {"updated_at": now_iso()}})
                yield "event: done\ndata: [DONE]\n\n"

            return StreamingResponse(
                event_gen(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )

        # non-streaming
        try:
            resp = await chat_obj.send_message(UserMessage(text=data.message))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:200]}")
        reply = str(resp)
        await db.ai_messages.insert_one({
            "id": new_id(),
            "session_id": session_id,
            "role": "assistant",
            "content": reply,
            "created_at": now_iso(),
        })
        await db.ai_sessions.update_one({"id": session_id}, {"$set": {"updated_at": now_iso()}})
        return {"session_id": session_id, "reply": reply}


# ============================================================
# AI VENDOR RECOMMENDATIONS
# ============================================================
class RecommendIn(BaseModel):
    category: Optional[str] = None   # if None, we pick the biggest line from budget
    city: Optional[str] = None       # defaults to user.city
    limit: int = Field(default=3, ge=1, le=6)

def _mount_recommend(db, get_current_user):
    @phase2.post("/ai/recommend-vendors")
    async def recommend(data: RecommendIn, user=Depends(get_current_user)):
        city = (data.city or user.get("city") or "").strip()
        # Compute an affordable price ceiling from user's budget doc if present
        budget_items = await db.budget.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
        total_budget = sum((b.get("estimated_idr") or 0) for b in budget_items)

        # Which category to recommend
        category = data.category
        if not category and budget_items:
            # pick the category with the largest remaining spend
            def norm(s: str) -> str:
                return (s or "").lower()
            CAT_MAP = {
                "venue": "Venue", "katering": "Katering", "catering": "Katering",
                "fotografer": "Fotografer", "foto": "Fotografer", "dokumentasi": "Fotografer",
                "mua": "MUA", "busana": "MUA", "dekorasi": "Dekorasi", "pelaminan": "Dekorasi",
                "wedding organizer": "Wedding Organizer", "wo": "Wedding Organizer",
                "entertainment": "Entertainment", "band": "Entertainment",
            }
            best = sorted(budget_items, key=lambda b: -(b.get("estimated_idr") or 0))
            for b in best:
                for k, v in CAT_MAP.items():
                    if k in norm(b.get("category", "")):
                        category = v; break
                if category: break
        category = category or "Venue"

        # Build vendor query: approved, matches category, matches city if given, under affordable ceiling (fall back to any price if nothing).
        q: Dict[str, Any] = {"approved": True, "category": category}
        if city:
            q["city"] = city
        # affordable ceiling = 30% of budget total if we have budget, else no cap
        price_cap = int(total_budget * 0.4) if total_budget else 0
        candidates = []
        if price_cap:
            q_cap = {**q, "price_min": {"$lte": price_cap}}
            candidates = await db.vendors.find(q_cap, {"_id": 0}).to_list(50)
        if not candidates:
            candidates = await db.vendors.find(q, {"_id": 0}).to_list(50)
        if not candidates and city:
            # loosen city
            candidates = await db.vendors.find({"approved": True, "category": category}, {"_id": 0}).to_list(50)

        tier_rank = {"premium": 0, "featured": 1, "free": 2}
        candidates.sort(key=lambda v: (tier_rank.get(v.get("tier", "free"), 3), -float(v.get("rating_avg", 0))))
        picks = candidates[: data.limit]
        picks_min = [{
            "id": v["id"], "name": v["name"], "category": v["category"], "city": v["city"],
            "price_min": v.get("price_min", 0), "price_max": v.get("price_max", 0),
            "rating_avg": v.get("rating_avg", 0), "review_count": v.get("review_count", 0),
            "whatsapp": v.get("whatsapp", ""), "cover_image": v.get("cover_image", ""),
            "tier": v.get("tier", "free"), "adat_tags": v.get("adat_tags", []),
        } for v in picks]

        # Generate a short rationale via Claude Sonnet 5.5
        rationale = ""
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if LLM_AVAILABLE and api_key and picks_min:
            lines = [
                f"Nama: {p['name']} ({p['category']}, {p['city']}) — rating {p['rating_avg']}/5 ({p['review_count']} ulasan), harga Rp{p['price_min']:,}–Rp{p['price_max']:,}, tier {p['tier']}"
                for p in picks_min
            ]
            summary_prompt = (
                f"User: pasangan di {city or 'Indonesia'}, total budget Rp{total_budget:,}.\n"
                f"Kamu memilih 3 vendor {category} dari direktori NikahKita untuk mereka:\n"
                + "\n".join(lines)
                + "\n\nTulis 2 paragraf singkat (total <120 kata) dalam Bahasa Indonesia hangat yang: "
                "(1) menjelaskan kenapa 3 vendor ini cocok untuk budget dan kota mereka, "
                "(2) kasih 1 saran konkret pertanyaan untuk tanya ke vendor via WhatsApp. "
                "Jangan sebut harga spesifik dari vendor lain. Jangan pakai bullet point."
            )
            try:
                chat_obj = LlmChat(
                    api_key=api_key,
                    session_id=f"rec-{user['id']}-{int(time.time())}",
                    system_message="Kamu adalah NikahKita AI Planner. Jawab ringkas, hangat, dalam Bahasa Indonesia.",
                ).with_model("anthropic", "claude-sonnet-5-5")
                resp = await chat_obj.send_message(UserMessage(text=summary_prompt))
                rationale = str(resp)
            except Exception as e:
                rationale = f"Rekomendasi untuk {category} di {city or 'kotamu'} berdasarkan rating & budget."

        return {
            "category": category,
            "city": city,
            "budget_total_idr": total_budget,
            "vendors": picks_min,
            "rationale": rationale or f"Rekomendasi {category} di {city or 'kotamu'} berdasarkan rating & budget.",
        }


# ============================================================
# WEDDING DAY TIMELINE
# ============================================================
DEFAULT_TIMELINE = [
    {"time": "05:30", "title": "Siraman", "note": "Prosesi siraman di rumah pengantin wanita", "vendor_name": "", "phase": "pre"},
    {"time": "07:00", "title": "Rias pengantin", "note": "MUA mulai, estimasi 2.5 jam", "vendor_name": "", "phase": "pre"},
    {"time": "09:00", "title": "Akad Nikah", "note": "Ijab kabul dengan penghulu KUA", "vendor_name": "", "phase": "akad"},
    {"time": "11:00", "title": "Foto keluarga", "note": "Foto formal + prewed candid", "vendor_name": "", "phase": "akad"},
    {"time": "13:00", "title": "Transit & istirahat", "note": "Pindah ke venue resepsi, pengantin re-touch", "vendor_name": "", "phase": "transit"},
    {"time": "18:30", "title": "Resepsi dimulai", "note": "Welcome drinks + tamu masuk", "vendor_name": "", "phase": "resepsi"},
    {"time": "19:00", "title": "Entrance pengantin", "note": "Dance in / grand entrance", "vendor_name": "", "phase": "resepsi"},
    {"time": "19:30", "title": "Potong tumpeng / cake", "note": "Prosesi simbolis", "vendor_name": "", "phase": "resepsi"},
    {"time": "20:00", "title": "Live music / entertainment", "note": "Band / DJ set 1", "vendor_name": "", "phase": "resepsi"},
    {"time": "21:30", "title": "After-party", "note": "DJ set & dance floor untuk teman dekat", "vendor_name": "", "phase": "after"},
    {"time": "23:00", "title": "Penutupan", "note": "Closing + sendoff", "vendor_name": "", "phase": "after"},
]

class TimelineItemIn(BaseModel):
    time: str = Field(min_length=4, max_length=5)   # "HH:MM"
    title: str = Field(min_length=1, max_length=120)
    note: Optional[str] = Field(default="", max_length=500)
    vendor_name: Optional[str] = Field(default="", max_length=120)
    phase: Literal['pre', 'akad', 'transit', 'resepsi', 'after'] = 'resepsi'

class TimelineIn(BaseModel):
    items: List[TimelineItemIn]

def _mount_timeline(db, get_current_user):
    @phase2.get("/timeline")
    async def get_timeline(user=Depends(get_current_user)):
        doc = await db.timelines.find_one({"user_id": user["id"]}, {"_id": 0})
        if not doc:
            doc = {
                "user_id": user["id"],
                "items": DEFAULT_TIMELINE,
                "created_at": now_iso(),
            }
            await db.timelines.insert_one(dict(doc))
            doc = {k: v for k, v in doc.items() if k != "_id"}
        return doc

    @phase2.put("/timeline")
    async def put_timeline(data: TimelineIn, user=Depends(get_current_user)):
        items = [i.model_dump() for i in data.items]
        await db.timelines.update_one(
            {"user_id": user["id"]},
            {"$set": {"items": items}, "$setOnInsert": {"user_id": user["id"], "created_at": now_iso()}},
            upsert=True,
        )
        return await db.timelines.find_one({"user_id": user["id"]}, {"_id": 0})


# ============================================================
# MOUNT
# ============================================================
def register_phase2(db, get_current_user):
    _mount_registry(db, get_current_user)
    _mount_website(db, get_current_user)
    _mount_boost(db, get_current_user)
    _mount_blast(db, get_current_user)
    _mount_ai(db, get_current_user)
    _mount_recommend(db, get_current_user)
    _mount_timeline(db, get_current_user)
    return phase2
