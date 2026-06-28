"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx, initials } from "@/lib/design";
import {
  IconLogo,
  IconDashboard,
  IconLeads,
  IconPipeline,
  IconSamples,
  IconFollowups,
  IconFeedback,
  IconReports,
  IconSettings,
  IconSearch,
  IconBell,
  IconPlus,
  IconMenu,
  IconChevronDown,
} from "./icons";

export type NavKey =
  | "dashboard"
  | "leads"
  | "pipeline"
  | "samples"
  | "followups"
  | "feedback"
  | "reports"
  | "settings";

const NAV: {
  key: NavKey;
  label: string;
  href: string;
  Icon: (p: { size?: number }) => JSX.Element;
}[] = [
  { key: "dashboard", label: "Dashboard", href: "/", Icon: IconDashboard },
  { key: "leads", label: "Leads", href: "/leads", Icon: IconLeads },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", Icon: IconPipeline },
  { key: "samples", label: "Samples", href: "/samples", Icon: IconSamples },
  { key: "followups", label: "Follow-ups", href: "/followups", Icon: IconFollowups },
  { key: "feedback", label: "Feedback", href: "/feedback", Icon: IconFeedback },
  { key: "reports", label: "Reports", href: "/reports", Icon: IconReports },
  { key: "settings", label: "Settings", href: "/settings", Icon: IconSettings },
];

export default function AppShell({
  active,
  title,
  subtitle,
  userEmail,
  leadsCount = 0,
  overdueCount = 0,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  userEmail: string;
  leadsCount?: number;
  overdueCount?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/leads?q=${encodeURIComponent(q)}` : "/leads");
  }

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      {/* Backdrop (mobile) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[55] bg-ink/40 backdrop-blur-[1px] lg:hidden"
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-[60] flex w-[250px] flex-col border-r border-line bg-[#FCFCFA] transition-transform duration-200",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0 shadow-drawer" : "-translate-x-full lg:shadow-none"
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#EEEEE7] px-[18px]">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#12936A] to-[#0A5A40] shadow-[0_2px_6px_rgba(14,123,87,.32)]">
            <IconLogo />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-ink">
              GROW NEST
            </div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted">
              B2B Lead CRM
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <div className="px-[11px] pb-2 pt-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#B0B4A8]">
            Menu
          </div>
          {NAV.map(({ key, label, href, Icon }) => {
            const on = key === active;
            const badge =
              key === "leads"
                ? leadsCount
                : key === "followups"
                ? overdueCount
                : null;
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex w-full items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[13.5px] font-semibold transition",
                  on
                    ? "bg-[#E8F2EC] text-brand-deep"
                    : "text-[#4A5048] hover:bg-[#F1F1EB]"
                )}
              >
                <span className="flex flex-shrink-0">
                  <Icon size={18} />
                </span>
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span
                    className={cx(
                      "rounded-full px-2 py-px text-[11px] font-bold",
                      key === "followups"
                        ? "bg-[#FBE9E8] text-[#C5362F]"
                        : "bg-[#EFEFE9] text-[#7C8278]"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <form
          action="/auth/signout"
          method="post"
          className="flex items-center gap-2.5 border-t border-[#EEEEE7] p-3"
        >
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
            {initials(userEmail)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-bold text-[#26302A]">
              {userEmail}
            </div>
            <div className="text-[11px] text-muted">Signed in</div>
          </div>
          <button
            type="submit"
            title="Sign out"
            className="rounded-md p-1 text-[#B0B4A8] transition hover:bg-neutral-100 hover:text-[#3E463C]"
          >
            <IconChevronDown size={16} />
          </button>
        </form>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-3.5 border-b border-[#E9E9E2] bg-[rgba(252,252,250,.82)] px-[14px] backdrop-blur-md sm:px-[26px]">
          <button
            onClick={() => setOpen(true)}
            className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[9px] border border-[#E6E6DE] bg-white text-[#3E463C] transition hover:bg-[#F4F4EF] lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu size={19} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[12.5px] text-muted">{subtitle}</p>
            )}
          </div>

          <div className="flex-1" />

          <form onSubmit={submitSearch} className="relative hidden sm:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A6AB9E]">
              <IconSearch size={16} strokeWidth={1.8} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads, companies…"
              className="h-10 w-[clamp(160px,22vw,290px)] rounded-[10px] border border-[#E6E6DE] bg-white pl-9 pr-3 text-[13.5px] text-[#26302A] focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </form>

          <button
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#E6E6DE] bg-white text-[#3E463C] transition hover:bg-[#F4F4EF]"
            aria-label="Notifications"
          >
            <IconBell size={18} />
            {overdueCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#C5362F]" />
            )}
          </button>

          <Link
            href="/leads/new"
            className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13.5px] font-bold text-white shadow-[0_2px_5px_rgba(14,123,87,.28)] transition hover:bg-brand-dark"
          >
            <IconPlus size={17} />
            <span className="hidden sm:inline">New Lead</span>
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-[clamp(16px,2.3vw,26px)]">{children}</main>
      </div>
    </div>
  );
}
