import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(children: ReactNode) {
  return function Icon({ size = 24, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const IconMove = make(<path d="M7.5 5.5v12.2l3.3-3.2 2.3 5 2-.9-2.3-5h4.6z" fill="currentColor" stroke="none" />);
export const IconHand = make(
  <path d="M18 11V6a2 2 0 0 0-4 0v4M14 10V4a2 2 0 0 0-4 0v7M10 10.5V5a2 2 0 1 0-4 0v9c0 4 3 6.5 7 6.5s7-2.5 7-6.5V9a2 2 0 1 0-4 0v2" />,
);
export const IconFrame = make(<path d="M8.5 4.5v15M15.5 4.5v15M4.5 8.5h15M4.5 15.5h15" />);
export const IconRect = make(<rect x="5.5" y="5.5" width="13" height="13" rx="0.5" />);
export const IconEllipse = make(<circle cx="12" cy="12" r="6.5" />);
export const IconLine = make(<path d="M5.5 18.5 18.5 5.5" />);
export const IconArrow = make(<path d="M5.5 18.5 18.5 5.5M11 5.5h7.5V13" />);
export const IconPolygon = make(<path d="M12 5.5 19 18.5H5z" />);
export const IconStar = make(
  <path d="m12 4.5 2.3 4.7 5.2.8-3.7 3.6.9 5.2-4.7-2.5-4.7 2.5.9-5.2-3.7-3.6 5.2-.8z" />,
);
export const IconPencil = make(<path d="M15.5 5.5 18.5 8.5 9 18l-4 1 1-4zM13.5 7.5l3 3" />);
export const IconText = make(<path d="M6.5 7V5.5h11V7M12 5.5v13M9.5 18.5h5" />);
export const IconImage = make(
  <>
    <rect x="5.5" y="5.5" width="13" height="13" rx="0.5" />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="m6 16.5 4-4 3 3 2-2 3 3" />
  </>,
);
export const IconVector = make(
  <>
    <rect x="5.5" y="5.5" width="13" height="13" rx="0.5" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="16" cy="16" r="1" fill="currentColor" />
    <path d="M8 8c0 4 8 4 8 8" />
  </>,
);
export const IconGroup = make(<rect x="5.5" y="5.5" width="13" height="13" rx="0.5" strokeDasharray="2 2" />);
export const IconPage = make(<path d="M7.5 4.5h6l3 3v12h-9zM13.5 4.5v3h3" />);
export const IconChevronDown = make(<path d="m8 10.5 4 4 4-4" />);
export const IconChevronRight = make(<path d="m10.5 8 4 4-4 4" />);
export const IconArrowLeft = make(<path d="M19 12H5M11 18l-6-6 6-6" strokeWidth={1.5} />);
export const IconCaretDown = make(<path d="M9 10.5h6l-3 3.5z" fill="currentColor" stroke="none" />);
export const IconCaretRight = make(<path d="M10.5 9v6l3.5-3z" fill="currentColor" stroke="none" />);
export const IconPlus = make(<path d="M12 6.5v11M6.5 12h11" />);
export const IconMinus = make(<path d="M6.5 12h11" />);
export const IconAutoLayoutH = make(
  <>
    <rect x="5.5" y="5.5" width="5.5" height="13" rx="0.5" />
    <rect x="13" y="5.5" width="5.5" height="13" rx="0.5" />
  </>,
);
export const IconAutoLayoutV = make(
  <>
    <rect x="5.5" y="5.5" width="13" height="5.5" rx="0.5" />
    <rect x="5.5" y="13" width="13" height="5.5" rx="0.5" />
  </>,
);
export const IconCheck = make(<path d="m7 12.5 3.2 3L17 8.5" />);
export const IconClose = make(<path d="m7.5 7.5 9 9M16.5 7.5l-9 9" />);
export const IconEye = make(
  <>
    <path d="M4.5 12s3-5.5 7.5-5.5S19.5 12 19.5 12s-3 5.5-7.5 5.5S4.5 12 4.5 12z" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
);
export const IconEyeOff = make(
  <>
    <path d="m5 5 14 14M9.5 9.8A6.8 6.8 0 0 0 4.5 12s3 5.5 7.5 5.5c1.8 0 3.3-.6 4.5-1.5M14.5 14.2a2.5 2.5 0 0 1-3.7-3.7" />
  </>,
);
export const IconLock = make(
  <>
    <rect x="6.5" y="10.5" width="11" height="8" rx="1" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </>,
);
export const IconUnlock = make(
  <>
    <rect x="6.5" y="10.5" width="11" height="8" rx="1" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0" />
  </>,
);
export const IconLink = make(
  <path d="M10 13a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.6-5.7l-1.4 1.4M14 11a4 4 0 0 0-5.7 0L5.5 13.8a4 4 0 0 0 5.6 5.7l1.4-1.4" />,
);
export const IconUnlink = make(
  <>
    <path d="m5 5 14 14" />
    <path d="M10 13a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.6-5.7l-1.4 1.4M14 11a4 4 0 0 0-5.7 0L5.5 13.8a4 4 0 0 0 5.6 5.7l1.4-1.4" />
  </>,
);
export const IconRotate = make(<path d="M17.5 12a5.5 5.5 0 1 1-1.6-3.9M16.5 4.8v3.6h-3.6" />);
export const IconFlipH = make(
  <>
    <path d="M12 4.5v15M6.5 7.5l-2 4.5 2 4.5zM17.5 7.5l2 4.5-2 4.5z" />
  </>,
);
export const IconFlipV = make(
  <>
    <path d="M4.5 12h15M7.5 6.5l4.5-2 4.5 2zM7.5 17.5l4.5 2 4.5-2z" />
  </>,
);
export const IconRotate90 = make(
  <>
    <path d="M18.5 12a6.5 6.5 0 1 1-1.9-4.6" />
    <path d="M18.5 6v3.5H15" />
  </>,
);
export const IconCorner = make(<path d="M6.5 17.5V11a4.5 4.5 0 0 1 4.5-4.5h6.5" />);
export const IconOpacity = make(
  <>
    <circle cx="12" cy="12" r="6.5" />
    <path d="M12 5.5v13a6.5 6.5 0 0 0 0-13z" fill="currentColor" />
  </>,
);
export const IconClip = make(<path d="M8.5 4.5v11h11M4.5 8.5h11v11" />);
export const IconStrokeWeight = make(<path d="M6 8h12M6 12h12" strokeWidth={1.5} />);
export const IconLineHeight = make(<path d="M5.5 5.5h13M5.5 18.5h13M9 15.5l3-7 3 7M10 13.5h4" />);
export const IconLetterSpacing = make(<path d="M5.5 5.5v13M18.5 5.5v13M9 15.5l3-7 3 7M10 13.5h4" />);
export const IconTextLeft = make(<path d="M5.5 7.5h13M5.5 12h8M5.5 16.5h11" />);
export const IconTextCenter = make(<path d="M5.5 7.5h13M8 12h8M6.5 16.5h11" />);
export const IconTextRight = make(<path d="M5.5 7.5h13M10.5 12h8M7.5 16.5h11" />);
export const IconAutoWidth = make(<path d="M4.5 12h15M7 9.5 4.5 12 7 14.5M17 9.5l2.5 2.5-2.5 2.5" />);
export const IconAutoHeight = make(<path d="M12 4.5v15M9.5 7 12 4.5 14.5 7M9.5 17l2.5 2.5 2.5-2.5" />);
export const IconFixedSize = make(<rect x="6.5" y="6.5" width="11" height="11" rx="0.5" />);
export const IconStyles = make(
  <>
    <circle cx="8.5" cy="8.5" r="2" />
    <circle cx="15.5" cy="8.5" r="2" />
    <circle cx="8.5" cy="15.5" r="2" />
    <circle cx="15.5" cy="15.5" r="2" />
  </>,
);
export const IconExport = make(<path d="M12 14.5v-9M8.5 9 12 5.5 15.5 9M6.5 13.5v5h11v-5" />);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 4v1.5M12 18.5V20M4 12h1.5M18.5 12H20M6.3 6.3l1.1 1.1M16.6 16.6l1.1 1.1M6.3 17.7l1.1-1.1M16.6 7.4l1.1-1.1" />
  </>,
);
export const IconMoon = make(<path d="M17.5 14.5A6.5 6.5 0 0 1 9.5 6.5a6.5 6.5 0 1 0 8 8z" />);
export const IconKeyboard = make(
  <>
    <rect x="4.5" y="7.5" width="15" height="9" rx="1" />
    <path d="M7.5 10.5h1M10.5 10.5h1M13.5 10.5h1M16 10.5h.5M8.5 13.5h7" />
  </>,
);

// alinhamento
export const IconAlignLeft = make(<path d="M5.5 4.5v15M8.5 8.5h9v2h-9zM8.5 13.5h5v2h-5z" />);
export const IconAlignHCenter = make(<path d="M12 4.5v15M7.5 8.5h9v2h-9zM9.5 13.5h5v2h-5z" />);
export const IconAlignRight = make(<path d="M18.5 4.5v15M6.5 8.5h9v2h-9zM10.5 13.5h5v2h-5z" />);
export const IconAlignTop = make(<path d="M4.5 5.5h15M8.5 8.5h2v9h-2zM13.5 8.5h2v5h-2z" />);
export const IconAlignVCenter = make(<path d="M4.5 12h15M8.5 7.5h2v9h-2zM13.5 9.5h2v5h-2z" />);
export const IconAlignBottom = make(<path d="M4.5 18.5h15M8.5 6.5h2v9h-2zM13.5 10.5h2v5h-2z" />);
export const IconDistH = make(<path d="M5.5 5.5v13M18.5 5.5v13M10.5 8.5h3v7h-3z" />);
export const IconDistV = make(<path d="M5.5 5.5h13M5.5 18.5h13M8.5 10.5h7v3h-7z" />);

// componentes e operações booleanas
export const IconComponent = make(
  <>
    <path d="M12 4.5 14.5 7 12 9.5 9.5 7z" fill="currentColor" stroke="none" />
    <path d="M12 14.5 14.5 17 12 19.5 9.5 17z" fill="currentColor" stroke="none" />
    <path d="M7 9.5 9.5 12 7 14.5 4.5 12z" fill="currentColor" stroke="none" />
    <path d="M17 9.5 19.5 12 17 14.5 14.5 12z" fill="currentColor" stroke="none" />
  </>,
);
export const IconInstance = make(<path d="M12 4.5 19.5 12 12 19.5 4.5 12z" />);
export const IconUnion = make(
  <>
    <rect x="5" y="8" width="9" height="9" rx="1.5" />
    <rect x="10" y="5" width="9" height="9" rx="1.5" />
  </>,
);
export const IconSubtract = make(
  <>
    <path d="M5 5h7v5h-5v5H5z" />
    <rect x="10" y="10" width="9" height="9" rx="1" strokeDasharray="1.5 1.5" />
  </>,
);
export const IconIntersect = make(
  <>
    <rect x="5" y="5" width="9" height="9" rx="1" />
    <rect x="10" y="10" width="9" height="9" rx="1" />
    <rect x="10" y="10" width="4" height="4" fill="currentColor" stroke="none" opacity="0.4" />
  </>,
);
export const IconExclude = make(
  <>
    <rect x="5" y="5" width="9" height="9" rx="1" />
    <rect x="10" y="10" width="9" height="9" rx="1" />
    <path d="m10 10 4 4m0-4-4 4" strokeWidth={1} />
  </>,
);
export const IconPen = make(<path d="m12 4 4 4-8 10-4 1 1-4L12 4zM10 6l3 3" />);

// ---------- Ícones Oficiais de Efeitos (8 Modos) ----------
export const IconInnerShadow = make(
  <g>
    <rect x="4" y="4" width="16" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5.5 5.5h13a1 1 0 0 1 1 1v3h-10a1 1 0 0 0-1 1v7h-3v-12z" fill="currentColor" opacity="0.6" stroke="none" />
  </g>,
);

export const IconDropShadow = make(
  <g>
    <rect x="4" y="4" width="13" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7.5 19.5h9a3 3 0 0 0 3-3v-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </g>,
);

export const IconLayerBlur = make(
  <g fill="currentColor">
    <circle cx="8" cy="8" r="1.5" opacity="0.3" />
    <circle cx="12" cy="8" r="1.8" opacity="0.6" />
    <circle cx="16" cy="8" r="1.5" opacity="0.3" />
    <circle cx="8" cy="12" r="1.8" opacity="0.6" />
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="16" cy="12" r="1.8" opacity="0.6" />
    <circle cx="8" cy="16" r="1.5" opacity="0.3" />
    <circle cx="12" cy="16" r="1.8" opacity="0.6" />
    <circle cx="16" cy="16" r="1.5" opacity="0.3" />
  </g>,
);

export const IconBackgroundBlur = make(
  <g>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.5 2" />
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1.5" />
  </g>,
);

export const IconNoise = make(
  <g fill="currentColor">
    <circle cx="6" cy="6" r="1" />
    <circle cx="11" cy="5" r="0.8" opacity="0.7" />
    <circle cx="17" cy="7" r="1.1" />
    <circle cx="8" cy="10" r="0.9" opacity="0.8" />
    <circle cx="14" cy="11" r="1.2" />
    <circle cx="19" cy="12" r="0.8" opacity="0.6" />
    <circle cx="5" cy="15" r="1.1" />
    <circle cx="10" cy="16" r="0.7" opacity="0.7" />
    <circle cx="15" cy="17" r="1" />
    <circle cx="18" cy="18" r="0.8" opacity="0.5" />
  </g>,
);

export const IconTexture = make(
  <g fill="currentColor">
    <circle cx="6" cy="6" r="1.2" />
    <circle cx="12" cy="6" r="1.2" />
    <circle cx="18" cy="6" r="1.2" />
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="18" cy="12" r="1.2" />
    <circle cx="6" cy="18" r="1.2" />
    <circle cx="12" cy="18" r="1.2" />
    <circle cx="18" cy="18" r="1.2" />
  </g>,
);

export const IconGlass = make(
  <g>
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 9.5a5.5 5.5 0 0 1 7.5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
  </g>,
);

export const IconShader = make(
  <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4.5 8c2.5-2 5-2 7.5 0s5 2 7.5 0" />
    <path d="M4.5 12c2.5-2 5-2 7.5 0s5 2 7.5 0" />
    <path d="M4.5 16c2.5-2 5-2 7.5 0s5 2 7.5 0" />
  </g>,
);

export const IconSliders = make(
  <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1.5" y1="14" x2="6.5" y2="14" />
    <line x1="9.5" y1="8" x2="14.5" y2="8" />
    <line x1="17.5" y1="16" x2="22.5" y2="16" />
  </g>,
);

/** Logotipo da Prancheta (botão do menu principal). */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#0D99FF" />
      <path d="M9 17V7h4.2a3.3 3.3 0 0 1 0 6.6H9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
