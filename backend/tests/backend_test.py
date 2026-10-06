"""NikahKita backend API tests - comprehensive coverage."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    # fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

DEMO_COUPLE = ("demo@nikahkita.id", "demo123")
DEMO_VENDOR = ("vendor@nikahkita.id", "vendor123")
DEMO_ADMIN = ("admin@nikahkita.id", "admin123")


@pytest.fixture(scope="session")
def seeded():
    r = requests.post(f"{API}/seed", timeout=60)
    assert r.status_code == 200
    return r.json()


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def couple_token(seeded):
    return _login(*DEMO_COUPLE)


@pytest.fixture(scope="session")
def vendor_token(seeded):
    return _login(*DEMO_VENDOR)


@pytest.fixture(scope="session")
def admin_token(seeded):
    return _login(*DEMO_ADMIN)


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- basic ----------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_seed_idempotent(seeded):
    r = requests.post(f"{API}/seed", timeout=60)
    assert r.status_code == 200
    assert r.json()["vendors_added"] == 0  # already seeded


# ---------- auth ----------
def test_login_demo(seeded):
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_COUPLE[0], "password": DEMO_COUPLE[1]})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data and data["user"]["email"] == DEMO_COUPLE[0]


def test_login_wrong_password(seeded):
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_COUPLE[0], "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_with_token(couple_token):
    r = requests.get(f"{API}/auth/me", headers=auth(couple_token))
    assert r.status_code == 200
    assert r.json()["email"] == DEMO_COUPLE[0]


def test_signup_new_couple(seeded):
    email = f"TEST_{uuid.uuid4().hex[:8]}@nikahkita.id"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "testpass123", "name": "Test User", "role": "couple"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["email"] == email.lower()
    assert data["user"]["role"] == "couple"
    assert "token" in data


# ---------- vendors ----------
def test_list_vendors(seeded):
    r = requests.get(f"{API}/vendors")
    assert r.status_code == 200
    vendors = r.json()
    assert len(vendors) >= 30, f"expected ~32 vendors, got {len(vendors)}"


def test_filter_vendors_fotografer(seeded):
    r = requests.get(f"{API}/vendors", params={"category": "Fotografer"})
    assert r.status_code == 200
    vendors = r.json()
    assert len(vendors) > 0
    assert all(v["category"] == "Fotografer" for v in vendors)


def test_filter_vendors_city(seeded):
    r = requests.get(f"{API}/vendors", params={"city": "Jakarta"})
    assert r.status_code == 200
    assert all(v["city"] == "Jakarta" for v in r.json())


def test_filter_vendors_adat_jawa(seeded):
    r = requests.get(f"{API}/vendors", params={"adat": "Jawa"})
    assert r.status_code == 200
    for v in r.json():
        assert "Jawa" in v.get("adat_tags", [])


def test_sort_price_asc(seeded):
    r = requests.get(f"{API}/vendors", params={"sort": "price_asc"})
    vs = r.json()
    prices = [v.get("price_min", 0) for v in vs]
    assert prices == sorted(prices)


def test_sort_price_desc(seeded):
    r = requests.get(f"{API}/vendors", params={"sort": "price_desc"})
    vs = r.json()
    prices = [v.get("price_min", 0) for v in vs]
    assert prices == sorted(prices, reverse=True)


def test_sort_rating(seeded):
    r = requests.get(f"{API}/vendors", params={"sort": "rating"})
    vs = r.json()
    ratings = [v.get("rating_avg", 0) for v in vs]
    assert ratings == sorted(ratings, reverse=True)


def test_vendor_detail_with_reviews(seeded):
    r = requests.get(f"{API}/vendors/vendor-001")
    assert r.status_code == 200
    v = r.json()
    assert v["id"] == "vendor-001"
    assert "reviews" in v
    assert isinstance(v["reviews"], list)


# ---------- favorites ----------
def test_favorites_toggle(couple_token, seeded):
    vendor_id = "vendor-001"
    # ensure clean state - toggle twice
    r1 = requests.post(f"{API}/favorites/{vendor_id}", headers=auth(couple_token))
    assert r1.status_code == 200
    first = r1.json()["favorited"]
    r2 = requests.post(f"{API}/favorites/{vendor_id}", headers=auth(couple_token))
    assert r2.json()["favorited"] != first
    # set to favorited
    r3 = requests.post(f"{API}/favorites/{vendor_id}", headers=auth(couple_token))
    if not r3.json()["favorited"]:
        requests.post(f"{API}/favorites/{vendor_id}", headers=auth(couple_token))
    r4 = requests.get(f"{API}/favorites", headers=auth(couple_token))
    assert r4.status_code == 200
    assert any(v["id"] == vendor_id for v in r4.json())


# ---------- inquiries ----------
def test_inquiry_public_and_vendor_sees(seeded, vendor_token):
    # pick a vendor owned by vendor_token user
    r = requests.get(f"{API}/vendors", params={"limit": 1})
    vid = r.json()[0]["id"]
    payload = {
        "vendor_id": vid, "name": "TEST Inquirer", "email": "test_inq@example.com",
        "phone": "08111111111", "message": "TEST inquiry", "guest_count": 100
    }
    r2 = requests.post(f"{API}/inquiries", json=payload)
    assert r2.status_code == 200
    # vendor should see it
    r3 = requests.get(f"{API}/my/inquiries", headers=auth(vendor_token))
    assert r3.status_code == 200
    inqs = r3.json()
    assert any(i.get("message") == "TEST inquiry" for i in inqs)


# ---------- planning tools ----------
def test_checklist_preseed(seeded):
    # use a fresh user to verify preseed template
    email = f"TEST_cl_{uuid.uuid4().hex[:6]}@nikahkita.id"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "pass1234", "name": "Checklist Tester", "role": "couple"
    })
    tok = r.json()["token"]
    r2 = requests.get(f"{API}/checklist", headers=auth(tok))
    assert r2.status_code == 200
    items = r2.json()
    assert 15 <= len(items) <= 20, f"expected ~17 preseeded, got {len(items)}"


def test_checklist_crud(couple_token):
    r = requests.post(f"{API}/checklist", headers=auth(couple_token), json={
        "title": "TEST task", "bucket": "6months", "done": False
    })
    assert r.status_code == 200
    tid = r.json()["id"]
    r2 = requests.put(f"{API}/checklist/{tid}", headers=auth(couple_token), json={
        "title": "TEST task", "bucket": "6months", "done": True
    })
    assert r2.status_code == 200 and r2.json()["done"] is True
    r3 = requests.delete(f"{API}/checklist/{tid}", headers=auth(couple_token))
    assert r3.status_code == 200


def test_budget_preseed_new_user():
    email = f"TEST_bu_{uuid.uuid4().hex[:6]}@nikahkita.id"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "pass1234", "name": "Budget Tester", "role": "couple"
    })
    tok = r.json()["token"]
    r2 = requests.get(f"{API}/budget", headers=auth(tok))
    assert r2.status_code == 200
    items = r2.json()
    assert len(items) == 9, f"expected 9 budget categories, got {len(items)}"


def test_guests_crud(couple_token):
    r = requests.post(f"{API}/guests", headers=auth(couple_token), json={
        "name": "TEST Guest", "side": "bride", "rsvp_status": "pending"
    })
    assert r.status_code == 200
    gid = r.json()["id"]
    r2 = requests.put(f"{API}/guests/{gid}", headers=auth(couple_token), json={
        "name": "TEST Guest", "side": "bride", "rsvp_status": "attending"
    })
    assert r2.json()["rsvp_status"] == "attending"
    r3 = requests.delete(f"{API}/guests/{gid}", headers=auth(couple_token))
    assert r3.status_code == 200


# ---------- real weddings ----------
def test_real_weddings_list(seeded):
    r = requests.get(f"{API}/real-weddings")
    assert r.status_code == 200
    assert len(r.json()) == 10


def test_real_wedding_detail(seeded):
    r = requests.get(f"{API}/real-weddings/rw-001")
    assert r.status_code == 200
    data = r.json()
    assert "vendor_credits" in data
    # should mention Andini / Raka
    text = (data.get("couple_names") or "") + " " + (data.get("title") or "")
    assert "Andini" in text or "Raka" in text


# ---------- admin ----------
def test_admin_pending_requires_admin(couple_token):
    r = requests.get(f"{API}/admin/pending-vendors", headers=auth(couple_token))
    assert r.status_code == 403


def test_admin_stats(admin_token):
    r = requests.get(f"{API}/admin/stats", headers=auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    for k in ("users", "vendors", "pending_vendors", "inquiries", "reviews"):
        assert k in data


def test_admin_approve_vendor_flow(admin_token, seeded):
    # create a new vendor signup then create a pending vendor via API
    email = f"TEST_vdr_{uuid.uuid4().hex[:6]}@nikahkita.id"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "pass1234", "name": "Vendor Tester", "role": "vendor"
    })
    vtok = r.json()["token"]
    create = requests.post(f"{API}/vendors", headers=auth(vtok), json={
        "name": "TEST Vendor Co", "category": "Fotografer", "city": "Jakarta",
        "phone": "0812", "whatsapp": "0812", "cover_image": "https://x", "description": "TEST"
    })
    assert create.status_code == 200
    vid = create.json()["id"]
    assert create.json()["approved"] is False
    # approve
    ap = requests.post(f"{API}/admin/approve-vendor/{vid}", headers=auth(admin_token))
    assert ap.status_code == 200
    # verify
    g = requests.get(f"{API}/vendors/{vid}")
    assert g.json()["approved"] is True and g.json()["verified"] is True
