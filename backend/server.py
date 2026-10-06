from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'nikahkita-dev-secret-change-me')
JWT_ALG = 'HS256'
JWT_TTL_DAYS = 30

app = FastAPI(title="NikahKita API")
api_router = APIRouter(prefix="/api")

# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_role(user, role: str):
    if user.get("role") != role and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

# ---------- models ----------
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Literal['couple', 'vendor'] = 'couple'
    city: Optional[str] = None
    wedding_date: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class VendorPackage(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    price_idr: int
    dp_percent: int = 30
    inclusions: List[str] = []

class VendorIn(BaseModel):
    name: str
    category: str
    subcategories: List[str] = []
    city: str
    address: Optional[str] = ""
    description: str = ""
    phone: str
    whatsapp: str
    website: Optional[str] = ""
    cover_image: str
    gallery: List[str] = []
    packages: List[VendorPackage] = []
    adat_tags: List[str] = []
    indoor_outdoor: Optional[str] = "both"
    capacity_min: Optional[int] = 0
    capacity_max: Optional[int] = 0
    price_min: int = 0
    price_max: int = 0
    tier: Literal['free', 'featured', 'premium'] = 'free'

class ReviewIn(BaseModel):
    vendor_id: str
    rating: int = Field(ge=1, le=5)
    title: str
    body: str

class InquiryIn(BaseModel):
    vendor_id: str
    event_date: Optional[str] = None
    guest_count: Optional[int] = None
    name: str
    email: EmailStr
    phone: str
    message: str

class ChecklistTaskIn(BaseModel):
    title: str
    bucket: str  # e.g. "12+months", "6months", "weekof"
    due_date: Optional[str] = None
    done: bool = False
    notes: Optional[str] = ""

class BudgetItemIn(BaseModel):
    category: str
    estimated_idr: int = 0
    actual_idr: int = 0
    paid: bool = False
    vendor_name: Optional[str] = ""
    notes: Optional[str] = ""

class GuestIn(BaseModel):
    name: str
    side: Literal['groom', 'bride', 'both'] = 'both'
    group: Optional[str] = ""
    rsvp_status: Literal['pending', 'attending', 'declined'] = 'pending'
    phone_wa: Optional[str] = ""
    meal_pref: Optional[str] = ""
    notes: Optional[str] = ""

# ---------- auth routes ----------
@api_router.post("/auth/signup")
async def signup(data: SignupIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": data.email.lower(),
        "name": data.name,
        "role": data.role,
        "city": data.city or "",
        "wedding_date": data.wedding_date or "",
        "language": "id",
        "password_hash": hash_password(data.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    user_public = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_public}

@api_router.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    user_public = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_public}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ---------- vendor routes ----------
@api_router.get("/vendors")
async def list_vendors(
    category: Optional[str] = None,
    city: Optional[str] = None,
    adat: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_capacity: Optional[int] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "recommended",
    limit: int = 60,
):
    q: dict = {"approved": True}
    if category:
        q["category"] = category
    if city:
        q["city"] = city
    if adat and adat != "all":
        q["adat_tags"] = adat
    if min_price is not None:
        q["price_max"] = {"$gte": min_price}
    if max_price is not None:
        q.setdefault("price_min", {})
        q["price_min"]["$lte"] = max_price
    if min_capacity:
        q["capacity_max"] = {"$gte": min_capacity}
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.vendors.find(q, {"_id": 0}).limit(limit)
    vendors = await cursor.to_list(limit)
    tier_rank = {"premium": 0, "featured": 1, "free": 2}
    if sort == "price_asc":
        vendors.sort(key=lambda v: v.get("price_min", 0))
    elif sort == "price_desc":
        vendors.sort(key=lambda v: v.get("price_min", 0), reverse=True)
    elif sort == "rating":
        vendors.sort(key=lambda v: v.get("rating_avg", 0), reverse=True)
    else:
        vendors.sort(key=lambda v: (tier_rank.get(v.get("tier", "free"), 3), -v.get("rating_avg", 0)))
    return vendors

@api_router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str):
    vendor = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    reviews = await db.reviews.find({"vendor_id": vendor_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    vendor["reviews"] = reviews
    return vendor

@api_router.post("/vendors")
async def create_vendor(data: VendorIn, user=Depends(get_current_user)):
    if user["role"] not in ("vendor", "admin"):
        raise HTTPException(status_code=403, detail="Only vendor accounts can create listings")
    vendor = data.model_dump()
    vendor["id"] = new_id()
    vendor["slug"] = vendor["name"].lower().replace(" ", "-") + "-" + vendor["id"][:6]
    vendor["owner_user_id"] = user["id"]
    vendor["approved"] = user["role"] == "admin"
    vendor["verified"] = False
    vendor["rating_avg"] = 0
    vendor["review_count"] = 0
    vendor["created_at"] = now_iso()
    await db.vendors.insert_one(vendor)
    return {k: v for k, v in vendor.items() if k != "_id"}

@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, data: VendorIn, user=Depends(get_current_user)):
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if vendor["owner_user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your vendor")
    update = data.model_dump()
    await db.vendors.update_one({"id": vendor_id}, {"$set": update})
    v = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    return v

@api_router.get("/my/vendor")
async def my_vendor(user=Depends(get_current_user)):
    vendor = await db.vendors.find_one({"owner_user_id": user["id"]}, {"_id": 0})
    return vendor

# ---------- reviews ----------
@api_router.post("/reviews")
async def create_review(data: ReviewIn, user=Depends(get_current_user)):
    review = data.model_dump()
    review["id"] = new_id()
    review["user_id"] = user["id"]
    review["user_name"] = user["name"]
    review["created_at"] = now_iso()
    await db.reviews.insert_one(review)
    # update rating aggregate
    agg = await db.reviews.aggregate([
        {"$match": {"vendor_id": data.vendor_id}},
        {"$group": {"_id": "$vendor_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    if agg:
        await db.vendors.update_one(
            {"id": data.vendor_id},
            {"$set": {"rating_avg": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}},
        )
    return {k: v for k, v in review.items() if k != "_id"}

# ---------- favorites ----------
@api_router.post("/favorites/{vendor_id}")
async def toggle_favorite(vendor_id: str, user=Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "vendor_id": vendor_id})
    if existing:
        await db.favorites.delete_one({"user_id": user["id"], "vendor_id": vendor_id})
        return {"favorited": False}
    await db.favorites.insert_one({
        "user_id": user["id"],
        "vendor_id": vendor_id,
        "created_at": now_iso(),
    })
    return {"favorited": True}

@api_router.get("/favorites")
async def list_favorites(user=Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    vendor_ids = [f["vendor_id"] for f in favs]
    vendors = await db.vendors.find({"id": {"$in": vendor_ids}}, {"_id": 0}).to_list(500)
    return vendors

# ---------- inquiries ----------
@api_router.post("/inquiries")
async def create_inquiry(data: InquiryIn):
    inquiry = data.model_dump()
    inquiry["id"] = new_id()
    inquiry["status"] = "new"
    inquiry["created_at"] = now_iso()
    await db.inquiries.insert_one(inquiry)
    return {k: v for k, v in inquiry.items() if k != "_id"}

@api_router.get("/my/inquiries")
async def my_inquiries(user=Depends(get_current_user)):
    """Vendor sees inquiries for their vendor. Couples see empty."""
    vendor = await db.vendors.find_one({"owner_user_id": user["id"]})
    if not vendor:
        return []
    inq = await db.inquiries.find({"vendor_id": vendor["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return inq

# ---------- planning tools: checklist / budget / guests ----------
async def crud_list(coll, user_id):
    return await db[coll].find({"user_id": user_id}, {"_id": 0}).to_list(1000)

@api_router.get("/checklist")
async def get_checklist(user=Depends(get_current_user)):
    items = await crud_list("checklist", user["id"])
    if not items:
        # seed starter template
        presets = [
            ("12+months", "Set keseluruhan budget pernikahan"),
            ("12+months", "Pilih tanggal dan tipe adat"),
            ("12+months", "Booking venue utama"),
            ("10months", "Booking fotografer & videografer"),
            ("8months", "Booking katering"),
            ("8months", "Booking WO / Wedding Organizer"),
            ("6months", "Pilih MUA dan jadwalkan trial makeup"),
            ("6months", "Booking dekorasi & pelaminan"),
            ("4months", "Finalisasi busana (akad + resepsi)"),
            ("4months", "Design undangan digital"),
            ("2months", "Sebar undangan via WhatsApp"),
            ("2months", "Final tasting katering"),
            ("1month", "Technical meeting dengan WO"),
            ("2weeks", "Pelunasan DP vendor"),
            ("weekof", "Siraman & midodareni"),
            ("dayof", "Akad & resepsi"),
            ("after", "Thank you message ke tamu & vendor"),
        ]
        docs = []
        for bucket, title in presets:
            docs.append({
                "id": new_id(),
                "user_id": user["id"],
                "title": title,
                "bucket": bucket,
                "done": False,
                "due_date": "",
                "notes": "",
                "created_at": now_iso(),
            })
        if docs:
            await db.checklist.insert_many(docs)
        items = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
    return items

@api_router.post("/checklist")
async def add_task(data: ChecklistTaskIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = new_id()
    doc["user_id"] = user["id"]
    doc["created_at"] = now_iso()
    await db.checklist.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/checklist/{item_id}")
async def update_task(item_id: str, data: ChecklistTaskIn, user=Depends(get_current_user)):
    await db.checklist.update_one({"id": item_id, "user_id": user["id"]}, {"$set": data.model_dump()})
    doc = await db.checklist.find_one({"id": item_id}, {"_id": 0})
    return doc

@api_router.delete("/checklist/{item_id}")
async def delete_task(item_id: str, user=Depends(get_current_user)):
    await db.checklist.delete_one({"id": item_id, "user_id": user["id"]})
    return {"ok": True}

@api_router.get("/budget")
async def get_budget(user=Depends(get_current_user)):
    items = await crud_list("budget", user["id"])
    if not items:
        presets = [
            ("Katering", 60_000_000),
            ("Venue / Gedung", 40_000_000),
            ("Dekorasi & Pelaminan", 25_000_000),
            ("MUA & Busana", 20_000_000),
            ("Dokumentasi (Foto + Video)", 20_000_000),
            ("Wedding Organizer", 10_000_000),
            ("Entertainment", 7_000_000),
            ("Undangan Digital & Souvenir", 5_000_000),
            ("Lain-lain", 3_000_000),
        ]
        docs = []
        for cat, est in presets:
            docs.append({
                "id": new_id(),
                "user_id": user["id"],
                "category": cat,
                "estimated_idr": est,
                "actual_idr": 0,
                "paid": False,
                "vendor_name": "",
                "notes": "",
                "created_at": now_iso(),
            })
        if docs:
            await db.budget.insert_many(docs)
        items = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
    return items

@api_router.post("/budget")
async def add_budget(data: BudgetItemIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = new_id()
    doc["user_id"] = user["id"]
    doc["created_at"] = now_iso()
    await db.budget.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/budget/{item_id}")
async def update_budget(item_id: str, data: BudgetItemIn, user=Depends(get_current_user)):
    await db.budget.update_one({"id": item_id, "user_id": user["id"]}, {"$set": data.model_dump()})
    doc = await db.budget.find_one({"id": item_id}, {"_id": 0})
    return doc

@api_router.delete("/budget/{item_id}")
async def delete_budget(item_id: str, user=Depends(get_current_user)):
    await db.budget.delete_one({"id": item_id, "user_id": user["id"]})
    return {"ok": True}

@api_router.get("/guests")
async def get_guests(user=Depends(get_current_user)):
    return await crud_list("guests", user["id"])

@api_router.post("/guests")
async def add_guest(data: GuestIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = new_id()
    doc["user_id"] = user["id"]
    doc["created_at"] = now_iso()
    await db.guests.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/guests/{item_id}")
async def update_guest(item_id: str, data: GuestIn, user=Depends(get_current_user)):
    await db.guests.update_one({"id": item_id, "user_id": user["id"]}, {"$set": data.model_dump()})
    doc = await db.guests.find_one({"id": item_id}, {"_id": 0})
    return doc

@api_router.delete("/guests/{item_id}")
async def delete_guest(item_id: str, user=Depends(get_current_user)):
    await db.guests.delete_one({"id": item_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- real weddings ----------
@api_router.get("/real-weddings")
async def list_real_weddings(adat: Optional[str] = None, city: Optional[str] = None):
    q = {}
    if adat and adat != "all":
        q["adat"] = adat
    if city:
        q["city"] = city
    items = await db.real_weddings.find(q, {"_id": 0}).to_list(100)
    return items

@api_router.get("/real-weddings/{wedding_id}")
async def get_real_wedding(wedding_id: str):
    item = await db.real_weddings.find_one({"id": wedding_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item

# ---------- admin ----------
@api_router.get("/admin/pending-vendors")
async def pending_vendors(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return await db.vendors.find({"approved": False}, {"_id": 0}).to_list(200)

@api_router.post("/admin/approve-vendor/{vendor_id}")
async def approve_vendor(vendor_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.vendors.update_one({"id": vendor_id}, {"$set": {"approved": True, "verified": True}})
    return {"ok": True}

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return {
        "users": await db.users.count_documents({}),
        "vendors": await db.vendors.count_documents({"approved": True}),
        "pending_vendors": await db.vendors.count_documents({"approved": False}),
        "inquiries": await db.inquiries.count_documents({}),
        "reviews": await db.reviews.count_documents({}),
    }

# ---------- seed ----------
@api_router.post("/seed")
async def seed_data():
    """Idempotent seed. Can be called many times."""
    from seed_data import SEED_VENDORS, SEED_REAL_WEDDINGS, SEED_REVIEWS

    # admin account
    admin_email = "admin@nikahkita.id"
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "name": "NikahKita Admin",
            "role": "admin",
            "city": "Jakarta",
            "wedding_date": "",
            "language": "id",
            "password_hash": hash_password("admin123"),
            "created_at": now_iso(),
        })

    # demo couple
    couple_email = "demo@nikahkita.id"
    if not await db.users.find_one({"email": couple_email}):
        await db.users.insert_one({
            "id": new_id(),
            "email": couple_email,
            "name": "Pasangan Demo",
            "role": "couple",
            "city": "Jakarta",
            "wedding_date": "2026-10-20",
            "language": "id",
            "password_hash": hash_password("demo123"),
            "created_at": now_iso(),
        })

    # demo vendor owner
    vendor_owner_email = "vendor@nikahkita.id"
    vendor_owner = await db.users.find_one({"email": vendor_owner_email})
    if not vendor_owner:
        vendor_owner = {
            "id": new_id(),
            "email": vendor_owner_email,
            "name": "Vendor Demo",
            "role": "vendor",
            "city": "Jakarta",
            "wedding_date": "",
            "language": "id",
            "password_hash": hash_password("vendor123"),
            "created_at": now_iso(),
        }
        await db.users.insert_one(vendor_owner)

    # vendors
    inserted = 0
    for v in SEED_VENDORS:
        if await db.vendors.find_one({"slug": v["slug"]}):
            continue
        doc = {**v}
        doc["owner_user_id"] = vendor_owner["id"]
        doc["approved"] = True
        doc["verified"] = True
        doc["rating_avg"] = v.get("rating_avg", 4.8)
        doc["review_count"] = v.get("review_count", 12)
        doc["created_at"] = now_iso()
        await db.vendors.insert_one(doc)
        inserted += 1

    # real weddings
    for rw in SEED_REAL_WEDDINGS:
        if await db.real_weddings.find_one({"id": rw["id"]}):
            continue
        await db.real_weddings.insert_one({**rw, "created_at": now_iso()})

    # reviews
    for rev in SEED_REVIEWS:
        if await db.reviews.find_one({"id": rev["id"]}):
            continue
        await db.reviews.insert_one({**rev, "created_at": now_iso()})

    return {"vendors_added": inserted, "ok": True}

@api_router.get("/")
async def root():
    return {"service": "NikahKita API", "status": "ok"}

# Phase 2 features: Registry, Website Builder, Vendor Boost, WA Blast, AI Planner
from phase2 import register_phase2
api_router.include_router(register_phase2(db, get_current_user))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
