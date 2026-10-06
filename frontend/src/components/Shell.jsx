import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  ClipboardList, Users, Wallet, Globe, Heart, Send, Settings, LogOut, Shield, LayoutDashboard, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast, Toaster } from "sonner";

const SHORTCUTS = [
  { to: "/tools/checklist", icon: ClipboardList, label: "Checklist", tid: "shortcut-checklist" },
  { to: "/tools/budget", icon: Wallet, label: "Budget", tid: "shortcut-budget" },
  { to: "/tools/guests", icon: Users, label: "Daftar Tamu", tid: "shortcut-guests" },
  { to: "/tools/website", icon: Globe, label: "Undangan Digital", tid: "shortcut-website" },
  { to: "/tools/registry", icon: Heart, label: "Amplop Digital", tid: "shortcut-registry" },
  { to: "/tools/blast", icon: Send, label: "WhatsApp Blast", tid: "shortcut-blast" },
];

const AvatarCircle = ({ name }) => {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-11 h-11 rounded-full bg-amber-700 text-amber-50 flex items-center justify-center font-serif text-lg shrink-0" data-testid="user-avatar">
      {initial}
    </div>
  );
};

const UserMenu = () => {
  const { user, logout } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const go = (to) => { setOpen(false); nav(to); };

  const statusLabel =
    user.role === "admin" ? "Admin · Profile"
    : user.role === "vendor" ? "Vendor · Profile"
    : "Just Said Yes · Profile";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button data-testid="nav-user-menu" className="flex items-center gap-2 rounded-full border border-stone-300 hover:border-stone-900 pr-3 pl-1 py-1 bg-white transition-colors">
          <AvatarCircle name={user.name} />
          <span className="text-sm text-stone-800 font-medium hidden sm:inline">{user.name.split(" ")[0]}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-sm border-stone-300 shadow-[0_24px_60px_-20px_rgba(28,25,23,0.35)]" data-testid="user-menu-panel">
        <div className="p-4 flex items-center gap-3 border-b border-stone-200">
          <AvatarCircle name={user.name} />
          <div className="min-w-0">
            <div className="font-serif text-xl truncate text-stone-900" data-testid="user-menu-name">{user.name}</div>
            <div className="text-xs text-stone-600 mt-0.5">{statusLabel}</div>
          </div>
        </div>

        <div className="p-4 border-b border-stone-200">
          {user.role === "couple" && (
            <Button onClick={() => go("/tools/dashboard")} data-testid="user-menu-go-planner" className="w-full rounded-sm bg-white hover:bg-stone-900 hover:text-stone-50 text-stone-900 border border-stone-900 h-11">
              Go To My Planner
            </Button>
          )}
          {user.role === "vendor" && (
            <Button onClick={() => go("/vendor/dashboard")} data-testid="user-menu-go-vendor" className="w-full rounded-sm bg-white hover:bg-stone-900 hover:text-stone-50 text-stone-900 border border-stone-900 h-11">
              Buka Vendor Dashboard
            </Button>
          )}
          {user.role === "admin" && (
            <Button onClick={() => go("/admin")} data-testid="user-menu-go-admin" className="w-full rounded-sm bg-white hover:bg-stone-900 hover:text-stone-50 text-stone-900 border border-stone-900 h-11">
              Open Admin Panel
            </Button>
          )}
        </div>

        {user.role === "couple" && (
          <div className="p-3 border-b border-stone-200 grid grid-cols-3 gap-1">
            {SHORTCUTS.map((s) => (
              <button
                key={s.to}
                onClick={() => go(s.to)}
                data-testid={s.tid}
                className="flex flex-col items-center justify-start gap-1.5 p-3 rounded-sm hover:bg-stone-100 transition-colors group text-center">
                <s.icon className="w-5 h-5 text-stone-700 group-hover:text-amber-800 transition-colors" />
                <span className="text-[11px] leading-tight text-stone-800 font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-2">
          {user.role === "couple" && (
            <button onClick={() => go("/favorites")} data-testid="user-menu-saved" className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-stone-100 text-sm text-stone-800">
              <span className="flex items-center gap-2.5"><Heart className="w-4 h-4" />Vendor Tersimpan</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          )}
          <button onClick={() => go("/account/settings")} data-testid="user-menu-settings" className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-stone-100 text-sm text-stone-800">
            <span className="flex items-center gap-2.5"><Settings className="w-4 h-4" />Settings</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button onClick={async () => {
            try {
              await logout();
              setOpen(false);
              toast.success("Logged out");
              nav("/");
            } catch (error) {
              console.error("Logout failed.", error);
              toast.error("Gagal keluar. Coba lagi.");
            }
          }} data-testid="user-menu-logout" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm hover:bg-stone-100 text-sm text-stone-800">
            <LogOut className="w-4 h-4" />Log Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const Nav = () => {
  const { user, lang, setLang } = useApp();

  const link = (to, label, tid) => (
    <Link to={to} data-testid={tid} className="text-sm text-stone-700 hover:text-stone-900 transition-colors py-2">
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[color:var(--canvas)]/85 backdrop-blur">
      <div className="nk-container flex items-center justify-between h-16">
        <Link to="/" data-testid="nav-logo" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl tracking-tight text-stone-900">NikahKita</span>
          <span className="nk-overline hidden sm:inline">by WeddingWire ID</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {link("/vendors", t(lang, "nav.vendors"), "nav-vendors-link")}
          {link("/venues", t(lang, "nav.venues"), "nav-venues-link")}
          {link("/real-weddings", t(lang, "nav.realweddings"), "nav-realweddings-link")}
          {link("/destinations", lang === "id" ? "Destinasi" : "Destinations", "nav-destinations-link")}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-sm border border-stone-300 bg-white overflow-hidden text-xs font-mono">
            <button
              data-testid="nav-language-toggle-id"
              onClick={() => setLang("id")}
              className={`px-2.5 py-1.5 transition-colors ${lang === "id" ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-stone-100"}`}>ID</button>
            <button
              data-testid="nav-language-toggle-en"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 transition-colors ${lang === "en" ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-stone-100"}`}>EN</button>
          </div>

          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/signin" data-testid="nav-signin-link" className="hidden sm:inline-flex text-sm px-3 py-2 text-stone-700 hover:text-stone-900">
                {t(lang, "nav.signin")}
              </Link>
              <Link to="/signup" data-testid="nav-signup-link" className="nk-btn-primary !py-2 !px-4 text-sm">
                {t(lang, "nav.signup")}
              </Link>
            </>
          )}
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </header>
  );
};

export const Footer = () => (
  <footer className="border-t border-stone-200 bg-stone-50 mt-20">
    <div className="nk-container py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div>
        <div className="font-serif text-2xl text-stone-900">NikahKita</div>
        <p className="mt-3 text-sm text-stone-600 leading-relaxed">Marketplace pernikahan Indonesia — honest reviews, no hidden tiers.</p>
      </div>
      <div>
        <div className="nk-overline mb-3">Jelajah</div>
        <ul className="space-y-2 text-sm text-stone-700">
          <li><Link to="/vendors">Vendor</Link></li>
          <li><Link to="/venues">Venue</Link></li>
          <li><Link to="/real-weddings">Real Wedding</Link></li>
          <li><Link to="/destinations">Destinasi</Link></li>
        </ul>
      </div>
      <div>
        <div className="nk-overline mb-3">Alat</div>
        <ul className="space-y-2 text-sm text-stone-700">
          <li><Link to="/tools/dashboard">My Planner</Link></li>
          <li><Link to="/tools/checklist">Checklist</Link></li>
          <li><Link to="/tools/budget">Budget</Link></li>
          <li><Link to="/tools/guests">Daftar Tamu</Link></li>
          <li><Link to="/tools/website">Undangan Digital</Link></li>
          <li><Link to="/tools/registry">Amplop Digital</Link></li>
          <li><Link to="/tools/blast">WhatsApp Blast</Link></li>
        </ul>
      </div>
      <div>
        <div className="nk-overline mb-3">Vendor</div>
        <ul className="space-y-2 text-sm text-stone-700">
          <li><Link to="/signup?role=vendor">Daftar sebagai Vendor</Link></li>
          <li><Link to="/signin">Login Vendor</Link></li>
          <li><Link to="/vendor/boost">Boost Listing</Link></li>
        </ul>
      </div>
    </div>
    <div className="nk-container pb-10 pt-2">
      <div className="gold-rule mb-6" />
      <div className="flex justify-between text-xs text-stone-500 font-mono">
        <span>© {new Date().getFullYear()} NikahKita</span>
        <span>Dirancang untuk pasangan Indonesia</span>
      </div>
    </div>
  </footer>
);

export const Shell = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-[color:var(--canvas)]">
    <Nav />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);
