/**
 * Strip HTML tags and compute reading time in minutes.
 * @param {string | null | undefined} htmlString
 * @returns {number} minutes, minimum 1
 */
export function calcReadTime(htmlString) {
  if (!htmlString) return 1;
  const text = htmlString.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / 200));
}
