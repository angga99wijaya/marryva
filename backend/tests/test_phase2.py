"""Phase 2 backend tests: Registry, Website, Boost, Blast, AI."""
import os
import uuid
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

DEMO_COUPLE = ("demo@nikahkita.id", "demo123")
DEMO_VENDOR = ("vendor@nikahkita.id", "vendor123")
DEMO_ADMIN = ("admin@nikahkita.id", "admin123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def couple_token():
    requests.post(f"{API}/seed", timeout=60)
    return _login(*DEMO_COUPLE)


@pytest.fixture(scope="module")
def vendor_token():
    return _login(*DEMO_VENDOR)


# ========== REGISTRY ==========
class TestRegistry:
    def test_registry_requires_auth(self):
        r = requests.get(f"{API}/registry")
        assert r.status_code == 401

    def test_registry_put_requires_auth(self):
        r = requests.put(f"{API}/registry", json={"enabled": True, "message": "x", "bank_accounts": [], "thank_you_message": "y"})
        assert r.status_code == 401

    def test_get_registry_creates_default_and_idempotent(self, couple_token):
        r1 = requests.get(f"{API}/registry", headers=auth(couple_token))
        assert r1.status_code == 200
        d1 = r1.json()
        assert "enabled" in d1 and "bank_accounts" in d1 and "contributions" in d1
        assert d1["user_id"]
        r2 = requests.get(f"{API}/registry", headers=auth(couple_token))
        assert r2.status_code == 200
        assert r2.json()["user_id"] == d1["user_id"]

    def test_update_registry(self, couple_token):
        payload = {
            "enabled": True,
            "message": "TEST message",
            "qris_image_url": "https://example.com/qris.png",
            "bank_accounts": [{"bank": "BCA", "account_number": "1234567890", "account_holder": "TEST User"}],
            "thank_you_message": "TEST thanks",
        }
        r = requests.put(f"{API}/registry", json=payload, headers=auth(couple_token))
        assert r.status_code == 200
        d = r.json()
        assert d["enabled"] is True
        assert d["qris_image_url"] == payload["qris_image_url"]
        assert len(d["bank_accounts"]) == 1
        assert d["bank_accounts"][0]["bank"] == "BCA"
        # GET verifies persistence
        g = requests.get(f"{API}/registry", headers=auth(couple_token)).json()
        assert g["message"] == "TEST message"

    def test_contribution_crud_and_total(self, couple_token):
        before = requests.get(f"{API}/registry", headers=auth(couple_token)).json()
        before_total = before.get("total_idr", 0)
        r = requests.post(f"{API}/registry/contributions", headers=auth(couple_token), json={
            "name": "TEST Donor", "amount_idr": 500_000, "method": "QRIS", "note": "test"
        })
        assert r.status_code == 200
        cid = r.json()["id"]
        after = requests.get(f"{API}/registry", headers=auth(couple_token)).json()
        assert after["total_idr"] == before_total + 500_000
        # mark thanked
        t = requests.post(f"{API}/registry/contributions/{cid}/thanked", headers=auth(couple_token))
        assert t.status_code == 200
        after2 = requests.get(f"{API}/registry", headers=auth(couple_token)).json()
        matching = [c for c in after2["contributions"] if c["id"] == cid]
        assert matching and matching[0]["thanked"] is True
        # delete
        d = requests.delete(f"{API}/registry/contributions/{cid}", headers=auth(couple_token))
        assert d.status_code == 200
        after3 = requests.get(f"{API}/registry", headers=auth(couple_token)).json()
        assert not any(c["id"] == cid for c in after3["contributions"])


# ========== BOOST ==========
class TestBoost:
    def test_plans_no_auth(self):
        r = requests.get(f"{API}/boost/plans")
        assert r.status_code == 200
        plans = r.json()
        assert "featured" in plans and "premium" in plans
        assert plans["featured"]["price_idr"] > 0

    def test_couple_cannot_order(self, couple_token):
        r = requests.post(f"{API}/boost/orders", json={"tier": "featured"}, headers=auth(couple_token))
        assert r.status_code == 403

    def test_order_requires_auth(self):
        r = requests.post(f"{API}/boost/orders", json={"tier": "featured"})
        assert r.status_code == 401

    def test_vendor_order_and_simulate_paid(self, vendor_token):
        # ensure vendor record exists
        me_v = requests.get(f"{API}/my/vendor", headers=auth(vendor_token))
        assert me_v.status_code == 200, me_v.text
        vendor = me_v.json()
        assert vendor and vendor.get("id")
        vendor_id = vendor["id"]
        r = requests.post(f"{API}/boost/orders", json={"tier": "premium"}, headers=auth(vendor_token))
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "pending"
        assert order["tier"] == "premium"
        oid = order["id"]
        # simulate payment
        p = requests.post(f"{API}/boost/orders/{oid}/simulate-paid", headers=auth(vendor_token))
        assert p.status_code == 200
        assert p.json()["status"] == "paid"
        # verify vendor tier bumped
        v = requests.get(f"{API}/vendors/{vendor_id}").json()
        assert v.get("tier") == "premium"

    def test_vendor_without_profile_gets_400(self):
        # make a fresh vendor signup, no vendor profile yet
        email = f"TEST_boost_{uuid.uuid4().hex[:6]}@nikahkita.id"
        r = requests.post(f"{API}/auth/signup", json={
            "email": email, "password": "pass1234", "name": "Boost Tester", "role": "vendor"
        })
        tok = r.json()["token"]
        o = requests.post(f"{API}/boost/orders", json={"tier": "featured"}, headers=auth(tok))
        assert o.status_code == 400


# ========== WEBSITE ==========
class TestWebsite:
    SLUG = "wire-ui-deep-dive"

    def test_create_or_update_website(self, couple_token):
        # Save with the test slug deterministically by using exact names likely to slugify to that
        payload = {
            "template": "jawa",
            "bride_name": "Wire",
            "groom_name": "UI Deep Dive",
            "wedding_date": "2026-10-10",
            "events": [{"title": "Akad", "date": "2026-10-10", "time": "08:00", "venue": "Masjid X", "address": "Jakarta"}],
            "gallery": [],
            "rsvp_enabled": True,
            "registry_enabled": True,
            "published": False,
        }
        r1 = requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))
        assert r1.status_code == 200, r1.text
        site1 = r1.json()
        slug = site1["slug"]
        # Second save → slug stable
        payload["bride_name"] = "Wire2"
        r2 = requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))
        assert r2.status_code == 200
        assert r2.json()["slug"] == slug

    def test_public_unpublished_returns_404(self, couple_token):
        mine = requests.get(f"{API}/website/mine", headers=auth(couple_token)).json()
        slug = mine["slug"]
        # ensure unpublished first
        payload = {k: mine.get(k) for k in [
            "template","bride_name","groom_name","bride_parents","groom_parents",
            "wedding_date","cover_image","story","events","gallery",
            "rsvp_enabled","registry_enabled","password","published"
        ]}
        payload["published"] = False
        payload["password"] = ""
        requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))
        r = requests.get(f"{API}/website/public/{slug}")
        assert r.status_code == 404

    def test_public_published_and_password_gate(self, couple_token):
        mine = requests.get(f"{API}/website/mine", headers=auth(couple_token)).json()
        slug = mine["slug"]
        payload = {k: mine.get(k) for k in [
            "template","bride_name","groom_name","bride_parents","groom_parents",
            "wedding_date","cover_image","story","events","gallery",
            "rsvp_enabled","registry_enabled","password","published"
        ]}
        payload["published"] = True
        payload["password"] = "secret123"
        r = requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))
        assert r.status_code == 200
        # No password → locked
        locked = requests.get(f"{API}/website/public/{slug}").json()
        assert locked.get("locked") is True
        # Wrong password → still locked (no leak)
        wrong = requests.get(f"{API}/website/public/{slug}", params={"password": "nope"}).json()
        assert wrong.get("locked") is True
        assert "events" not in wrong
        # Correct password → full
        ok = requests.get(f"{API}/website/public/{slug}", params={"password": "secret123"}).json()
        assert ok.get("locked") is not True
        assert ok.get("bride_name")
        assert "password" not in ok  # should be stripped

        # Clear password for RSVP test
        payload["password"] = ""
        requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))

    def test_rsvp_syncs_to_guest_list_new_and_existing(self, couple_token):
        mine = requests.get(f"{API}/website/mine", headers=auth(couple_token)).json()
        slug = mine["slug"]
        # ensure published, no password
        payload = {k: mine.get(k) for k in [
            "template","bride_name","groom_name","bride_parents","groom_parents",
            "wedding_date","cover_image","story","events","gallery",
            "rsvp_enabled","registry_enabled","password","published"
        ]}
        payload["published"] = True
        payload["password"] = ""
        requests.put(f"{API}/website/mine", json=payload, headers=auth(couple_token))

        unique_name = f"TEST RSVP {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/website/public/{slug}/rsvp", json={
            "name": unique_name, "attending": True, "phone_wa": "081234567890", "message": "hadir", "guests": 2
        })
        assert r.status_code == 200
        # verify guest created
        guests = requests.get(f"{API}/guests", headers=auth(couple_token)).json()
        matching = [g for g in guests if g["name"] == unique_name]
        assert matching and matching[0]["rsvp_status"] == "attending"

        # second RSVP: existing guest flips status
        r2 = requests.post(f"{API}/website/public/{slug}/rsvp", json={
            "name": unique_name, "attending": False, "phone_wa": "", "message": "", "guests": 1
        })
        assert r2.status_code == 200
        guests2 = requests.get(f"{API}/guests", headers=auth(couple_token)).json()
        matching2 = [g for g in guests2 if g["name"] == unique_name]
        assert len(matching2) == 1  # not duplicated
        assert matching2[0]["rsvp_status"] == "declined"


# ========== BLAST ==========
class TestBlast:
    def test_render_requires_auth(self):
        r = requests.post(f"{API}/blast/render", json={"message": "hello {nama} {link}"})
        assert r.status_code == 401

    def test_render_and_mark_sent(self, couple_token):
        # ensure one guest with WA
        gname = f"TEST WA {uuid.uuid4().hex[:6]}"
        gr = requests.post(f"{API}/guests", headers=auth(couple_token), json={
            "name": gname, "side": "bride", "rsvp_status": "pending", "phone_wa": "081200000000"
        })
        assert gr.status_code == 200
        gid = gr.json()["id"]

        r = requests.post(f"{API}/blast/render", headers=auth(couple_token), json={
            "message": "Halo {nama}, undangan: {link}"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 1
        entry = next((g for g in data["guests"] if g["guest_id"] == gid), None)
        assert entry is not None
        assert "wa.me/" in entry["wa_url"]
        assert gname in entry["message"]
        assert "6281200000000" in entry["wa_url"]  # 0 → 62 prefix

        # mark sent
        ms = requests.post(f"{API}/blast/mark-sent", headers=auth(couple_token), json={"guest_id": gid})
        assert ms.status_code == 200

        # stats
        st = requests.get(f"{API}/blast/stats", headers=auth(couple_token))
        assert st.status_code == 200
        stats = st.json()
        for key in ("total", "with_whatsapp", "sent"):
            assert key in stats
        assert stats["sent"] >= 1

        # cleanup
        requests.delete(f"{API}/guests/{gid}", headers=auth(couple_token))


# ========== AI ==========
class TestAI:
    def test_ai_requires_auth(self):
        r = requests.post(f"{API}/ai/chat", json={"message": "halo"})
        assert r.status_code == 401

    def test_ai_empty_message_400(self, couple_token):
        r = requests.post(f"{API}/ai/chat", json={"message": "", "stream": False}, headers=auth(couple_token))
        assert r.status_code in (400, 422)

    def test_ai_chat_non_stream(self, couple_token):
        r = requests.post(
            f"{API}/ai/chat",
            json={"message": "Halo, 500 juta untuk 500 tamu di Jakarta, mulai dari mana?", "stream": False},
            headers=auth(couple_token),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_id")
        assert data.get("reply")
        assert len(data["reply"]) > 20
