import type { ReactNode, SVGProps } from "react";

/** Line icons for the tools — 24×24, stroke 1.75, same drawing rules as @caramelo/design-system. */
type P = SVGProps<SVGSVGElement> & { size?: number };

const icon = (paths: ReactNode) =>
  function Icon({ size = 18, ...props }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  };

export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconClose = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const IconDots = icon(<><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>);
export const IconStar = icon(<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />);
export const IconSearch = icon(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.5-4.5" /></>);
export const IconFilter = icon(<path d="M4 5h16l-6 7.5V19l-4 1.5v-8Z" />);
export const IconMenu = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconBoard = icon(<><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M9 4v16M14.5 4v10" /></>);
export const IconCalendar = icon(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const IconTable = icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" /></>);
export const IconChart = icon(<path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />);
export const IconCheck = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconCheckCircle = icon(<><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.4 2.4 4.8-5" /></>);
export const IconChecklist = icon(<><path d="m4 7 1.6 1.6L8.5 5.7M4 14l1.6 1.6 2.9-2.9" /><path d="M11.5 7.5H20M11.5 14.5H20" /></>);
export const IconComment = icon(<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12Z" />);
export const IconText = icon(<path d="M4 6h16M4 11h16M4 16h10" />);
export const IconTrash = icon(<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5" />);
export const IconCopy = icon(<><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>);
export const IconArrowLeft = icon(<path d="M19 12H5m6-6-6 6 6 6" />);
export const IconArrowRight = icon(<path d="M5 12h14m-6-6 6 6-6 6" />);
export const IconChevronDown = icon(<path d="m6 9 6 6 6-6" />);
export const IconChevronLeft = icon(<path d="m15 6-6 6 6 6" />);
export const IconChevronRight = icon(<path d="m9 6 6 6-6 6" />);
export const IconDownload = icon(<path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />);
export const IconUpload = icon(<path d="M12 16V5m-5 5 5-5 5 5M5 20h14" />);
export const IconRefresh = icon(<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />);
export const IconTag = icon(<><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0Z" /><circle cx="8" cy="8" r="1.3" /></>);
export const IconMove = icon(<path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />);
export const IconPlay = icon(<path d="M7.5 5.5v13l11-6.5Z" />);
export const IconStop = icon(<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />);
export const IconPencil = icon(<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 7.5l3 3" />);
export const IconEye = icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>);
export const IconHeart = icon(<path d="M12 19.5s-7.5-4.4-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />);
export const IconBookmark = icon(<path d="M6.5 4h11v16.5L12 16.5l-5.5 4Z" />);
export const IconClock = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconUser = icon(<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>);
export const IconSend = icon(<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4Z" />);
export const IconLink = icon(<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />);
export const IconImage = icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.6" /><path d="m4 18 5-5 4 4 2.5-2.5L20 19" /></>);
export const IconSettings = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z" /></>);
export const IconBolt = icon(<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6Z" />);
export const IconSparkles = icon(<path d="M12 3.5 13.7 9 19 10.5 13.7 12 12 17.5 10.3 12 5 10.5 10.3 9ZM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />);
export const IconHome = icon(<path d="M4 11 12 4l8 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" />);
export const IconGrid = icon(<><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></>);
export const IconLayers = icon(<path d="m12 4 8.5 4.5L12 13 3.5 8.5ZM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />);
export const IconFile = icon(<path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Zm0 0v5h5" />);
export const IconFolder = icon(<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.3l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.3A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />);
export const IconKey = icon(<><circle cx="8" cy="15" r="4" /><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2" /></>);
export const IconShield = icon(<><path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>);
export const IconBranch = icon(<><circle cx="6.5" cy="5.5" r="2" /><circle cx="6.5" cy="18.5" r="2" /><circle cx="17.5" cy="8.5" r="2" /><path d="M6.5 7.5v9M17.5 10.5c0 4-5 3-9.5 6" /></>);
export const IconHistory = icon(<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4M12 8v4.5l3 1.5" />);
export const IconWand = icon(<path d="m4 20 11-11M14 4l.8 2.2L17 7l-2.2.8L14 10l-.8-2.2L11 7l2.2-.8ZM19 11l.5 1.5L21 13l-1.5.5L19 15l-.5-1.5L17 13l1.5-.5Z" />);
export const IconSave = icon(<path d="M5.5 4h10.5l3.5 3.5V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 4v5h7V4M8 20v-6h8v6" />);
export const IconExpand = icon(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const IconMinus = icon(<path d="M5 12h14" />);
export const IconLogs = icon(<><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>);
export const IconAlert = icon(<><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4M12 17h.01" /></>);
export const IconInfo = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>);
export const IconLock = icon(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>);
export const IconNote = icon(<path d="M5.5 4h13v11l-5 5h-8ZM13.5 20v-5h5M9 9h6M9 12.5h4" />);
export const IconReply = icon(<path d="M10 8 5 12.5l5 4.5M5.5 12.5H14a5 5 0 0 1 5 5V19" />);
export const IconGlobe = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z" /></>);
export const IconVideo = icon(<><rect x="3.5" y="6" width="12.5" height="12" rx="2" /><path d="m16 10.5 4.5-2.5v8L16 13.5" /></>);
export const IconExternal = icon(<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />);
