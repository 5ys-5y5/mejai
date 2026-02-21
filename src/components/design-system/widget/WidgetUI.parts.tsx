"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { createRoot } from "react-dom/client";
import { List, MessageCircle, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ConversationModelChatColumnLego,
  ConversationModelSetupColumnLego,
  ConversationThread,
  type ConversationModelChatColumnLegoProps,
  type ConversationModelSetupColumnLegoProps,
} from "@/components/design-system/conversation/ConversationUI.parts";
import { renderBotContent } from "@/lib/conversation/messageRenderUtils";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/conversation/client/laboratoryPageState";

const globalScope = typeof globalThis !== "undefined" ? (globalThis as Record<string, any>) : undefined;
if (globalScope && typeof globalScope.process === "undefined") {
  globalScope.process = { env: { NODE_ENV: "production" } };
}

// ------------------------------------------------------------
// Unified widget UI assembly file.
// Edit this file to affect widget UI service-wide.
// ------------------------------------------------------------
export type WidgetLauncherPosition = "bottom-right" | "bottom-left";

export type WidgetLauncherContainerProps = {
  children?: ReactNode;
  position?: WidgetLauncherPosition;
  layout?: "fixed" | "absolute";
  containerId?: string;
  mountTo?: HTMLElement | null;
  bottom?: string;
  left?: string;
  right?: string;
  zIndex?: number;
  stack?: boolean;
  gap?: string;
  className?: string;
  style?: CSSProperties;
};

export function WidgetLauncherContainer({
  children,
  position = "bottom-right",
  layout = "fixed",
  containerId = "mejai-widget-container",
  mountTo,
  bottom = "24px",
  left = "24px",
  right = "24px",
  zIndex = 2147483647,
  stack = false,
  gap = "12px",
  className,
  style,
}: WidgetLauncherContainerProps) {
  const resolvedStyle = useMemo<CSSProperties>(() => {
    return {
      position: layout,
      zIndex,
      bottom,
      ...(position === "bottom-left" ? { left } : { right }),
      ...(stack
        ? {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap,
        }
        : {}),
      ...style,
    };
  }, [layout, zIndex, bottom, position, left, right, stack, gap, style]);

  useEffect(() => {
    if (!mountTo) return;
    if (containerId) {
      mountTo.id = containerId;
    }
    mountTo.setAttribute("panel-lego", "WidgetLauncherContainer");
    if (className) {
      mountTo.className = className;
    }
    Object.entries(resolvedStyle).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mountTo.style as any)[key] = value;
    });
  }, [mountTo, containerId, className, resolvedStyle]);

  if (mountTo) {
    return <>{children}</>;
  }

  return (
    <div id={containerId} className={className} style={resolvedStyle} panel-lego="WidgetLauncherContainer">
      {children}
    </div>
  );
}

export type WidgetLauncherIconProps = {
  src: string;
  alt: string;
  size?: number;
  hidden?: boolean;
  onError?: () => void;
  className?: string;
  style?: CSSProperties;
};

export function WidgetLauncherIcon({
  src,
  alt,
  size = 56,
  hidden = false,
  onError,
  className,
  style,
}: WidgetLauncherIconProps) {
  const sizePx = `${size}px`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      parts-lego="WidgetLauncherIcon"
      onError={onError}
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        objectFit: "cover",
        borderRadius: "16px",
        display: hidden ? "none" : "block",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

export type WidgetLauncherLabelProps = {
  label: string;
  size?: number;
  hidden?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function WidgetLauncherLabel({
  label,
  size = 20,
  hidden = false,
  className,
  style,
}: WidgetLauncherLabelProps) {
  return (
    <span
      className={className}
      parts-lego="WidgetLauncherLabel"
      style={{
        display: hidden ? "none" : "block",
        fontSize: `${size}px`,
        pointerEvents: "none",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

export type WidgetLauncherButtonProps = {
  brandName: string;
  iconUrl?: string | null;
  label?: string;
  primaryColor?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
};

export function WidgetLauncherButton({
  brandName,
  iconUrl,
  label = "💬",
  primaryColor = "#0f172a",
  size = 56,
  onClick,
  className,
  style,
}: WidgetLauncherButtonProps) {
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    setIconFailed(false);
  }, [iconUrl]);

  const resolvedIconUrl = iconUrl || "/brand/logo.png";
  const showIcon = Boolean(resolvedIconUrl) && !iconFailed;
  const sizePx = `${size}px`;
  const labelSize = Math.max(12, Math.round(size * 0.36));
  const fontSize = Math.max(12, Math.round(size * 0.4));

  return (
    <button
      type="button"
      aria-label={`${brandName} Chatbot`}
      onClick={onClick}
      parts-lego="WidgetLauncherButton"
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: "16px",
        border: "none",
        cursor: "pointer",
        boxShadow: "none",
        background: "transparent",
        color: "#fff",
        fontSize: `${fontSize}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
    >
      <WidgetLauncherIcon
        src={resolvedIconUrl}
        alt={`${brandName} Icon`}
        size={size}
        hidden={!showIcon}
        onError={() => setIconFailed(true)}
      />
      <WidgetLauncherLabel label={label} size={labelSize} hidden={showIcon} />
    </button>
  );
}

export type WidgetLauncherIframeProps = {
  position?: WidgetLauncherPosition;
  layout?: "fixed" | "absolute";
  bottomOffset?: string;
  sideOffset?: string;
  width?: string;
  height?: string;
  isOpen?: boolean;
  title?: string;
  src?: string;
  allow?: string;
  onLoad?: () => void;
  iframeRef?: Ref<HTMLIFrameElement>;
  className?: string;
  style?: CSSProperties;
  borderRadius?: string;
  boxShadow?: string;
  background?: string;
  asPlaceholder?: boolean;
  placeholderLabel?: string;
};

export function WidgetLauncherIframe({
  position = "bottom-right",
  layout = "absolute",
  bottomOffset = "72px",
  sideOffset = "0",
  width = "360px",
  height = "560px",
  isOpen = false,
  title = "Mejai Widget",
  src,
  allow = "clipboard-write",
  onLoad,
  iframeRef,
  className,
  style,
  borderRadius = "16px",
  boxShadow = "0 20px 40px rgba(15, 23, 42, 0.2)",
  background = "#fff",
  asPlaceholder = false,
  placeholderLabel = "iframe (display:none 상태로 로드됨)",
}: WidgetLauncherIframeProps) {
  if (asPlaceholder) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500",
          className
        )}
        panel-lego="WidgetLauncherIframe.Placeholder"
        style={style}
      >
        {placeholderLabel}
      </div>
    );
  }

  return (
    <iframe
      title={title}
      allow={allow}
      src={src}
      onLoad={onLoad}
      ref={iframeRef}
      className={className}
      panel-lego="WidgetLauncherIframe"
      style={{
        position: layout,
        bottom: bottomOffset,
        ...(position === "bottom-left" ? { left: sideOffset } : { right: sideOffset }),
        width,
        height,
        border: "none",
        borderRadius,
        boxShadow,
        background,
        display: isOpen ? "block" : "none",
        ...style,
      }}
    />
  );
}

type WidgetLauncherWindow = Window & {
  __mejaiWidgetLoaded?: boolean;
  mejaiWidget?: Record<string, any>;
};

type WidgetLauncherRuntimeConfig = {
  cfg: Record<string, any>;
  baseUrl: string;
  publicKey: string;
  visitorId: string;
  sessionId: string;
  sessionStorageKey: string;
  position: WidgetLauncherPosition;
  brandName: string;
  launcherLabel: string;
  mountNode: HTMLElement;
};

function readThemeValue(theme: Record<string, any> | null, keys: string[]) {
  if (!theme || typeof theme !== "object") return "";
  for (const key of keys) {
    const value = theme[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeIconUrl(value: string, baseUrl: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:")) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `${baseUrl}${raw}`;
  }
  return raw;
}

function resolveLauncherIcon(cfg: Record<string, any>, themeConfig: Record<string, any>, baseUrl: string) {
  const raw =
    readThemeValue(cfg, ["launcherIconUrl", "launcherIcon", "launcher_icon_url", "icon", "icon_url"]) ||
    readThemeValue(themeConfig, ["launcher_icon_url", "launcherIconUrl", "icon_url", "iconUrl", "icon"]);
  return normalizeIconUrl(raw, baseUrl) || `${baseUrl}/brand/logo.png`;
}

function resolveLauncherColor(cfg: Record<string, any>, themeConfig: Record<string, any>) {
  return (
    readThemeValue(cfg, ["primaryColor", "primary_color", "launcher_bg", "launcherBg"]) ||
    readThemeValue(themeConfig, ["launcher_bg", "launcherBg", "primary_color", "primaryColor"])
  );
}

function buildIframeSrc(baseUrl: string, publicKey: string, visitorId: string, sessionId: string) {
  let src = `${baseUrl}/embed/${encodeURIComponent(publicKey)}?vid=${encodeURIComponent(visitorId)}`;
  if (sessionId) {
    src += `&sid=${encodeURIComponent(sessionId)}`;
  }
  return src;
}

function WidgetLauncherRuntime({
  cfg,
  baseUrl,
  publicKey,
  visitorId,
  sessionId,
  sessionStorageKey,
  position,
  brandName,
  launcherLabel,
  mountNode,
}: WidgetLauncherRuntimeConfig) {
  const cfgRef = useRef(cfg);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sessionIdRef = useRef(sessionId);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [themeConfig, setThemeConfig] = useState<Record<string, any>>({});
  const [resolvedName, setResolvedName] = useState(brandName);

  const resolvedIconUrl = useMemo(
    () => resolveLauncherIcon(cfgRef.current, themeConfig, baseUrl),
    [themeConfig, baseUrl]
  );
  const resolvedColor = useMemo(() => {
    return resolveLauncherColor(cfgRef.current, themeConfig) || "#0f172a";
  }, [themeConfig]);
  const resolvedLabel = useMemo(() => {
    const cfgLabel = cfgRef.current.launcherLabel;
    if (typeof cfgLabel === "string" && cfgLabel.trim()) return cfgLabel.trim();
    return launcherLabel || "💬";
  }, [launcherLabel]);

  const iframeSrc = useMemo(
    () => buildIframeSrc(baseUrl, publicKey, visitorId, sessionIdRef.current),
    [baseUrl, publicKey, visitorId]
  );

  const notify = (eventType: "open" | "close") => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "mejai_widget_event", event: eventType },
        "*"
      );
    } catch {
      // ignore
    }
  };

  const storeSession = (nextSessionId: string) => {
    if (!nextSessionId) return;
    const trimmed = String(nextSessionId || "").trim();
    if (!trimmed) return;
    sessionIdRef.current = trimmed;
    try {
      localStorage.setItem(sessionStorageKey, trimmed);
    } catch {
      // ignore
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      notify(next ? "open" : "close");
      return next;
    });
  };

  const handleIframeLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "mejai_widget_init",
          user: cfgRef.current.user || null,
          origin: window.location.origin,
          page_url: window.location.href,
          referrer: document.referrer || "",
          visitor_id: visitorId,
          session_id: sessionIdRef.current || "",
        },
        "*"
      );
    } catch {
      // ignore
    }
    notify("open");
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== baseUrl) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data || {};
      if (data.type === "mejai_widget_session" && data.session_id) {
        storeSession(data.session_id);
      }
      if (data.type === "mejai_widget_theme" && data.theme) {
        setThemeConfig(data.theme || {});
        if (typeof data.name === "string" && data.name.trim()) {
          setResolvedName(data.name.trim());
        }
      }
      if (data.type === "mejai_widget_request_close") {
        setIsOpen(false);
        notify("close");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [baseUrl]);

  useEffect(() => {
    try {
      const url = `${baseUrl}/api/widget/config?key=${encodeURIComponent(publicKey)}`;
      fetch(url)
        .then((res) => {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (!data || !data.widget) return;
          setThemeConfig(data.widget.theme || {});
          if (typeof data.widget.name === "string" && data.widget.name.trim()) {
            setResolvedName(data.widget.name.trim());
          }
        })
        .catch(() => {
          // ignore
        });
    } catch {
      // ignore
    }
  }, [baseUrl, publicKey]);

  return (
    <WidgetLauncherContainer mountTo={mountNode} position={position} stack>
      <WidgetLauncherButton
        brandName={resolvedName}
        iconUrl={resolvedIconUrl}
        label={resolvedLabel}
        primaryColor={resolvedColor}
        onClick={handleToggle}
      />
      <WidgetLauncherIframe
        position={position}
        layout={isMobile ? "fixed" : "absolute"}
        bottomOffset={isMobile ? "0" : undefined}
        sideOffset={isMobile ? "0" : undefined}
        width={isMobile ? "100vw" : undefined}
        height={isMobile ? "100vh" : undefined}
        borderRadius={isMobile ? "0" : undefined}
        boxShadow={isMobile ? "none" : undefined}
        style={isMobile ? { top: "0", left: "0", right: "0" } : undefined}
        isOpen={isOpen}
        src={iframeSrc}
        iframeRef={iframeRef}
        onLoad={handleIframeLoad}
      />
    </WidgetLauncherContainer>
  );
}

export function mountWidgetLauncher() {
  if (typeof window === "undefined") return;
  const scopedWindow = window as WidgetLauncherWindow;
  if (scopedWindow.__mejaiWidgetLoaded) return;
  scopedWindow.__mejaiWidgetLoaded = true;

  const script =
    document.currentScript ||
    (() => {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  const rawCfg = scopedWindow.mejaiWidget;
  const cfg = rawCfg && typeof rawCfg === "object" ? (rawCfg as Record<string, any>) : {};
  const publicKey = (script && (script as HTMLScriptElement).dataset && (script as HTMLScriptElement).dataset.key) || cfg.key;
  if (!publicKey) return;

  let baseUrl = "";
  try {
    baseUrl = new URL((script as HTMLScriptElement)?.src || "").origin;
  } catch {
    baseUrl = "https://mejai.help";
  }

  const visitorStorageKey = "mejai_widget_visitor_id";
  let visitorId = "";
  try {
    visitorId = localStorage.getItem(visitorStorageKey) || "";
    if (!visitorId) {
      visitorId = `mw_vis_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(visitorStorageKey, visitorId);
    }
  } catch {
    visitorId = `mw_vis_${Math.random().toString(36).slice(2, 12)}`;
  }

  const sessionStorageKey = `mejai_widget_session_${publicKey}_${visitorId}`;
  let sessionId = "";
  try {
    sessionId = localStorage.getItem(sessionStorageKey) || "";
  } catch {
    sessionId = "";
  }

  const positionValue = String(cfg.position || "bottom-right");
  const position: WidgetLauncherPosition = positionValue.includes("left") ? "bottom-left" : "bottom-right";

  const brandName =
    typeof cfg.brandName === "string" && cfg.brandName.trim().length > 0 ? cfg.brandName.trim() : "Mejai";
  const launcherLabel =
    typeof cfg.launcherLabel === "string" && cfg.launcherLabel.trim().length > 0
      ? cfg.launcherLabel.trim()
      : "💬";

  const mountNode = document.createElement("div");
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(
    <WidgetLauncherRuntime
      cfg={cfg}
      baseUrl={baseUrl}
      publicKey={String(publicKey)}
      visitorId={visitorId}
      sessionId={sessionId}
      sessionStorageKey={sessionStorageKey}
      position={position}
      brandName={brandName}
      launcherLabel={launcherLabel}
      mountNode={mountNode}
    />
  );
}

export type WidgetHeaderLegoProps = {
  brandName: string;
  status?: string;
  iconUrl?: string | null;
  headerActions?: ReactNode;
  onNewConversation?: () => void;
  showNewConversation?: boolean;
  onClose?: () => void;
  showClose?: boolean;
  closeLabel?: string;
};

export function WidgetHeaderLego({
  brandName,
  status,
  iconUrl,
  headerActions,
  onNewConversation,
  showNewConversation,
  onClose,
  showClose = true,
  closeLabel = "\uB2EB\uAE30",
}: WidgetHeaderLegoProps) {
  const resolvedIcon = iconUrl || "/brand/logo.png";
  const showStatus = Boolean(status && status.trim().length > 0);
  const canStartNew = Boolean(onNewConversation && showNewConversation);
  const canClose = Boolean(onClose && showClose);

  return (
    <header
      className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
      parts-lego="WidgetHeaderLego"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedIcon} alt="" className="block h-full w-full object-cover" />
        </div>
        <div>
          <div className="text-sm font-semibold">{brandName}</div>
          {showStatus ? <div className="text-[11px] text-slate-500">{status}</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {headerActions || null}
        {canStartNew ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewConversation}
            className="h-8 px-3 text-[11px]"
          >
            새 대화
          </Button>
        ) : null}
        {canClose ? (
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

export type WidgetConversationTab = "chat" | "list" | "policy";

export type WidgetTabBarLegoProps = {
  activeTab: WidgetConversationTab;
  onTabChange: (tab: WidgetConversationTab) => void;
  showPolicyTab?: boolean;
};

export function WidgetTabBarLego({
  activeTab,
  onTabChange,
  showPolicyTab = false,
}: WidgetTabBarLegoProps) {
  const tabGridClass = showPolicyTab ? "grid-cols-3" : "grid-cols-2";
  return (
    <div
      className={cn("grid h-[50px] items-center gap-1 border-t border-slate-200 bg-white px-2 py-1", tabGridClass)}
      parts-lego="WidgetTabBarLego"
    >
      <button
        type="button"
        onClick={() => onTabChange("chat")}
        className={cn(
          "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-semibold leading-tight transition-colors",
          activeTab === "chat" ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
        )}
      >
        <MessageCircle className="h-4 w-4" />
        <span>대화</span>
      </button>
      <button
        type="button"
        onClick={() => onTabChange("list")}
        className={cn(
          "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-semibold leading-tight transition-colors",
          activeTab === "list" ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
        )}
      >
        <List className="h-4 w-4" />
        <span>리스트</span>
      </button>
      {showPolicyTab ? (
        <button
          type="button"
          onClick={() => onTabChange("policy")}
          className={cn(
            "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-semibold leading-tight transition-colors",
            activeTab === "policy" ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Shield className="h-4 w-4" />
          <span>정책</span>
        </button>
      ) : null}
    </div>
  );
}

export type WidgetConversationSession = {
  id: string;
  session_code?: string | null;
  started_at?: string | null;
};

export type WidgetHistoryPanelLegoProps = {
  sessions: WidgetConversationSession[];
  sessionsLoading?: boolean;
  sessionsError?: string;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string | null) => void;
  historyMessages: ChatMessage[];
  historyLoading?: boolean;
  title?: string;
};

function formatSessionTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function WidgetHistoryPanelLego({
  sessions,
  sessionsLoading = false,
  sessionsError = "",
  selectedSessionId,
  onSelectSession,
  historyMessages,
  historyLoading = false,
  title = "과거 대화 목록",
}: WidgetHistoryPanelLegoProps) {
  const [showThread, setShowThread] = useState(false);
  useEffect(() => {
    if (!selectedSessionId) {
      setShowThread(false);
    }
  }, [selectedSessionId]);
  const isThreadView = Boolean(showThread && selectedSessionId);
  return (
    <div className="h-full min-h-0 flex flex-col bg-white" parts-lego="WidgetHistoryPanelLego">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-[11px] text-slate-500">
        <span>{title}</span>
        {isThreadView ? (
          <button
            type="button"
            onClick={() => {
              setShowThread(false);
              onSelectSession?.(null);
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            목록
          </button>
        ) : null}
      </div>
      {isThreadView ? (
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50 px-4 py-4">
          {historyLoading ? (
            <div className="text-xs text-slate-500">대화를 불러오는 중...</div>
          ) : historyMessages.length === 0 ? (
            <div className="text-xs text-slate-500">선택된 대화가 없습니다.</div>
          ) : (
            <div className="h-full overflow-auto rounded-xl bg-slate-50 px-2 pb-4 pt-2 scrollbar-hide">
              <ConversationThread
                messages={historyMessages}
                selectedMessageIds={[]}
                selectionEnabled={false}
                onToggleSelection={() => undefined}
                avatarSelectionStyle="both"
                renderContent={(msg) => {
                  if (msg.role === "bot" && msg.richHtml) {
                    return (
                      <div
                        style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }}
                        dangerouslySetInnerHTML={{ __html: msg.richHtml }}
                      />
                    );
                  }
                  if (msg.role === "bot") {
                    return renderBotContent(msg.content);
                  }
                  return msg.content;
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto bg-slate-50 px-2 py-2">
          {sessionsLoading ? (
            <div className="px-2 py-2 text-xs text-slate-500">불러오는 중...</div>
          ) : sessionsError ? (
            <div className="px-2 py-2 text-xs text-rose-500">{sessionsError}</div>
          ) : sessions.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">대화 기록이 없습니다.</div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = session.id === selectedSessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setShowThread(true);
                      onSelectSession?.(session.id);
                    }}
                    className={cn(
                      "w-full rounded-md border px-2 py-1 text-left text-xs",
                      isActive
                        ? "border-slate-900 bg-white text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                    )}
                  >
                    <div className="font-semibold">{session.session_code || session.id.slice(0, 8)}</div>
                    <div className="text-[10px] text-slate-400">{formatSessionTime(session.started_at)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type WidgetConversationLayoutProps = {
  brandName: string;
  status: string;
  iconUrl?: string | null;
  headerActions?: ReactNode;
  onNewConversation?: () => void;
  showNewConversation?: boolean;
  onClose?: () => void;
  showClose?: boolean;
  closeLabel?: string;
  chatLegoProps: ConversationModelChatColumnLegoProps;
  setupLegoProps: ConversationModelSetupColumnLegoProps;
  activeTab: WidgetConversationTab;
  onTabChange: (tab: WidgetConversationTab) => void;
  showPolicyTab?: boolean;
  policyFallback?: ReactNode;
  sessions: WidgetConversationSession[];
  sessionsLoading?: boolean;
  sessionsError?: string;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string | null) => void;
  historyMessages: ChatMessage[];
  historyLoading?: boolean;
  fill?: boolean;
  className?: string;
};

export function WidgetConversationLayout({
  brandName,
  status,
  iconUrl,
  headerActions,
  onNewConversation,
  showNewConversation,
  onClose,
  showClose,
  closeLabel,
  chatLegoProps,
  setupLegoProps,
  activeTab,
  onTabChange,
  showPolicyTab = false,
  policyFallback,
  sessions,
  sessionsLoading = false,
  sessionsError = "",
  selectedSessionId,
  onSelectSession,
  historyMessages,
  historyLoading = false,
  fill = true,
  className,
}: WidgetConversationLayoutProps) {
  const fallbackPanel = policyFallback ? (
    policyFallback
  ) : (
    <div className="flex h-full items-center justify-center bg-white text-sm text-slate-500">
      접근 권한이 없습니다.
    </div>
  );
  const canStartNew = typeof showNewConversation === "boolean" ? showNewConversation : Boolean(onNewConversation);

  return (
    <div
      className={cn(
        fill ? "min-h-screen" : "h-full",
        "w-full bg-slate-50 text-slate-900 flex flex-col",
        className
      )}
      parts-lego="WidgetConversationLayout"
    >
      <WidgetHeaderLego
        brandName={brandName}
        status={status}
        iconUrl={iconUrl}
        headerActions={headerActions}
        onNewConversation={onNewConversation}
        showNewConversation={canStartNew}
        onClose={onClose}
        showClose={showClose}
        closeLabel={closeLabel}
      />
      <div className="flex-1 min-h-0 overflow-hidden" panel-lego="WidgetConversationLayout.Panel">
        {activeTab === "chat" ? <ConversationModelChatColumnLego {...chatLegoProps} /> : null}
        {activeTab === "list" ? (
          <WidgetHistoryPanelLego
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            sessionsError={sessionsError}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            historyMessages={historyMessages}
            historyLoading={historyLoading}
          />
        ) : null}
        {activeTab === "policy" ? (showPolicyTab ? <ConversationModelSetupColumnLego {...setupLegoProps} /> : fallbackPanel) : null}
      </div>
      <WidgetTabBarLego activeTab={activeTab} onTabChange={onTabChange} showPolicyTab={showPolicyTab} />
    </div>
  );
}
