export function mapTilerStyleUrl(key: string) {
  if (!key.trim()) throw new Error("MapTiler-avain puuttuu.");
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key.trim())}`;
}
