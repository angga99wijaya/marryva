export function optimizeImageUrl(
  source: string,
  width: number,
  quality = 70,
): string {
  if (!source.startsWith("https://images.unsplash.com/")) return source;

  const imageUrl = new URL(source);
  imageUrl.searchParams.set("w", String(width));
  imageUrl.searchParams.set("q", String(quality));
  imageUrl.searchParams.set("fm", "webp");

  return imageUrl.toString();
}
