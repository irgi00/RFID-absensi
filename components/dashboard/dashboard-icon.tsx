import type { DashboardIconName } from "@/types";

type DashboardIconProps = {
  name: DashboardIconName;
  className?: string;
};

export function DashboardIcon({ name, className }: DashboardIconProps) {
  const sharedProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case "classes":
      return (
        <svg {...sharedProps}>
          <path d="M4 8.5L12 4l8 4.5-8 4.5-8-4.5Z" />
          <path d="M4 12.5L12 17l8-4.5" />
          <path d="M4 16.5L12 21l8-4.5" />
        </svg>
      );
    case "students":
      return (
        <svg {...sharedProps}>
          <path d="M16 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M21 21v-1.5a4 4 0 0 0-3-3.87" />
          <path d="M15 3.4a3.5 3.5 0 0 1 0 6.2" />
        </svg>
      );
    case "rfid-card":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M7 10h5" />
          <path d="M7 14h3" />
          <path d="M15.5 9.5a2.5 2.5 0 0 1 0 5" />
          <path d="M17.5 8a4.5 4.5 0 0 1 0 8" />
        </svg>
      );
    case "rooms":
      return (
        <svg {...sharedProps}>
          <path d="M5 21V5.5A2.5 2.5 0 0 1 7.5 3H17v18" />
          <path d="M17 3h1.5A2.5 2.5 0 0 1 21 5.5V21" />
          <path d="M8 21h13" />
          <path d="M9 9h4" />
          <path d="M9 13h4" />
          <circle cx="15.5" cy="12" r=".5" fill="currentColor" />
        </svg>
      );
    case "devices":
      return (
        <svg {...sharedProps}>
          <rect x="7" y="7" width="10" height="10" rx="2.5" />
          <path d="M9 1v3" />
          <path d="M15 1v3" />
          <path d="M9 20v3" />
          <path d="M15 20v3" />
          <path d="M20 9h3" />
          <path d="M20 15h3" />
          <path d="M1 9h3" />
          <path d="M1 15h3" />
        </svg>
      );
    case "courses":
      return (
        <svg {...sharedProps}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5A2.5 2.5 0 0 0 17.5 16H4Z" />
          <path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21H20" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case "lecturers":
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
          <path d="M18 9l2 2 3-3" />
        </svg>
      );
    case "schedules":
      return (
        <svg {...sharedProps}>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M3 10h18" />
          <path d="M8 14h3" />
          <path d="M13 14h3" />
          <path d="M8 18h3" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...sharedProps}>
          <path d="M9 11.5l2 2 4-4" />
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 3v3" />
          <path d="M16 3v3" />
          <path d="M8 17h8" />
        </svg>
      );
    case "reports":
      return (
        <svg {...sharedProps}>
          <path d="M5 20V9" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
          <path d="M3 20h18" />
        </svg>
      );
    case "shield":
      return (
        <svg {...sharedProps}>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
          <path d="M9.5 11.5l1.8 1.8 3.7-3.8" />
        </svg>
      );
    case "logout":
      return (
        <svg {...sharedProps}>
          <path d="M15 16l4-4-4-4" />
          <path d="M19 12H9" />
          <path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...sharedProps}>
          <path d="M6.5 8.5a5.5 5.5 0 1 1 11 0v3.2c0 .7.25 1.37.7 1.9L19.5 15H4.5l1.3-1.4c.45-.53.7-1.2.7-1.9Z" />
          <path d="M10 18a2.2 2.2 0 0 0 4 0" />
        </svg>
      );
    default:
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
