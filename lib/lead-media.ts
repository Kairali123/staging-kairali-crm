// IVR/media URL sanitization shared by the Leads module.
// Moved verbatim from app/leads/assign/page.tsx — behavior must stay identical.

export const sanitizeIvrUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check if empty or common placeholder after trimming
  if (!trimmedUrl || trimmedUrl === '' || trimmedUrl === 'N/A' || trimmedUrl === '—' || trimmedUrl === '-') return null;

  // If URL already has protocol, return it
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Add https:// protocol if missing
  return `https://${trimmedUrl}`;
};
