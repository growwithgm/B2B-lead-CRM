// Small inline icon set (stroke-based, 24x24) used across the shell + views.
// Kept dependency-free to match the design handoff's hand-rolled SVGs.

type P = { size?: number; className?: string; strokeWidth?: number };

function S({
  size = 18,
  className,
  strokeWidth = 1.7,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </S>
);

export const IconLeads = (p: P) => (
  <S {...p}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="7.5" r="3.2" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
    <path d="M15.5 4.7a3.2 3.2 0 0 1 0 5.6" />
  </S>
);

export const IconPipeline = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="5" height="16" rx="1.4" />
    <rect x="9.5" y="4" width="5" height="11" rx="1.4" />
    <rect x="16" y="4" width="5" height="14" rx="1.4" />
  </S>
);

export const IconSamples = (p: P) => (
  <S {...p}>
    <path d="m12 2.5 8 4.5v9.5l-8 4.5-8-4.5V7l8-4.5Z" />
    <path d="m4 7 8 4.5L20 7" />
    <path d="M12 11.5V21" />
  </S>
);

export const IconFollowups = (p: P) => (
  <S {...p}>
    <path d="M11 6h9" />
    <path d="M11 12h9" />
    <path d="M11 18h9" />
    <path d="m3 6 1.3 1.3L7 4.8" />
    <path d="m3 12 1.3 1.3L7 10.8" />
    <path d="m3 18 1.3 1.3L7 16.8" />
  </S>
);

export const IconFeedback = (p: P) => (
  <S {...p}>
    <path d="M21 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v8Z" />
  </S>
);

export const IconReports = (p: P) => (
  <S {...p}>
    <path d="M3 21h18" />
    <rect x="5" y="11" width="3" height="7" rx="1" />
    <rect x="10.5" y="6" width="3" height="12" rx="1" />
    <rect x="16" y="9" width="3" height="9" rx="1" />
  </S>
);

export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 0 1 0 4Z" />
  </S>
);

export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </S>
);

export const IconBell = (p: P) => (
  <S {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </S>
);

export const IconPlus = (p: P) => (
  <S {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconMenu = (p: P) => (
  <S {...p} strokeWidth={1.8}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </S>
);

export const IconClose = (p: P) => (
  <S {...p} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </S>
);

export const IconChevronRight = (p: P) => (
  <S {...p} strokeWidth={2}>
    <path d="m9 6 6 6-6 6" />
  </S>
);

export const IconChevronDown = (p: P) => (
  <S {...p} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p} strokeWidth={2.2}>
    <path d="M20 6 9 17l-5-5" />
  </S>
);

export const IconWhatsApp = (p: P) => (
  <S {...p} strokeWidth={2}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z" />
  </S>
);

export const IconShopping = (p: P) => (
  <S {...p}>
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </S>
);

export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
);

export const IconStar = ({
  size = 15,
  filled = false,
}: {
  size?: number;
  filled?: boolean;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "#E8A93B" : "none"}
    stroke={filled ? "#E8A93B" : "#D6D6CE"}
    strokeWidth={1.6}
    strokeLinejoin="round"
  >
    <path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17.7 6.7 19.2l1-5.8-4.2-4.1 5.9-.9Z" />
  </svg>
);

export const IconLogo = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="5" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="12" r="2" />
    <path d="M7 6h6a4 4 0 0 1 4 4M7 18h6a4 4 0 0 0 4-4" />
  </svg>
);
