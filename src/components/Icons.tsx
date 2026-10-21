// Simple line icons drawn for this recreation (no Valve artwork is reproduced).
import type { ComponentProps, SVGProps } from "react";
import { CarameloIsotype } from "./CarameloIsotype";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="15 18 9 12 15 6" /></svg>
);
export const IconForward = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="9 18 15 12 9 6" /></svg>
);
export const IconHome = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
);
export const IconGrid = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
);
export const IconList = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
);
export const IconCamera = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
export const IconVideo = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
export const IconCopy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
export const IconShare = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
);
export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
);
export const IconFilter = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
);
export const IconClock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size, { ...p, fill: "currentColor", stroke: "none" })}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
);
export const IconDownload = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M4 19h16" /></svg>
);
export const IconGear = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const IconInfo = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="7.5" r=".6" fill="currentColor" /></svg>
);
export const IconStar = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size, { ...p, fill: filled ? "currentColor" : "none" })}><polygon points="12 3 14.8 8.8 21 9.6 16.5 14 17.6 20.3 12 17.3 6.4 20.3 7.5 14 3 9.6 9.2 8.8 12 3" /></svg>
);
export const IconBell = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></svg>
);
export const IconUsers = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-3.5 3.3-5.5 6.5-5.5s6 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.6c2.6.2 4.6 2 5 4.9" /></svg>
);
export const IconSend = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
export const IconChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="9 6 15 12 9 18" /></svg>
);
export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" /></svg>
);
export const IconTrophy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H4v2a3 3 0 0 0 4 3" /><path d="M16 6h4v2a3 3 0 0 1-4 3" /><line x1="12" y1="13" x2="12" y2="17" /><path d="M8 21h8l-1-4H9l-1 4z" /></svg>
);
export const IconCloud = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10a4 4 0 0 1-.5 8H7z" /></svg>
);
export const IconFolder = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /></svg>
);
export const IconNote = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 3h10l4 4v14H5z" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
);
export const IconController = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M6 8h12a4 4 0 0 1 3.9 4.8l-.8 4a2.5 2.5 0 0 1-4.3 1.1L14.5 16h-5l-2.3 1.9a2.5 2.5 0 0 1-4.3-1.1l-.8-4A4 4 0 0 1 6 8z" /><line x1="8" y1="11" x2="8" y2="14" /><line x1="6.5" y1="12.5" x2="9.5" y2="12.5" /><circle cx="16" cy="12" r=".8" fill="currentColor" /><circle cx="17.5" cy="13.8" r=".8" fill="currentColor" /></svg>
);
export const IconDrive = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="4" y="4" width="16" height="16" rx="2" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="16" y1="17" x2="16.01" y2="17" /></svg>
);
export const IconDots = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="6" cy="12" r="1.5" fill="currentColor" /><circle cx="18" cy="12" r="1.5" fill="currentColor" /></svg>
);
export const IconMove = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
);

/** Marca oficial Um Cara Caramelo — Isotipo canônico. */
/** Isotipo oficial (bloco Caramel). */
export const IconMark = ({ size = 20, ...p }: ComponentProps<typeof CarameloIsotype>) => <CarameloIsotype size={size} {...p} />;
