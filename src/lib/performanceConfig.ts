export type PerformanceConfig = {
  sidebar_poll_review_ms: number;
  sidebar_poll_default_ms: number;
  sidebar_review_limit: number;
  sidebar_refresh_on_auth_change: boolean;
  sidebar_auth_event_mode: "all" | "sign_in_out" | "none";
  sidebar_auth_cooldown_ms: number;
  help_panel_poll_review_ms: number;
  help_panel_poll_default_ms: number;
  help_panel_review_limit: number;
  help_panel_refresh_on_focus: boolean;
  help_panel_focus_cooldown_ms: number;
  help_panel_refresh_on_auth_change: boolean;
  help_panel_auth_event_mode: "all" | "sign_in_out" | "none";
  help_panel_auth_cooldown_ms: number;
  dashboard_poll_ms: number;
  dashboard_sessions_limit: number;
  dashboard_review_limit: number;
  dashboard_refresh_on_auth_change: boolean;
  dashboard_auth_event_mode: "all" | "sign_in_out" | "none";
  dashboard_auth_cooldown_ms: number;
  multi_tab_leader_enabled: boolean;
  multi_tab_leader_lock_ttl_ms: number;
};

export const PERFORMANCE_CONFIG_STORAGE_KEY = "mejai_performance_config_v1";
export const PERFORMANCE_CONFIG_UPDATED_EVENT = "mejai:performance-config-updated";

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  sidebar_poll_review_ms: 30_000,
  sidebar_poll_default_ms: 300_000,
  sidebar_review_limit: 1,
  sidebar_refresh_on_auth_change: true,
  sidebar_auth_event_mode: "sign_in_out",
  sidebar_auth_cooldown_ms: 15_000,
  help_panel_poll_review_ms: 30_000,
  help_panel_poll_default_ms: 300_000,
  help_panel_review_limit: 50,
  help_panel_refresh_on_focus: true,
  help_panel_focus_cooldown_ms: 15_000,
  help_panel_refresh_on_auth_change: true,
  help_panel_auth_event_mode: "sign_in_out",
  help_panel_auth_cooldown_ms: 15_000,
  dashboard_poll_ms: 600_000,
  dashboard_sessions_limit: 500,
  dashboard_review_limit: 500,
  dashboard_refresh_on_auth_change: true,
  dashboard_auth_event_mode: "sign_in_out",
  dashboard_auth_cooldown_ms: 15_000,
  multi_tab_leader_enabled: true,
  multi_tab_leader_lock_ttl_ms: 15_000,
};

export const PERFORMANCE_CONFIG_ITEMS: Array<{
  key: keyof PerformanceConfig;
  label: string;
  purpose: string;
  unit: "ms" | "count" | "boolean" | "enum";
  options?: Array<{ value: string; label: string }>;
}> = [
  {
    key: "sidebar_poll_review_ms",
    label: "사이드바(리뷰 페이지) 폴링 주기",
    purpose: "리뷰 페이지 진입 시 사이드바 배지 갱신 주기",
    unit: "ms",
  },
  {
    key: "sidebar_poll_default_ms",
    label: "사이드바(기본) 폴링 주기",
    purpose: "리뷰 페이지 외 사이드바 배지 갱신 주기",
    unit: "ms",
  },
  {
    key: "sidebar_review_limit",
    label: "사이드바 리뷰 조회 건수",
    purpose: "사이드바 배지 계산용 review-queue limit",
    unit: "count",
  },
  {
    key: "sidebar_refresh_on_auth_change",
    label: "사이드바 인증 이벤트 즉시 갱신",
    purpose: "auth 상태 변경 시 추가 즉시 호출 여부",
    unit: "boolean",
  },
  {
    key: "sidebar_auth_event_mode",
    label: "사이드바 auth 이벤트 반영 범위",
    purpose: "none/all/sign_in_out 중 선택",
    unit: "enum",
    options: [
      { value: "none", label: "none (미반영)" },
      { value: "sign_in_out", label: "sign_in_out" },
      { value: "all", label: "all" },
    ],
  },
  {
    key: "sidebar_auth_cooldown_ms",
    label: "사이드바 auth 쿨다운",
    purpose: "auth 이벤트 연속 발생 시 최소 간격",
    unit: "ms",
  },
  {
    key: "help_panel_poll_review_ms",
    label: "도움패널(리뷰 페이지) 폴링 주기",
    purpose: "리뷰 페이지 진입 시 도움패널 갱신 주기",
    unit: "ms",
  },
  {
    key: "help_panel_poll_default_ms",
    label: "도움패널(기본) 폴링 주기",
    purpose: "리뷰 페이지 외 도움패널 갱신 주기",
    unit: "ms",
  },
  {
    key: "help_panel_review_limit",
    label: "도움패널 리뷰 조회 건수",
    purpose: "도움패널 review-queue limit",
    unit: "count",
  },
  {
    key: "help_panel_refresh_on_focus",
    label: "도움패널 포커스 즉시 갱신",
    purpose: "window focus 시 추가 즉시 호출 여부",
    unit: "boolean",
  },
  {
    key: "help_panel_focus_cooldown_ms",
    label: "도움패널 포커스 쿨다운",
    purpose: "focus 이벤트 연속 발생 시 최소 간격",
    unit: "ms",
  },
  {
    key: "help_panel_refresh_on_auth_change",
    label: "도움패널 인증 이벤트 즉시 갱신",
    purpose: "auth 상태 변경 시 추가 즉시 호출 여부",
    unit: "boolean",
  },
  {
    key: "help_panel_auth_event_mode",
    label: "도움패널 auth 이벤트 반영 범위",
    purpose: "none/all/sign_in_out 중 선택",
    unit: "enum",
    options: [
      { value: "none", label: "none (미반영)" },
      { value: "sign_in_out", label: "sign_in_out" },
      { value: "all", label: "all" },
    ],
  },
  {
    key: "help_panel_auth_cooldown_ms",
    label: "도움패널 auth 쿨다운",
    purpose: "auth 이벤트 연속 발생 시 최소 간격",
    unit: "ms",
  },
  {
    key: "dashboard_poll_ms",
    label: "대시보드 폴링 주기",
    purpose: "대시보드 loadData 주기",
    unit: "ms",
  },
  {
    key: "dashboard_sessions_limit",
    label: "대시보드 세션 조회 건수",
    purpose: "대시보드 sessions API limit",
    unit: "count",
  },
  {
    key: "dashboard_review_limit",
    label: "대시보드 리뷰 조회 건수",
    purpose: "대시보드 review-queue API limit",
    unit: "count",
  },
  {
    key: "dashboard_refresh_on_auth_change",
    label: "대시보드 인증 이벤트 즉시 갱신",
    purpose: "auth 상태 변경 시 대시보드 재호출 여부",
    unit: "boolean",
  },
  {
    key: "dashboard_auth_event_mode",
    label: "대시보드 auth 이벤트 반영 범위",
    purpose: "none/all/sign_in_out 중 선택",
    unit: "enum",
    options: [
      { value: "none", label: "none (미반영)" },
      { value: "sign_in_out", label: "sign_in_out" },
      { value: "all", label: "all" },
    ],
  },
  {
    key: "dashboard_auth_cooldown_ms",
    label: "대시보드 auth 쿨다운",
    purpose: "auth 이벤트 연속 발생 시 최소 간격",
    unit: "ms",
  },
  {
    key: "multi_tab_leader_enabled",
    label: "멀티탭 리더 선출 사용",
    purpose: "탭 1개만 폴링하고 나머지는 수신",
    unit: "boolean",
  },
  {
    key: "multi_tab_leader_lock_ttl_ms",
    label: "멀티탭 리더 락 TTL",
    purpose: "리더 생존 판단/재선출 기준 시간",
    unit: "ms",
  },
];

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return fallback;
}

function toAuthEventMode(value: unknown, fallback: "all" | "sign_in_out" | "none") {
  if (value === "all" || value === "sign_in_out" || value === "none") return value;
  return fallback;
}

export function sanitizePerformanceConfig(input: unknown): PerformanceConfig {
  const raw = (input || {}) as Record<string, unknown>;
  return {
    sidebar_poll_review_ms: clampNumber(
      raw.sidebar_poll_review_ms,
      1_000,
      3_600_000,
      DEFAULT_PERFORMANCE_CONFIG.sidebar_poll_review_ms
    ),
    sidebar_poll_default_ms: clampNumber(
      raw.sidebar_poll_default_ms,
      1_000,
      3_600_000,
      DEFAULT_PERFORMANCE_CONFIG.sidebar_poll_default_ms
    ),
    sidebar_review_limit: clampNumber(raw.sidebar_review_limit, 1, 200, DEFAULT_PERFORMANCE_CONFIG.sidebar_review_limit),
    sidebar_refresh_on_auth_change: toBoolean(
      raw.sidebar_refresh_on_auth_change,
      DEFAULT_PERFORMANCE_CONFIG.sidebar_refresh_on_auth_change
    ),
    sidebar_auth_event_mode: toAuthEventMode(
      raw.sidebar_auth_event_mode,
      DEFAULT_PERFORMANCE_CONFIG.sidebar_auth_event_mode
    ),
    sidebar_auth_cooldown_ms: clampNumber(
      raw.sidebar_auth_cooldown_ms,
      0,
      600_000,
      DEFAULT_PERFORMANCE_CONFIG.sidebar_auth_cooldown_ms
    ),
    help_panel_poll_review_ms: clampNumber(
      raw.help_panel_poll_review_ms,
      1_000,
      3_600_000,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_poll_review_ms
    ),
    help_panel_poll_default_ms: clampNumber(
      raw.help_panel_poll_default_ms,
      1_000,
      3_600_000,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_poll_default_ms
    ),
    help_panel_review_limit: clampNumber(
      raw.help_panel_review_limit,
      1,
      500,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_review_limit
    ),
    help_panel_refresh_on_focus: toBoolean(
      raw.help_panel_refresh_on_focus,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_refresh_on_focus
    ),
    help_panel_focus_cooldown_ms: clampNumber(
      raw.help_panel_focus_cooldown_ms,
      0,
      600_000,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_focus_cooldown_ms
    ),
    help_panel_refresh_on_auth_change: toBoolean(
      raw.help_panel_refresh_on_auth_change,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_refresh_on_auth_change
    ),
    help_panel_auth_event_mode: toAuthEventMode(
      raw.help_panel_auth_event_mode,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_auth_event_mode
    ),
    help_panel_auth_cooldown_ms: clampNumber(
      raw.help_panel_auth_cooldown_ms,
      0,
      600_000,
      DEFAULT_PERFORMANCE_CONFIG.help_panel_auth_cooldown_ms
    ),
    dashboard_poll_ms: clampNumber(raw.dashboard_poll_ms, 1_000, 3_600_000, DEFAULT_PERFORMANCE_CONFIG.dashboard_poll_ms),
    dashboard_sessions_limit: clampNumber(
      raw.dashboard_sessions_limit,
      1,
      1_000,
      DEFAULT_PERFORMANCE_CONFIG.dashboard_sessions_limit
    ),
    dashboard_review_limit: clampNumber(
      raw.dashboard_review_limit,
      1,
      1_000,
      DEFAULT_PERFORMANCE_CONFIG.dashboard_review_limit
    ),
    dashboard_refresh_on_auth_change: toBoolean(
      raw.dashboard_refresh_on_auth_change,
      DEFAULT_PERFORMANCE_CONFIG.dashboard_refresh_on_auth_change
    ),
    dashboard_auth_event_mode: toAuthEventMode(
      raw.dashboard_auth_event_mode,
      DEFAULT_PERFORMANCE_CONFIG.dashboard_auth_event_mode
    ),
    dashboard_auth_cooldown_ms: clampNumber(
      raw.dashboard_auth_cooldown_ms,
      0,
      600_000,
      DEFAULT_PERFORMANCE_CONFIG.dashboard_auth_cooldown_ms
    ),
    multi_tab_leader_enabled: toBoolean(
      raw.multi_tab_leader_enabled,
      DEFAULT_PERFORMANCE_CONFIG.multi_tab_leader_enabled
    ),
    multi_tab_leader_lock_ttl_ms: clampNumber(
      raw.multi_tab_leader_lock_ttl_ms,
      3_000,
      120_000,
      DEFAULT_PERFORMANCE_CONFIG.multi_tab_leader_lock_ttl_ms
    ),
  };
}

export function shouldRefreshOnAuthEvent(
  mode: PerformanceConfig["sidebar_auth_event_mode"],
  event: string
) {
  if (mode === "none") return false;
  if (mode === "all") return true;
  return event === "SIGNED_IN" || event === "SIGNED_OUT";
}

export function readPerformanceConfigFromStorage() {
  if (typeof window === "undefined") return DEFAULT_PERFORMANCE_CONFIG;
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_PERFORMANCE_CONFIG;
    return sanitizePerformanceConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_PERFORMANCE_CONFIG;
  }
}

export function writePerformanceConfigToStorage(config: PerformanceConfig) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizePerformanceConfig(config);
  try {
    window.localStorage.setItem(PERFORMANCE_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(PERFORMANCE_CONFIG_UPDATED_EVENT, { detail: sanitized }));
  } catch {
    // ignore
  }
}
