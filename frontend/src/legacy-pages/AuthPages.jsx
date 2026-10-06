import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

export function SigninPage() {
  const { login, resetPassword } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isPasswordReset = params.get("reset") === "complete";
  const [newPassword, setNewPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await login(email, password);
      toast.success("Selamat datang kembali");
      nav("/");
    } catch (error) {
      const message = typeof error?.message === "string" ? error.message : "";
      if (/legacy api keys? are disabled|invalid api key/i.test(message)) {
        toast.error("Login belum tersedia: API key Supabase di deployment sudah dinonaktifkan. Administrator perlu memperbarui NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di Vercel dan melakukan redeploy.");
      } else if (/invalid login credentials/i.test(message)) {
        toast.error("Email atau password salah");
      } else {
        console.error("Sign-in failed.", {
          name: error?.name,
          status: error?.status,
          code: error?.code,
        });
        toast.error("Login gagal. Periksa koneksi dan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email) { toast.error("Masukkan email terlebih dahulu"); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success("Jika akun tersedia, tautan pengaturan ulang akan dikirim ke email Anda.");
    } catch (error) {
      console.error("Password reset email request failed.", error);
      toast.error("Gagal meminta pengaturan ulang kata sandi");
    } finally {
      setLoading(false);
    }
  };

  const saveNewPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const { data: current, error: currentError } = await supabase.auth.getUser();
      if (currentError) throw currentError;
      await api.post("/auth/profile", {
        name: updated.user.user_metadata?.name || current.user?.email || "NikahKita user",
      });
      toast.success("Kata sandi berhasil diperbarui. Silakan masuk.");
      nav("/signin");
    } catch (error) {
      console.error("Password update failed.", error);
      toast.error("Tautan kedaluwarsa atau kata sandi tidak memenuhi persyaratan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <section className="nk-container max-w-md pt-16 pb-24">
        <div className="nk-overline mb-3">Masuk</div>
        <h1 className="nk-h2 mb-6">{isPasswordReset ? "Atur ulang kata sandi" : "Selamat datang kembali"}</h1>
        {params.get("reset") === "sent" && <p className="mb-4 text-sm text-emerald-800">Periksa email Anda untuk tautan pengaturan ulang kata sandi.</p>}
        {params.get("confirmation") === "sent" && <p className="mb-4 text-sm text-emerald-800">Periksa email Anda untuk mengonfirmasi akun.</p>}
        {isPasswordReset ? (
          <form onSubmit={saveNewPassword} className="space-y-4">
            <div><Label htmlFor="new-password">Kata sandi baru</Label><Input id="new-password" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
            <Button type="submit" disabled={loading} className="w-full rounded-sm bg-stone-900 hover:bg-stone-800">{loading ? "Menyimpan..." : "Simpan kata sandi baru"}</Button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="signin-email" /></div>
            <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="signin-password" /></div>
            <Button type="submit" disabled={loading} data-testid="signin-submit" className="w-full rounded-sm bg-stone-900 hover:bg-stone-800">{loading ? "Masuk..." : "Masuk"}</Button>
            <button type="button" onClick={requestPasswordReset} disabled={loading} className="w-full text-sm underline text-stone-600">Lupa kata sandi?</button>
            <div className="text-sm text-stone-600 text-center">Belum punya akun? <Link to="/signup" className="underline">Daftar</Link></div>
          </form>
        )}
      </section>
    </Shell>
  );
}

export function SignupPage() {
  const { signup } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: params.get("role") || "couple", city: "Jakarta",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const user = await signup(form);
      if (user) {
        toast.success("Akun berhasil dibuat");
        nav(form.role === "vendor" ? "/vendor/dashboard" : "/");
      } else {
        toast.success("Periksa email Anda untuk mengonfirmasi akun sebelum masuk.");
        nav("/signin?confirmation=sent");
      }
    }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mendaftar"); }
    setLoading(false);
  };

  return (
    <Shell>
      <section className="nk-container max-w-md pt-16 pb-24">
        <div className="nk-overline mb-3">Daftar</div>
        <h1 className="nk-h2 mb-6">Buat akun NikahKita</h1>

        <div className="grid grid-cols-2 border border-stone-300 rounded-sm overflow-hidden mb-6 text-sm">
          <button data-testid="signup-role-couple" onClick={() => setForm({ ...form, role: "couple" })} className={`py-2.5 ${form.role === "couple" ? "bg-stone-900 text-stone-50" : "bg-white text-stone-700"}`}>Pasangan</button>
          <button data-testid="signup-role-vendor" onClick={() => setForm({ ...form, role: "vendor" })} className={`py-2.5 ${form.role === "vendor" ? "bg-stone-900 text-stone-50" : "bg-white text-stone-700"}`}>Vendor</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nama</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="signup-name" /></div>
          <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="signup-email" /></div>
          <div><Label>Password</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="signup-password" /></div>
          <div><Label>Kota</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="signup-city" /></div>
          <Button type="submit" disabled={loading} data-testid="signup-submit" className="w-full rounded-sm bg-stone-900 hover:bg-stone-800">{loading ? "Memproses..." : "Daftar"}</Button>
          <div className="text-sm text-stone-600 text-center">Sudah punya akun? <Link to="/signin" className="underline">Masuk</Link></div>
        </form>
      </section>
    </Shell>
  );
}
