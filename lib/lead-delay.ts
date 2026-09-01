// Delay (TAT) formatting and threshold colors shared by the Leads module.
// Moved verbatim from app/leads/assign/page.tsx — behavior must stay identical.

export const formatDelay = (seconds: number) => {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const delayColor = (seconds: number) => {
  const mins = seconds / 60;
  if (mins <= 30) return { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" };
  if (mins <= 60) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
  return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" };
};
