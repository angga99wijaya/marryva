import type { Metadata, Viewport } from "next";
import "../index.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://nikahkita.id"),
  title: {
    default: "NikahKita — Rencanakan Pernikahan Impian",
    template: "%s | NikahKita",
  },
  description:
    "Temukan vendor pernikahan, inspirasi real wedding, dan alat perencanaan untuk hari istimewa Anda.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "NikahKita",
    title: "NikahKita — Rencanakan Pernikahan Impian",
    description:
      "Temukan vendor pernikahan, inspirasi real wedding, dan alat perencanaan untuk hari istimewa Anda.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
