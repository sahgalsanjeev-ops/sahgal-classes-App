/** Extract 11-char YouTube video id from common URL shapes. */
export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
  return match?.[1] ?? null;
}
