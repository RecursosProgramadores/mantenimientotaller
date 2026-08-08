// Stable, TZ-safe date formatting for SSR hydration.
// Input: ISO date "YYYY-MM-DD" (no time component required).

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  // weekday (compute TZ-free using simple algo)
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = DIAS[date.getUTCDay()];
  return `${wd} ${String(d).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}

// Locale-stable number formatter (avoids SSR/CSR hydration mismatches).
// Uses thin-space thousands separator to be locale-neutral.
export function formatNumber(n?: number, fractionDigits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const fixed = n.toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${withSep}.${decPart}` : withSep;
}

// Limpia un campo de teléfono mientras se escribe: solo dígitos, máximo 9
// (celulares en Perú son de 9 dígitos). Usar en el onChange de cualquier
// input de "Teléfono" del sistema para que no se puedan escribir letras ni
// más de 9 números.
export function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 9);
}
