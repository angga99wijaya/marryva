import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function AIAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname.startsWith("/u/")) return null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        data-testid="ai-fab"
        aria-label={open ? "Close AI Planner status" : "AI Planner status"}
        aria-expanded={open}
        className={`fixed bottom-5 right-5 lg:bottom-7 lg:right-7 z-50 flex items-center gap-2 rounded-full shadow-[0_12px_40px_-10px_rgba(28,25,23,0.4)] transition-all duration-300 ${
          open ? "bg-stone-900 text-stone-50 px-4 py-3" : "bg-amber-700 hover:bg-amber-800 text-amber-50 px-5 py-3.5"
        }`}>
        {open ? <X className="w-5 h-5" /> : <><Sparkles className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium">AI Planner</span></>}
      </button>

      {open && (
        <section
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 lg:inset-auto lg:bottom-24 lg:right-7 z-50 lg:w-[420px] bg-white border border-stone-300 rounded-t-lg lg:rounded-sm shadow-2xl overflow-hidden"
          data-testid="ai-panel">
          <div className="px-4 py-3 bg-stone-900 text-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="font-serif text-sm leading-tight">NikahKita AI Planner</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Tutup status AI Planner" className="text-stone-400 hover:text-stone-50">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 bg-stone-50">
            <div className="font-medium text-stone-900">Belum tersedia</div>
            <p className="text-sm text-stone-700 mt-1">
              Layanan AI Planner belum dikonfigurasi. Fitur ini akan aktif setelah penyedia AI dan kredensial server disiapkan.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
