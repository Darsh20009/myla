export function optimizeCloudinaryImageUrl(
  source: string | null | undefined,
  width = 960,
): string {
  if (!source || !source.startsWith("https://res.cloudinary.com/")) {
    return source || "";
  }

  try {
    const url = new URL(source);
    const uploadMarker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(uploadMarker);
    if (markerIndex === -1) return source;

    const imagePath = url.pathname.slice(markerIndex + uploadMarker.length);
    const firstSegment = imagePath.split("/")[0];
    // Avoid adding a second transformation to URLs that already have one.
    if (!/^v\d+$/.test(firstSegment)) return source;

    const safeWidth = Math.max(160, Math.min(1600, Math.round(width)));
    url.pathname = `${url.pathname.slice(0, markerIndex + uploadMarker.length)}f_auto,q_auto,w_${safeWidth},c_limit/${imagePath}`;
    return url.toString();
  } catch {
    return source;
  }
}
