export const CATEGORIES = [
  { key: "Venue", label_id: "Venue", label_en: "Venue" },
  { key: "Fotografer", label_id: "Fotografer", label_en: "Photographer" },
  { key: "Katering", label_id: "Katering", label_en: "Catering" },
  { key: "MUA", label_id: "MUA", label_en: "Makeup Artist" },
  { key: "Dekorasi", label_id: "Dekorasi", label_en: "Decoration" },
  { key: "Wedding Organizer", label_id: "Wedding Organizer", label_en: "Wedding Planner" },
  { key: "Entertainment", label_id: "Entertainment", label_en: "Entertainment" },
];

export const CITIES = ["Jakarta", "Bandung", "Bali", "Yogyakarta", "Surabaya"];

export const ADAT = [
  { key: "Jawa", label_id: "Jawa (Paes Ageng)", label_en: "Javanese" },
  { key: "Sunda", label_id: "Sunda (Siger)", label_en: "Sundanese" },
  { key: "Bali", label_id: "Bali (Payas Agung)", label_en: "Balinese" },
  { key: "Minang", label_id: "Minang (Suntiang)", label_en: "Minang" },
  { key: "Batak", label_id: "Batak (Ulos)", label_en: "Batak" },
  { key: "Chinese", label_id: "Chinese (Teapai)", label_en: "Chinese" },
  { key: "Modern", label_id: "Modern Minimalis", label_en: "Modern" },
];

export const PRICE_BANDS = [
  { key: "any", label: "Semua harga", min: 0, max: 999999999999 },
  { key: "u25", label: "< Rp 25 jt", min: 0, max: 25_000_000 },
  { key: "25-50", label: "Rp 25 – 50 jt", min: 25_000_000, max: 50_000_000 },
  { key: "50-100", label: "Rp 50 – 100 jt", min: 50_000_000, max: 100_000_000 },
  { key: "100-250", label: "Rp 100 – 250 jt", min: 100_000_000, max: 250_000_000 },
  { key: "250p", label: "> Rp 250 jt", min: 250_000_000, max: 999999999999 },
];

export const CAPACITY_BANDS = [
  { key: "any", label: "Semua kapasitas", min: 0 },
  { key: "intimate", label: "100–300 (intimate)", min: 100 },
  { key: "medium", label: "300–800 (medium)", min: 300 },
  { key: "grand", label: "800–2000 (grand)", min: 800 },
  { key: "mega", label: "2000+ (mega)", min: 2000 },
];

export const formatIDR = (n) => {
  if (n == null) return "-";
  if (n >= 1_000_000) {
    const jt = Math.round(n / 100_000) / 10;
    return `Rp ${jt.toString().replace('.', ',')} jt`;
  }
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
};

export const formatIDRFull = (n) => {
  if (n == null) return "-";
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
};

export const waLink = (phone, text) =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text || '')}`;
