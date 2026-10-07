import React, { useState } from "react";
import { LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";

export default function AIAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (location.pathname.startsWith("/u/")) return null;

  const askPlanner = async (event) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || loading) return;

    setLoading(true);
    setAnswer("");
    setError("");
    try {
      const response = await api.post("/ai/planner", { prompt });
      setAnswer(response.data.answer);
    } catch (requestError) {
      const status = requestError.response?.status;
      const code = requestError.response?.data?.code;
      if (code === "invalid_api_key") {
        setError("Kunci Gemini ditolak. Pastikan GEMINI_API_KEY di Vercel adalah API key dari Google AI Studio, lalu redeploy.");
      } else if (code === "api_key_forbidden") {
        setError("Akses Gemini ditolak. Periksa pembatasan API key dan pastikan Generative Language API diaktifkan untuk project Google tersebut.");
      } else if (code === "model_not_found") {
        setError("Model Gemini tidak tersedia untuk API key ini. Periksa GEMINI_GENERATION_MODEL di environment atau hapus agar memakai model default, lalu restart server/redeploy.");
      } else if (code === "invalid_request") {
        setError("Gemini menolak permintaan. Coba pertanyaan yang lebih singkat atau periksa konfigurasi model.");
      } else if (code === "empty_response") {
        setError("Gemini tidak menghasilkan jawaban untuk pertanyaan ini. Coba susun ulang pertanyaannya.");
      } else if (code === "provider_timeout" || code === "provider_unavailable") {
        setError("Gemini sementara tidak merespons. Coba lagi beberapa saat.");
      } else if (status === 401) {
        setError("Silakan masuk untuk menggunakan AI Planner.");
      } else if (status === 503) {
        setError("AI Planner belum dikonfigurasi. Administrator perlu menambahkan GEMINI_API_KEY di environment Vercel.");
      } else if (status === 429) {
        setError("Layanan AI sedang sibuk. Coba lagi sebentar.");
      } else {
        setError("AI Planner tidak dapat menjawab saat ini. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        data-testid="ai-fab"
        aria-label={open ? "Tutup AI Planner" : "Buka AI Planner"}
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
              <div>
                <div className="font-serif text-sm leading-tight">NikahKita AI Planner</div>
                <div className="text-xs text-stone-400">Asisten persiapan pernikahan</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup AI Planner" className="text-stone-400 hover:text-stone-50">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 bg-stone-50 space-y-4">
            <p className="text-sm text-stone-700">
              Tanyakan checklist, anggaran, adat, atau ide vendor untuk rencana pernikahanmu.
            </p>
            {answer && (
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-sm border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-800" aria-live="polite">
                {answer}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <form onSubmit={askPlanner} className="space-y-2">
              <label htmlFor="ai-planner-question" className="sr-only">Pertanyaan untuk AI Planner</label>
              <textarea
                id="ai-planner-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Contoh: Bagaimana membagi budget Rp100 juta?"
                className="w-full resize-y rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                required
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-stone-500">{question.length}/2000</span>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="inline-flex items-center gap-2 rounded-sm bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Menyiapkan...</> : <><Send className="h-4 w-4" />Tanya AI</>}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
