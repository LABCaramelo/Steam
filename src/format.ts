const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

export function formatPlaytime(minutes: number): string {
  if (minutes <= 0) return "Nunca jogado";
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  const h = minutes / 60;
  const shown = h >= 100 ? Math.round(h).toLocaleString("pt-BR") : h.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${shown} hora${h === 1 ? "" : "s"}`;
}

export function formatLastPlayed(unixSeconds: number): string {
  if (!unixSeconds) return "Nunca";
  const d = new Date(unixSeconds * 1000);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return d.getFullYear() === new Date().getFullYear() ? shortDateFmt.format(d) : dateFmt.format(d);
}

export function formatDate(unixSeconds?: number): string {
  return unixSeconds ? dateFmt.format(new Date(unixSeconds * 1000)) : "—";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: v >= 100 ? 0 : 1 })} ${units[i]}`;
}

/** Groups "recent games" the way the library home shelf labels them. */
export function recencyBucket(unixSeconds: number): string {
  const days = (Date.now() - unixSeconds * 1000) / 86_400_000;
  if (days < 1) return "Hoje";
  if (days < 2) return "Ontem";
  if (days < 7) return "Esta semana";
  if (days < 14) return "Semana passada";
  if (days < 31) return "Este mês";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
