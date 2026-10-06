const optimizedImageHosts = new Set([
  "images.unsplash.com",
  "res.cloudinary.com",
  "imagedelivery.net",
]);

export function shouldBypassImageOptimization(source: string): boolean {
  if (source.startsWith("/") && !source.startsWith("//")) return false;

  try {
    const { hostname, protocol } = new URL(source);
    if (protocol !== "https:") return true;

    return !optimizedImageHosts.has(hostname)
      && !hostname.endsWith(".r2.dev");
  } catch {
    return true;
  }
}

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
