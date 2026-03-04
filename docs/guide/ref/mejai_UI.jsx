import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Book,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Headphones,
  HelpCircle,
  Home as HomeIcon,
  Inbox,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Plus,
  Route as RouteIcon,
  Search,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";

/**
 * Mejai Help - UI mock with routing (no backend)
 *
 * URL mapping implemented per the user-provided recommended structure:
 * - /login, /signup, /verify, /forgot, /onboarding
 * - /app, /app/calls, /app/calls/:sessionId, /app/analytics, /app/agents
 * - /app/eval, /app/kb, /app/rules, /app/review, /app/settings, /app/billing
 * - /call/:token
 */

// Tiny className joiner (keeps this file dependency-free)
function cx(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(" ")
    .trim();
}

function CardShell({ children, className }) {
  // 카드 윤곽선은 사이드바(border-slate-200)보다 한 단계 짙게 지정
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-300 bg-slate-50",
        className
      )}
    >
      {children}
    </div>
  );

}

function Badge({ tone, children }) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return <span className={cx("text-[11px] rounded-full px-2 py-0.5 border", map[tone] || map.slate)}>{children}</span>;
}

function IconChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {label}
    </span>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500">{label}</div>
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
    </label>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-slate-200" />
      {label ? <div className="text-xs text-slate-500">{label}</div> : null}
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />;
}

/** ------------------------------
 * Operator helper panel (guide + follow-up shortcuts)
 * - Replaces the old UI TODO widget.
 * - Can be enabled/disabled from Settings > 일반.
 * ------------------------------ */

const HELP_PANEL_KEY = "mejai_help_panel_enabled_v1";
const HELP_PANEL_COLLAPSED_KEY = "mejai_help_panel_collapsed_v1";

function useHelpPanelEnabled() {
  const [enabled, setEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(HELP_PANEL_KEY);
      if (raw === null) return true; // default ON
      return raw === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HELP_PANEL_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [enabled]);

  return { enabled, setEnabled };
}

function useHelpPanelCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(HELP_PANEL_COLLAPSED_KEY);
      if (raw === null) return false;
      return raw === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HELP_PANEL_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  return { collapsed, setCollapsed };
}

function HelpPanel() {
  const { enabled } = useHelpPanelEnabled();
  const { collapsed, setCollapsed } = useHelpPanelCollapsed();
  const location = useLocation();

  const steps = useMemo(
    () => [
      { label: "로그인", to: "/login" },
      { label: "온보딩(번호/정책 설정)", to: "/onboarding" },
      { label: "통화/세션 확인", to: "/app/calls" },
      { label: "지식 베이스 업데이트", to: "/app/kb" },
      { label: "규칙(라우팅/에스컬레이션) 설정", to: "/app/rules" },
      { label: "후속 지원 요청 처리", to: "/app/review" },
      { label: "통계/트렌드 확인", to: "/app/analytics" },
      { label: "팀/권한 및 감사로그", to: "/app/settings?tab=workspaces" },
    ],
    []
  );

  const followups = useMemo(() => {
    return reviewQueueSeed.map((r) => ({
      id: r.id,
      title: r.reason,
      meta: `${r.created} · ${r.owner}`,
      to: `/app/calls/${r.sessionId}`,
    }));
  }, []);

  if (!enabled) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white  hover:bg-slate-50"
        aria-label="Open help panel"
        title="도움 패널"
      >
        <HelpCircle className="h-5 w-5 text-slate-700" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[92vw] rounded-2xl border border-slate-200 bg-white ">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">도움 패널</div>
          <div className="text-[11px] text-slate-500 truncate">현재 위치: {location.pathname}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/settings"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            설정
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="Minimize help panel"
            title="최소화"
          >
            <ChevronDown className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-900">서비스 사용 순서</div>
          <ol className="mt-2 space-y-1.5">
            {steps.map((s, idx) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="flex items-center justify-between rounded-lg border border-transparent px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  <span className="truncate">
                    {idx + 1}. {s.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-900">후속 지원 요청 대상</div>
            <Link to="/app/review" className="text-[11px] text-emerald-700 hover:underline">
              큐로 이동
            </Link>
          </div>
          <div className="mt-2 space-y-1">
            {followups.length === 0 ? (
              <div className="text-xs text-slate-500">현재 항목이 없습니다.</div>
            ) : (
              followups.slice(0, 5).map((f) => (
                <Link
                  key={f.id}
                  to={f.to}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-slate-900">{f.id}</div>
                    <Badge tone="amber">{f.title}</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{f.meta}</div>
                </Link>
              ))
            )}
          </div>
          {followups.length > 5 ? <div className="mt-2 text-[11px] text-slate-500">+ {followups.length - 5} more</div> : null}
        </div>
      </div>
    </div>
  );
}

/** ------------------------------
 * Self-tests (no test runner)
 * ------------------------------ */

function runSelfTestsOnce() {
  // NOTE: This project intentionally uses lightweight self-tests because there is no test runner in this sandbox.
  // Add additional structural checks here to catch accidental copy/paste corruption early.
  // Basic structural checks to catch accidental corruption.
  // 1) Follow-up queue item ids must be unique.
  const seenRq = new Set();
  for (const it of reviewQueueSeed) {
    if (seenRq.has(it.id)) throw new Error(`reviewQueueSeed id duplicated: ${it.id}`);
    seenRq.add(it.id);
  }

  // 2) Help panel flags should be readable.
  try {
    const raw1 = localStorage.getItem(HELP_PANEL_KEY);
    if (raw1 !== null && raw1 !== "0" && raw1 !== "1") localStorage.setItem(HELP_PANEL_KEY, "1");
    const raw2 = localStorage.getItem(HELP_PANEL_COLLAPSED_KEY);
    if (raw2 !== null && raw2 !== "0" && raw2 !== "1") localStorage.setItem(HELP_PANEL_COLLAPSED_KEY, "0");
  } catch {
    // ignore
  }

  // 3) SidebarGroup renders a header and children.
  // We cannot render here, but we can at least ensure the function exists.
  if (typeof SidebarGroup !== "function") throw new Error("SidebarGroup is missing");

  // 4) CallsListPage should exist exactly once.
  if (typeof CallsListPage !== "function") throw new Error("CallsListPage is missing");
}

/** ------------------------------
 * Mock auth state (front-end only)
 * ------------------------------ */

const AUTH_KEY = "mejai_mock_auth_v1";
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}
function setAuth(val) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(val));
}
function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function RequireAuth({ children }) {
  const location = useLocation();
  const authed = !!getAuth();
  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** ------------------------------
 * Mock data
 * ------------------------------ */

const agentsSeed = [
  { id: "a_support", name: "고객지원" },
  { id: "a_billing", name: "결제/환불" },
];

const sessionsSeed = [
  {
    id: "s_9d3f2b",
    startedAt: "2026-01-21 10:12",
    durationSec: 312,
    channel: "Voice",
    caller: "+82-10-1234-5678",
    outcome: "Resolved",
    sentiment: "Neutral",
    agentId: "a_billing",
    agent: "결제/환불",
    transcript: [
      { t: "00:00", who: "Agent", text: "안녕하세요, Mejai Help입니다. 어떤 도움을 드릴까요?" },
      { t: "00:07", who: "Caller", text: "결제 영수증을 다시 받고 싶어요." },
      { t: "00:15", who: "Agent", text: "네, 이메일 주소를 알려주시면 재발송 도와드리겠습니다." },
      { t: "00:42", who: "Caller", text: "test@example.com 입니다." },
      { t: "01:10", who: "Agent", text: "확인했습니다. 1~2분 내로 재발송될 예정입니다." },
    ],
  },
  {
    id: "s_12a0c8",
    startedAt: "2026-01-20 18:43",
    durationSec: 642,
    channel: "Voice",
    caller: "+82-2-555-0101",
    outcome: "Escalated",
    sentiment: "Frustrated",
    agentId: "a_support",
    agent: "고객지원",
    transcript: [
      { t: "00:00", who: "Agent", text: "안녕하세요. 오늘 어떤 문제로 연락주셨나요?" },
      { t: "00:08", who: "Caller", text: "환불이 처리되지 않았어요." },
      { t: "00:25", who: "Agent", text: "확인 위해 주문번호를 요청드립니다." },
      { t: "01:02", who: "Caller", text: "주문번호는 8841 입니다." },
      { t: "02:20", who: "Agent", text: "담당자에게 연결하겠습니다." },
    ],
  },
];

const kbSeed = [
  { id: "kb_001", title: "환불 정책", version: "v3", updated: "2026-01-18", status: "Published" },
  { id: "kb_002", title: "배송 지연 안내", version: "v5", updated: "2026-01-16", status: "Published" },
  { id: "kb_003", title: "A/S 접수 프로세스", version: "v2", updated: "2026-01-10", status: "Draft" },
];

const reviewQueueSeed = [
  { id: "rq_01", sessionId: "s_12a0c8", reason: "후속 지원 요청", created: "2026-01-20", owner: "Unassigned" },
  { id: "rq_02", sessionId: "s_9d3f2b", reason: "정책 미준수 의심", created: "2026-01-21", owner: "Jane" },
];

/** ------------------------------
 * Layout pieces
 * ------------------------------ */

function AppMain({ children, className }) {
  return (
    <div className={cx("px-5 md:px-8 py-6", className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

function AppShell({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === "/app") return "대시보드";
    if (p.startsWith("/app/calls")) return "통화/세션";
    if (p.startsWith("/app/analytics")) return "통계/트렌드";
    if (p.startsWith("/app/review")) return "후속 지원 요청";
    if (p.startsWith("/app/agents")) return "에이전트";
    if (p.startsWith("/app/eval")) return "평가/관리";
    if (p.startsWith("/app/kb")) return "지식 베이스";
    if (p.startsWith("/app/rules")) return "규칙";
    if (p.startsWith("/app/settings")) return "설정";
    if (p.startsWith("/app/billing")) return "결제/플랜";
    return "";
  }, [location.pathname]);

  const showSearch = useMemo(() => {
    return location.pathname.startsWith("/app/calls");
  }, [location.pathname]);

  function toggleSidebar() {
    // Mobile: open drawer. Desktop: collapse/expand.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  }

  const renderedChildren = useMemo(() => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { headerSearch });
    }
    return children;
  }, [children, headerSearch]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      <AppSidebar collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          title={pageTitle}
          showSearch={showSearch}
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto pt-[60px]">{renderedChildren}</main>

        <HelpPanel />
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <AppSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </MobileDrawer>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-2xl bg-slate-200" />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-slate-900">Mejai</div>
      </div>
    </div>
  );
}

function AppHeader({ title, showSearch, searchValue, onSearchChange, onToggleSidebar }) {
  return (
    <header className="w-full mx-auto flex items-center gap-2 bg-white/90 backdrop-blur-[8px] border-b border-slate-200 px-4 md:px-8 py-[10px] h-[60px] sticky top-0 z-30">
      <button
        onClick={onToggleSidebar}
        className="relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus:outline-none disabled:pointer-events-auto bg-transparent hover:bg-slate-100 active:bg-slate-200 rounded-[10px] pointer-events-auto p-0 h-8 w-8 text-slate-600 hover:text-slate-900 duration-100 transition-colors shrink-0"
        aria-label="Toggle sidebar"
        title="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
          <rect x="7" y="6.5" width="7" height="1.5" rx="0.75" transform="rotate(90 7 6.5)" fill="currentColor" />
          <rect x="3" y="4" width="14" height="12" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0 overflow-hidden w-full py-1 px-1 -mr-1">
        <div className="shrink-0">
          <h1 data-testid="page-title" className="text-sm text-slate-900 font-medium truncate">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center max-h-full w-fit gap-2">
        {showSearch ? (
          <div className="hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-8 w-72 rounded-[0.6rem] border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Search..."
                aria-label="Search"
              />
            </div>
          </div>
        ) : null}

        <button
          className="relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-75 focus:outline-none bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-900 shadow-none h-8 px-2.5 text-xs rounded-[0.6rem]"
          type="button"
        >
          Docs
        </button>

        <ProfileMenu />
      </div>
    </header>
  );
}

function MobileDrawer({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] border-r border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
              <div className="font-semibold tracking-tight text-slate-900">Mejai Help</div>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const auth = getAuth();

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const email = auth?.email || "operator@mejai.help";

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-label="Your profile"
        tabIndex={0}
        className="group relative flex h-10 w-10 items-center justify-center rounded-lg outline-none hover:bg-slate-100 transition-all duration-150"
      >
        <div className="relative h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
          {auth?.avatarUrl ? (
            <Image src={auth.avatarUrl} alt="Profile" fill sizes="36px" className="object-cover" />
          ) : (
            <span className="text-xs font-semibold text-slate-700">
              {String(email || "U").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white z-50"
            role="dialog"
          >
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500">로그인 계정</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">{email}</div>
            </div>

            <div className="p-3 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">구독 현황</div>
                  <Link to="/app/billing" onClick={() => setOpen(false)} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">업그레이드</Link>
                </div>
                <div className="mt-2 text-xs text-slate-600">플랜: Free · 크레딧: 10,000 (Mock)</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <Link to="/app/settings" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50">
                  설정
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
                <Link to="/app/billing" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50">
                  구독/결제
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button onClick={() => { clearAuth(); window.location.href = "/login"; }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50">
                  로그아웃
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SidebarGroup({ header, children, collapsed }) {
  return (
    <div>
      {collapsed ? (
        <div className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wide">•</div>
      ) : (
        <div className="px-3 text-[11px] font-medium text-slate-500">{header}</div>
      )}
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, badge, onClick, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/app" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      title={label}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm border",
        collapsed ? "justify-center" : "",
        isActive ? "bg-slate-100 border-slate-200 text-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"
      )}
    >
      <Icon className={cx("h-4 w-4", isActive ? "text-emerald-600" : "text-slate-500")} />
      {collapsed ? null : <span className="truncate">{label}</span>}
      {typeof badge === "number" && !collapsed ? (
        <span className="ml-auto text-[11px] rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">{badge}</span>
      ) : null}
    </Link>
  );
}

function AppSidebar({ onNavigate, collapsed = false }) {
  return (
    <aside
      className={cx(
        "hidden md:flex md:flex-col border-r border-slate-200 bg-white transition-[width] duration-150 sticky top-0 h-screen overflow-y-auto",
        collapsed ? "md:w-20" : "md:w-72"
      )}
    >
      <div className={cx("h-[60px] flex items-center", collapsed ? "px-3" : "px-5")}>
        {collapsed ? (
          <div className="flex items-center justify-center">
            <div className="h-9 w-9 rounded-2xl bg-slate-200" title="Mejai Help" />
          </div>
        ) : (
          <BrandMark />
        )}
      </div>

      <nav className={cx("py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        <SidebarGroup header="홈" collapsed={collapsed}>
          <SidebarLink to="/app" icon={HomeIcon} label="대시보드" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="모니터링" collapsed={collapsed}>
          <SidebarLink to="/app/calls" icon={PhoneCall} label="통화/세션" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/analytics" icon={BarChart3} label="통계/트렌드" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink
            to="/app/review"
            icon={Inbox}
            label="후속 지원 요청"
            badge={reviewQueueSeed.length}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        </SidebarGroup>

        <SidebarGroup header="구성" collapsed={collapsed}>
          <SidebarLink to="/app/agents" icon={Users} label="에이전트" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/eval" icon={ClipboardCheck} label="평가/관리" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/kb" icon={Book} label="지식 베이스" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/rules" icon={RouteIcon} label="규칙" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="온보딩" collapsed={collapsed}>
          <SidebarLink to="/onboarding" icon={Phone} label="번호/정책 설정" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="설정" collapsed={collapsed}>
          <SidebarLink to="/app/settings" icon={Settings} label="설정" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>
      </nav>

      <div className="mt-auto p-4 border-t border-slate-200 space-y-3">
        <Link
          to="/app/billing"
          className="w-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <CreditCard className="h-4 w-4 mr-2 text-slate-600" />
          결제/플랜
        </Link>
      </div>
    </aside>
  );
}

/** ------------------------------
 * Auth / onboarding pages
 * ------------------------------ */

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-4 py-12">
        <div className="mb-10 flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-slate-200" />
          <div className="font-semibold tracking-tight text-slate-900">Mejai Help</div>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white ">
            <div className="p-5">
              {children}
              {footer ? <div className="mt-4 text-center text-sm text-slate-600">{footer}</div> : null}
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-slate-500">© Mejai Help (Mock)</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }) {
  return (
    <CardShell>
      <div className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{sub}</div>
      </div>
    </CardShell>
  );
}

function AgentSelectPopover({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  const options = useMemo(() => [{ id: "all", name: "전체 에이전트" }, ...agentsSeed.map((a) => ({ id: a.id, name: a.name }))], []);

  const followupCountByAgent = useMemo(() => {
    const by = new Map();
    for (const a of agentsSeed) by.set(a.id, 0);
    for (const rq of reviewQueueSeed) {
      const s = sessionsSeed.find((x) => x.id === rq.sessionId);
      if (!s) continue;
      by.set(s.agentId, (by.get(s.agentId) || 0) + 1);
    }
    return by;
  }, []);
  const selected = options.find((o) => o.id === value) || options[0];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.name.toLowerCase().includes(query));
  }, [options, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50",
          open ? "border-slate-300" : ""
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selected.name}
        <ChevronDown className={cx("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white  z-40"
            role="dialog"
          >
            <div className="p-3 border-b border-slate-200">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="에이전트 검색..."
                aria-label="에이전트 검색"
              />
            </div>
            <div className="max-h-72 overflow-auto p-2">
              {filtered.map((o) => {
                const active = o.id === value;
                const count = followupCountByAgent.get(o.id) || 0;
                const showCount = o.id !== "all";

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cx(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{o.name}</span>
                    </div>

                    {showCount ? (
                      <span className="text-[11px] rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700 tabular-nums">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DateRangePopover({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const presets = [
    { id: "last_day", label: "어제" },
    { id: "last_week", label: "지난 주" },
    { id: "last_month", label: "지난 달" },
  ];
  const selected = presets.find((p) => p.id === value) || presets[2];

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50",
          open ? "border-slate-300" : ""
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selected.label}
        <ChevronDown className={cx("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[640px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white  z-40"
            role="dialog"
          >
            <div className="flex">
              <div className="w-40 shrink-0 border-r border-slate-200 p-2">
                {presets.map((p) => {
                  const active = p.id === value;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChange(p.id)}
                      className={cx(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                        active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {p.label}
                      {active ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Start</div>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      defaultValue="2025-12-22 오후 09:46"
                      aria-label="Start"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">End</div>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      defaultValue="2026-01-21 오후 09:46"
                      aria-label="End"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">캘린더 (Mock)</div>
                  <div className="mt-2 text-xs text-slate-500">실제 구현에서는 date-range picker 컴포넌트를 연결합니다.</div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-slate-700">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 py-2">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange("last_month");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DashboardPage() {
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const [range, setRange] = useState("last_month");

  const sessionsForSelection = useMemo(() => {
    if (selectedAgentId === "all") return sessionsSeed;
    return sessionsSeed.filter((s) => s.agentId === selectedAgentId);
  }, [selectedAgentId]);

  const followupCountByAgent = useMemo(() => {
    const by = new Map();
    for (const a of agentsSeed) by.set(a.id, 0);
    for (const rq of reviewQueueSeed) {
      const s = sessionsSeed.find((x) => x.id === rq.sessionId);
      if (!s) continue;
      by.set(s.agentId, (by.get(s.agentId) || 0) + 1);
    }
    return by;
  }, []);

  const summary = useMemo(() => {
    const totalCalls = sessionsForSelection.length;
    const avgDurationSec = totalCalls
      ? Math.round(sessionsForSelection.reduce((acc, s) => acc + s.durationSec, 0) / totalCalls)
      : 0;
    const resolved = sessionsForSelection.filter((s) => s.outcome === "Resolved").length;
    const successRate = totalCalls ? Math.round((resolved / totalCalls) * 100) : 0;

    // Mock 비용(0)
    const totalCostCredits = 0;
    const totalLlmCostUsd = 0;
    const avgCostCredits = 0;
    const avgLlmCostUsdPerMin = 0;

    // Most called agents (within current selection)
    const counts = new Map();
    for (const s of sessionsForSelection) counts.set(s.agentId, (counts.get(s.agentId) || 0) + 1);
    const mostCalled = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({
        id,
        count,
        name: agentsSeed.find((a) => a.id === id)?.name || id,
      }));

    return {
      totalCalls,
      avgDurationSec,
      totalCostCredits,
      avgCostCredits,
      totalLlmCostUsd,
      avgLlmCostUsdPerMin,
      successRate,
      mostCalled,
    };
  }, [sessionsForSelection]);

  function fmtDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <AppMain>
      {/* 요청사항 3: main/div 하위 요소 상하 간격 확보 */}
      <div className="space-y-6">
        {/* 상단 컨트롤: (A안) 에이전트 선택 + 기간 선택 + 후속 지원 요청 표시 */}
        <div className="flex flex-wrap items-start justify-end gap-3">

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <AgentSelectPopover value={selectedAgentId} onChange={setSelectedAgentId} />
              <DateRangePopover value={range} onChange={setRange} />
            </div>
          </div>
        </div>
        {/* 성과 요약(선택된 에이전트 기준: all이면 전체 합산) */}
        {/* 요청사항 4: div[2], div[3], div[4]를 하나의 박스로 묶어 옅은 회색 배경으로 감싸기 */}
        <div className="rounded-2xl bg-slate-100/40 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Metric label="통화 수" value={String(summary.totalCalls)} sub="" />
            <Metric label="평균 통화 시간" value={fmtDuration(summary.avgDurationSec)} sub="" />
            <Metric label="총 비용" value={`${summary.totalCostCredits}`} sub="크레딧" />
            <Metric label="평균 비용" value={`${summary.avgCostCredits}`} sub="크레딧/통화" />
            <Metric label="총 LLM 비용" value={`$${summary.totalLlmCostUsd}`} sub="" />
            <Metric label="평균 LLM 비용" value={`$${summary.avgLlmCostUsdPerMin}`} sub="/분" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CardShell className="lg:col-span-2">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">전체 성공률</div>
                <div className="text-sm font-semibold text-slate-900">{summary.successRate}%</div>
              </div>
              <div className="p-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">차트(예시)</div>
                  <div className="mt-3 space-y-2">
                    <SkeletonLine />
                    <SkeletonLine />
                    <SkeletonLine />
                  </div>
                  <div className="mt-4 text-[11px] text-slate-500">Hover/툴팁은 실제 차트 라이브러리 연동 시 적용됩니다.</div>
                </div>
              </div>
            </CardShell>

            <CardShell>
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">가장 많이 호출된 에이전트</div>
                <div className="text-xs text-slate-500">Calls</div>
              </div>
              <div className="p-5 space-y-2">
                {summary.mostCalled.length === 0 ? (
                  <div className="text-sm text-slate-500">데이터가 없습니다.</div>
                ) : (
                  summary.mostCalled.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-sm text-slate-900 font-medium truncate">{a.name}</div>
                      <div className="text-sm text-slate-700 tabular-nums">{a.count}</div>
                    </div>
                  ))
                )}
              </div>
            </CardShell>
          </div>

          {/* (A안) 에이전트 목록(항상 표시). 에이전트를 클릭하면 상단 지표가 해당 에이전트 기준으로 갱신 */}
          <CardShell>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">에이전트별 성과</div>
              <div className="text-xs text-slate-500">에이전트를 클릭하면 상단 지표가 해당 에이전트 기준으로 갱신됩니다.</div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(selectedAgentId === "all" ? agentsSeed : agentsSeed.filter((x) => x.id === selectedAgentId)).map((a) => {
                const agentSessions = sessionsSeed.filter((s) => s.agentId === a.id);
                const calls = agentSessions.length;
                const resolved = agentSessions.filter((s) => s.outcome === "Resolved").length;
                const successRate = calls ? Math.round((resolved / calls) * 100) : 0;
                const followups = followupCountByAgent.get(a.id) || 0;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAgentId(a.id)}
                    className={cx(
                      "text-left rounded-2xl border p-4 transition-colors",
                      selectedAgentId === a.id ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900 truncate">{a.name}</div>

                          {/* 후속 지원 요청 알림: 해당 에이전트에 1건 이상 존재 시에만 표시 */}
                          {followups > 0 ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                              후속 지원 요청 {followups}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <div className="text-[11px] text-slate-500">통화 수</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{calls}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <div className="text-[11px] text-slate-500">성공률</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{successRate}%</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <div className="text-[11px] text-slate-500">평균 통화 시간</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                          {calls ? fmtDuration(Math.round(agentSessions.reduce((acc, s) => acc + s.durationSec, 0) / calls)) : "0:00"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardShell>
        </div>
      </div>
    </AppMain>
  );
}

function CallsListPage({ headerSearch = "" }) {
  const q = headerSearch.trim().toLowerCase();
  const filtered = sessionsSeed.filter((s) => (q ? (s.id + s.caller + s.agent).toLowerCase().includes(q) : true));

  return (
    <AppMain className="space-y-4">
      <CardShell>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="text-sm font-semibold text-slate-900">Sessions</div>
          <div className="text-xs text-slate-500">Mock: {filtered.length} items</div>
        </div>
        <ul className="divide-y divide-slate-200">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link to={`/app/calls/${s.id}`} className="block p-4 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-900">{s.id}</div>
                  <Badge tone={s.outcome === "Resolved" ? "green" : "amber"}>{s.outcome}</Badge>
                  <span className="ml-auto text-xs text-slate-500">{s.startedAt}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <IconChip icon={PhoneCall} label={s.caller} />
                  <IconChip icon={Clock} label={`${Math.round(s.durationSec / 60)}m`} />
                  <IconChip icon={Headphones} label={s.agent} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardShell>
    </AppMain>
  );
}

function AudioStub() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Audio</div>
        <Badge tone="slate">Mock</Badge>
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine />
        <SkeletonLine />
        <div className="flex items-center gap-2 pt-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
            <Play className="inline h-3.5 w-3.5 mr-1.5" />
            Play
          </button>
          <div className="text-xs text-slate-500">00:00 / 05:12</div>
        </div>
      </div>
    </div>
  );
}

function CallsDetailPage() {
  const { sessionId } = useParams();
  const session = sessionsSeed.find((s) => s.id === sessionId);

  if (!session) {
    return (
      <AppMain className="space-y-4">
        <CardShell className="p-5">
          <div className="text-sm text-slate-900">세션을 찾을 수 없습니다.</div>
          <div className="mt-3">
            <Link className="text-sm text-emerald-700 hover:underline" to="/app/calls">
              세션 목록으로
            </Link>
          </div>
        </CardShell>
      </AppMain>
    );
  }

  return (
    <AppMain className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 space-y-4">
          <CardShell className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <IconChip icon={PhoneCall} label={session.caller} />
              <IconChip icon={Clock} label={`${session.durationSec}s`} />
              <IconChip icon={Headphones} label={session.agent} />
              <Badge tone={session.outcome === "Resolved" ? "green" : "amber"}>{session.outcome}</Badge>
              <Badge tone={session.sentiment === "Frustrated" ? "red" : "slate"}>{session.sentiment}</Badge>
              <span className="ml-auto text-xs text-slate-500">{session.startedAt}</span>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              실제 구현에서는: 녹취 URL, STT 타임코드, 이벤트(툴 호출/라우팅/에스컬레이션) 등을 표시합니다.
            </div>
          </CardShell>

          <AudioStub />

          <CardShell className="p-5">
            <div className="text-sm font-semibold text-slate-900">Session actions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
                <Pencil className="inline h-3.5 w-3.5 mr-1.5" />
                라벨 수정
              </button>
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
                <Upload className="inline h-3.5 w-3.5 mr-1.5" />
                내보내기
              </button>
            </div>
          </CardShell>
        </div>

        <div className="xl:col-span-7">
          <CardShell>
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Transcript timeline</div>
              <div className="mt-1 text-xs text-slate-500">타임코드 기반 대화 흐름</div>
            </div>
            <div className="p-5 space-y-3">
              {session.transcript.map((m, idx) => {
                const isAgent = m.who === "Agent";
                return (
                  <div key={idx} className={cx("flex gap-3", isAgent ? "" : "justify-end")}>
                    <div
                      className={cx(
                        "w-full max-w-[520px] rounded-2xl border p-3",
                        isAgent ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className={cx("font-medium", isAgent ? "text-slate-900" : "text-emerald-800")}>{m.who}</div>
                        <div className="text-slate-500">{m.t}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-900 leading-relaxed">{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardShell>
        </div>
      </div>
    </AppMain>
  );
}

function SimplePage({ title, children }) {
  return (
    <AppMain className="space-y-4">
      <CardShell className="p-5">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-3">
        {children || (
          <div className="text-sm text-slate-900">
            <div className="font-semibold">UI placeholder</div>
            <div className="mt-2 text-xs text-slate-500">
              이 섹션은 라우팅/페이지 골격만 구성되어 있습니다. 실제 데이터/액션은 API 연동으로 구현하세요.
            </div>
          </div>
        )}
        </div>
      </CardShell>
    </AppMain>
  );
}

function AnalyticsPage() {
  return (
    <SimplePage title="통계/트렌드">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Success rate (7d)" value="50%" sub="Mock" />
        <Metric label="Avg handle time" value="7.9m" sub="Mock" />
        <Metric label="Escalation rate" value="50%" sub="Mock" />
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Trend chart</div>
        <div className="mt-3 space-y-2">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
        </div>
      </div>
    </SimplePage>
  );
}

function EvalPage() {
  return (
    <SimplePage title="평가/관리">
      <div className="text-sm text-slate-900 font-semibold">평가 항목 (예시)</div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {[
          { k: "정책 준수", v: "Pass" },
          { k: "정확성", v: "Needs review" },
          { k: "에스컬레이션 적합성", v: "Pass" },
          { k: "개인정보 마스킹", v: "Pending" },
        ].map((it) => (
          <div key={it.k} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-slate-500">{it.k}</div>
            <div className="mt-1 text-slate-900 font-medium">{it.v}</div>
          </div>
        ))}
      </div>
    </SimplePage>
  );
}

function KBPage() {
  const [tab, setTab] = useState("Documents");
  return (
    <SimplePage title="지식 베이스">
      <div className="flex flex-wrap gap-2">
        {["Documents", "Versions", "Ingestion"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "rounded-xl border px-3 py-2 text-xs",
              tab === t ? "border-slate-200 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
            <Upload className="inline h-4 w-4 mr-2" />
            파일 추가
          </button>
          <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Plus className="inline h-4 w-4 mr-2" />
            문서 생성
          </button>
        </div>
      </div>

      <CardShell className="mt-4">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">KB items</div>
          <div className="text-xs text-slate-500">Mock</div>
        </div>
        <ul className="divide-y divide-slate-200">
          {kbSeed.map((d) => (
            <li key={d.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="font-medium text-slate-900">{d.title}</div>
                <Badge tone={d.status === "Published" ? "green" : "amber"}>{d.status}</Badge>
                <Badge tone="slate">{d.version}</Badge>
                <div className="ml-auto text-xs text-slate-500">Updated: {d.updated}</div>
              </div>
              <div className="mt-2 text-xs text-slate-500">Ingestion 상태/Chunk/임베딩 버전/적용 에이전트 등을 표시할 수 있습니다.</div>
            </li>
          ))}
        </ul>
      </CardShell>
    </SimplePage>
  );
}

function RulesPage() {
  return (
    <SimplePage title="규칙">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardShell className="p-4">
          <div className="text-sm font-semibold text-slate-900">라우팅 규칙</div>
          <div className="mt-2 text-xs text-slate-500">예: 환불/결제 → Billing Queue, 배송 → Logistics Queue, 분쟁 → Human Escalation</div>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-900">Rule #12</span>
                <Badge tone="green">Enabled</Badge>
              </div>
              <div className="mt-1 text-slate-500">intent=refund OR policy=chargeback → escalate=human</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-900">Rule #05</span>
                <Badge tone="amber">Draft</Badge>
              </div>
              <div className="mt-1 text-slate-500">intent=delivery → tool=shipment_lookup</div>
            </div>
          </div>
        </CardShell>

        <CardShell className="p-4">
          <div className="text-sm font-semibold text-slate-900">에스컬레이션 정책</div>
          <div className="mt-2 text-xs text-slate-500">예: 신원 확인 실패, 개인정보 요청, 고위험 민원 시 강제 에스컬레이션</div>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-900">PII request</span>
                <Badge tone="green">Enabled</Badge>
              </div>
              <div className="mt-1 text-slate-500">masking=required; if fail → human</div>
            </div>
          </div>
        </CardShell>
      </div>
    </SimplePage>
  );
}

function ReviewPage() {
  const [owner, setOwner] = useState("");
  const items = useMemo(() => {
    const q = owner.trim().toLowerCase();
    return reviewQueueSeed.filter((r) => (q ? r.owner.toLowerCase().includes(q) : true));
  }, [owner]);

  return (
    <SimplePage title="후속 지원 요청">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput label="Owner filter" value={owner} onChange={setOwner} placeholder="Jane" />
      </div>

      <CardShell className="mt-4">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Queue</div>
          <div className="text-xs text-slate-500">{items.length} items</div>
        </div>
        <ul className="divide-y divide-slate-200">
          {items.map((r) => (
            <li key={r.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="font-medium text-slate-900">{r.id}</div>
                <Badge tone="amber">{r.reason}</Badge>
                <div className="ml-auto text-xs text-slate-500">{r.created}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <IconChip icon={CheckCircle2} label={`Owner: ${r.owner}`} />
                <Link className="text-emerald-700 hover:underline" to={`/app/calls/${r.sessionId}`}>
                  세션 보기
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardShell>
    </SimplePage>
  );
}

function TeamPage() {
  return <Navigate to="/app/settings?tab=team" replace />;
}

function AuditPage() {
  return <Navigate to="/app/settings?tab=audit" replace />;
}

function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = (searchParams.get("tab") || "profile").toLowerCase();
  const tab = rawTab === "general" ? "profile" : rawTab;

  const auth = getAuth();
  const email = auth?.email || "dragon7159@gmail.com";
  const givenName = "성지용";

  const { enabled: helpPanelEnabled, setEnabled: setHelpPanelEnabled } = useHelpPanelEnabled();

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "workspaces", label: "Workspaces" },
    { key: "team", label: "팀/권한" },
    { key: "audit", label: "감사로그" },
  ];

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-b border-slate-200 pb-2">
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setSearchParams({ tab: t.key })}
                className={cx(
                  "whitespace-nowrap rounded-xl border px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === "workspaces" ? (
            <CardShell>
              <div className="divide-y divide-slate-200">
                <section className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Workspace</div>
                    <div className="mt-1 text-sm text-slate-600">성지용&apos;s Workspace</div>
                    <div className="mt-1 text-xs text-slate-500">Location: /workspaces/01 (Mock)</div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Manage</button>
                </section>
              </div>
            </CardShell>
          ) : tab === "team" ? (
            <CardShell>
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">팀/권한</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {[
                    { role: "Owner", perms: "All access" },
                    { role: "Operator", perms: "Calls, KB, Review" },
                    { role: "Auditor", perms: "Read-only, Audit" },
                  ].map((r) => (
                    <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">{r.role}</div>
                      <div className="mt-1 text-slate-600">{r.perms}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardShell>
          ) : tab === "audit" ? (
            <div className="space-y-3">
              {[
                { t: "2026-01-21 10:30", who: "operator@mejai.help", what: "Viewed session s_9d3f2b" },
                { t: "2026-01-20 18:50", who: "jane@mejai.help", what: "Assigned review rq_01" },
                { t: "2026-01-18 09:02", who: "owner@mejai.help", what: "Published KB '환불 정책' v3" },
              ].map((e, idx) => (
                <CardShell key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-900">{e.what}</div>
                    <div className="text-slate-500">{e.t}</div>
                  </div>
                  <div className="mt-1 text-slate-600">{e.who}</div>
                </CardShell>
              ))}
            </div>
          ) : (
            <CardShell>
              <div className="divide-y divide-slate-200">
                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">E-Mail Address</p>
                    <p className="text-sm text-slate-600">{email}</p>
                  </div>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">Given Name</p>
                    <p className="text-sm text-slate-600">{givenName}</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Update Given Name</button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">Current Plan</p>
                    <p className="text-sm text-slate-600">Free</p>
                  </div>
                  <Link to="/app/billing" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    Manage Subscription
                  </Link>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">도움 패널</p>
                    <p className="text-sm text-slate-600">서비스 사용 순서와 후속 지원 요청 대상 바로가기를 표시합니다.</p>
                  </div>
                  <button
                    onClick={() => setHelpPanelEnabled((v) => !v)}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-sm",
                      helpPanelEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {helpPanelEnabled ? "ON" : "OFF"}
                  </button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">Sign out of all devices</p>
                    <p className="text-sm text-slate-600">Sign out of all devices and sessions (Mock).</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Sign out</button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-rose-600">Delete Account</p>
                    <p className="text-sm text-slate-600">Deleting your account is permanent (Mock).</p>
                  </div>
                  <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100">Delete Account</button>
                </section>
              </div>
            </CardShell>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentsPage() {
  const agents = useMemo(() => [{ id: "a_01", name: "test", createdBy: "성지용", createdAt: "Jan 21, 2026, 1:10 PM" }], []);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Link to="/app/agents/runtime" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              Runtime
            </Link>
            <Link to="/app/agents/new" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus className="inline h-4 w-4 mr-2" />
              New agent
            </Link>
          </div>
        </div>

        <CardShell className="mt-4">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">Agents</div>
          <div className="divide-y divide-slate-200">
            {agents.map((a) => (
              <div key={a.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Created by {a.createdBy} · {a.createdAt}
                    </div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Options</button>
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

function BillingPage() {
  return (
    <SimplePage title="결제/플랜">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Starter", price: "₩0", desc: "개발/검증용" },
          { name: "Pro", price: "₩199,000", desc: "운영 팀용" },
          { name: "Enterprise", price: "Custom", desc: "보안/컴플라이언스" },
        ].map((p) => (
          <CardShell key={p.name} className="p-5">
            <div className="text-sm font-semibold text-slate-900">{p.name}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{p.price}</div>
            <div className="mt-2 text-xs text-slate-500">{p.desc}</div>
            <button className="mt-4 w-full rounded-xl bg-slate-900 text-white text-sm font-semibold py-2 hover:bg-slate-800">Select</button>
          </CardShell>
        ))}
      </div>
    </SimplePage>
  );
}

/** ------------------------------
 * One-time call web input page (questioner)
 * ------------------------------ */

function CallTokenPage() {
  const { token } = useParams();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <CardShell>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-slate-200" />
              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight">웹 입력</div>
                <div className="mt-1 text-xs text-slate-500">
                  Token: <span className="text-slate-900 font-medium">{token}</span> (1회용 가정)
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium">상담 중 필요한 정보를 입력하세요</div>
              <div className="mt-2 text-xs text-slate-500">운영자/에이전트가 통화 중 링크를 전달하면, 고객이 이 페이지에서 텍스트를 제출합니다.</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500">입력</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="예: 주문번호 8841 / 이메일 test@example.com"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSent(true)}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                제출
              </button>
              <button
                onClick={() => {
                  setText("");
                  setSent(false);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 hover:bg-slate-50"
              >
                초기화
              </button>
            </div>

            {sent ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                Mock: 입력이 제출되었습니다. 실제 구현에서는 WebSocket/HTTPS로 세션에 첨부합니다.
              </div>
            ) : null}
          </div>
        </CardShell>

        <div className="mt-4 text-center text-xs text-slate-500">
          If you are an operator, go to{" "}
          <Link className="text-emerald-700 hover:underline" to="/login">
            /login
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

/** ------------------------------
 * Auth page implementations (simple layout)
 * ------------------------------ */

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("dragon7159@gmail.com");
  const [pw, setPw] = useState("");
  const from = (location.state && location.state.from) || "/app";

  return (
    <AuthShell
      title="Welcome back"
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link className="text-emerald-700 hover:underline" to="/signup">
            Sign up
          </Link>
        </span>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={() => {
            setAuth({ email: email || "operator@mejai.help" });
            navigate(from, { replace: true });
          }}
        >
          Sign in with Google
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={() => {
            setAuth({ email: email || "operator@mejai.help" });
            navigate(from, { replace: true });
          }}
        >
          Sign in with Apple
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={() => {
            setAuth({ email: email || "operator@mejai.help" });
            navigate(from, { replace: true });
          }}
        >
          Sign in with SSO
        </button>

        <Divider />

        <label className="block">
          <div className="text-xs text-slate-600">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">Password</div>
            <Link to="/forgot" className="text-xs text-slate-500 hover:underline">
              Forgot your password?
            </Link>
          </div>
          <input
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>

        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => {
            setAuth({ email: email || "operator@mejai.help" });
            navigate(from, { replace: true });
          }}
        >
          Sign in
        </button>
      </div>
    </AuthShell>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("dragon7159@gmail.com");
  const [pw, setPw] = useState("");

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up to access the operator console."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="text-emerald-700 hover:underline" to="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-slate-600">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">Password</div>
          <input
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => navigate("/verify", { replace: true })}
        >
          Sign up
        </button>
      </div>
    </AuthShell>
  );
}

function VerifyPage() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Verify your account" subtitle="We sent a verification link. (Mock)">
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          This is a UI mock. Click below to finish verification and proceed.
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => {
            setAuth({ email: "dragon7159@gmail.com" });
            navigate("/onboarding", { replace: true });
          }}
        >
          Complete verification
        </button>
        <div className="text-center">
          <Link className="text-sm text-emerald-700 hover:underline" to="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function ForgotPage() {
  const [email, setEmail] = useState("dragon7159@gmail.com");
  const [sent, setSent] = useState(false);

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a recovery link. (Mock)">
      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-slate-600">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => setSent(true)}
        >
          Send reset link
        </button>
        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Recovery email sent. (Mock)</div>
        ) : null}
        <div className="text-center">
          <Link className="text-sm text-emerald-700 hover:underline" to="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [biz, setBiz] = useState("Mejai Demo");
  const [number, setNumber] = useState("+82-10-1234-5678");
  const [policy, setPolicy] = useState("환불 정책 v3");

  return (
    <AuthShell title="Onboarding" subtitle="사업체 생성/번호 연결/정책 업로드 (Mock)">
      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-slate-600">Business name</div>
          <input
            value={biz}
            onChange={(e) => setBiz(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">Phone number</div>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">Policy upload</div>
          <input
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => navigate("/app", { replace: true })}
        >
          Finish onboarding
        </button>
      </div>
    </AuthShell>
  );
}

/** ------------------------------
 * Router
 * ------------------------------ */

function RootRedirect() {
  const authed = !!getAuth();
  return <Navigate to={authed ? "/app" : "/login"} replace />;
}

export default function MejaiHelpApp() {
  useEffect(() => {
    runSelfTestsOnce();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />

        <Route path="/call/:token" element={<CallTokenPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/calls"
          element={
            <RequireAuth>
              <AppShell>
                <CallsListPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/calls/:sessionId"
          element={
            <RequireAuth>
              <AppShell>
                <CallsDetailPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/analytics"
          element={
            <RequireAuth>
              <AppShell>
                <AnalyticsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/agents"
          element={
            <RequireAuth>
              <AppShell>
                <AgentsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/eval"
          element={
            <RequireAuth>
              <AppShell>
                <EvalPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/kb"
          element={
            <RequireAuth>
              <AppShell>
                <KBPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/rules"
          element={
            <RequireAuth>
              <AppShell>
                <RulesPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/review"
          element={
            <RequireAuth>
              <AppShell>
                <ReviewPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/team"
          element={
            <RequireAuth>
              <AppShell>
                <TeamPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/settings"
          element={
            <RequireAuth>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/audit"
          element={
            <RequireAuth>
              <AppShell>
                <AuditPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/billing"
          element={
            <RequireAuth>
              <AppShell>
                <BillingPage />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
