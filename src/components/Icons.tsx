// Simple line icons drawn for this recreation (no Valve artwork is reproduced).
import type { SVGProps } from "react";

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
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
export const IconMinimize = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><line x1="6" y1="12" x2="18" y2="12" /></svg>
);
export const IconMaximize = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="6" y="6" width="12" height="12" /></svg>
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
export const IconMark = ({ size = 20, ...p }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 256"
    role="img"
    aria-label="Um Cara Caramelo"
    {...p}
  >
    <rect width="256" height="256" rx="64" fill="#FF701A" />
    <g fill="#101014">
      <path d="M104.4 40.4C106.9 40.3 113.4 40.1 117.2 40.8C121.1 41.5 124.9 42.7 128.3 44.7C131.7 46.6 140.8 53.5 142.1 54.9C143.5 56.3 143.9 58.6 143.6 60.6C143.2 62.5 142 65.6 140.1 67.1C138.2 68.6 134.9 68.9 133 69C131.1 69.1 129.1 68.6 127.4 67.6C125.8 66.6 118.5 60 116.2 58.8C113.9 57.6 111.1 57.1 108.6 57.6C106 58 103.2 59.4 101.2 61.2C99.2 63.1 96.5 66.8 95 70C93.5 73.2 92.3 77.7 91.7 81.7C91 85.7 78.5 170.6 78 175C77.5 179.4 78.3 186.3 78.7 188.3C79 190.3 80.4 193 81.1 193.9C81.8 194.8 83 195.5 84.2 195.6C85.4 195.6 87.8 195.2 89.2 194.2C90.7 193.3 100.1 186.5 104.8 181.8C109.4 177 116.5 167.5 120.3 162.3C124.2 157.1 128.3 151.1 131.2 146.2C134.1 141.3 137 135.6 138.9 130.9C140.8 126.2 142.4 118.5 143.4 116.4C144.5 114.3 147 112.6 148.8 111.8C150.6 110.9 153.2 111.1 154.8 111.2C156.3 111.4 158 111.8 159.2 112.8C160.4 113.8 163.6 117.6 164.2 118.8C164.9 119.9 164.9 121.4 164.7 122.7C164.4 123.9 162.9 128.1 161.8 130.8C160.7 133.4 157.8 140.6 155.3 145.3C152.9 150 149.8 155.6 146.4 160.4C143.1 165.3 123.3 192.6 119.8 196.8C116.3 200.9 109.8 205.4 107.2 207.2C104.6 209.1 101.6 210.7 98.9 211.9C96.2 213.1 93.4 214.1 90.6 214.6C87.7 215 79.5 215.7 77.4 215.6C75.4 215.4 73.4 214.2 71.8 213.2C70.1 212.3 68.6 211.1 67.2 209.8C65.8 208.5 63.8 206.5 62.4 204.6C61.1 202.6 59.7 200.3 59.1 197.9C58.5 195.5 55.5 185.4 56 179C56.5 172.6 65.3 102.3 66.6 94.6C67.8 86.9 71.1 77.5 73.1 72.1C75.1 66.7 78.9 59.4 80.6 56.6C82.2 53.7 85.1 50.5 86.8 48.8C88.4 47.1 91 45.4 92.4 44.4C93.9 43.5 95.5 42.7 97.1 42.1C98.8 41.6 101.9 40.6 104.4 40.4Z" />
      <path d="M183.6 195.6C184.5 195.5 188.8 194.9 191.1 195.9C193.4 196.9 198 201.5 198.7 202.3C199.4 203.2 199.4 204.5 199.3 205.6C199.3 206.7 198.7 208.1 198.2 209.2C197.7 210.3 197.1 211.4 196.2 212.2C195.4 213.1 193.6 214.2 192.7 214.7C191.7 215.2 190.7 215.6 189.7 215.7C188.6 215.7 186.3 215.6 184.9 215.1C183.5 214.6 182.3 213.8 181.2 212.8C180.2 211.8 178.2 209.3 177.7 208.3C177.2 207.4 177.1 206.2 177.1 205.1C177.2 204 177.4 202.3 178 201C178.6 199.7 180.2 197.6 180.9 196.9C181.6 196.2 182.6 195.7 183.6 195.6Z" />
    </g>
  </svg>
);
