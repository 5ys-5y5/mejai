(function () {
  if (window.__mejaiWidgetLoaded) return;
  window.__mejaiWidgetLoaded = true;

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var cfg = window.mejaiWidget || {};
  var themeConfig = {};
  var brandName = cfg.brandName || "Mejai";
  var publicKey = (script && script.dataset && script.dataset.key) || cfg.key;
  if (!publicKey) return;

  var baseUrl;
  try {
    baseUrl = new URL(script.src).origin;
  } catch (e) {
    baseUrl = "https://mejai.help";
  }

  var visitorStorageKey = "mejai_widget_visitor_id";
  var visitorId = "";
  try {
    visitorId = localStorage.getItem(visitorStorageKey) || "";
    if (!visitorId) {
      visitorId = "mw_vis_" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(visitorStorageKey, visitorId);
    }
  } catch (e) {
    visitorId = "mw_vis_" + Math.random().toString(36).slice(2, 12);
  }

  var sessionStorageKey = "mejai_widget_session_" + publicKey + "_" + visitorId;
  var sessionId = "";
  try {
    sessionId = localStorage.getItem(sessionStorageKey) || "";
  } catch (e) {
    sessionId = "";
  }

  var position = cfg.position || "bottom-right";
  var bottom = "24px";
  var right = "24px";
  var left = "24px";
  var container = document.createElement("div");
  container.id = "mejai-widget-container";
  container.style.position = "fixed";
  container.style.zIndex = "2147483647";
  container.style.bottom = bottom;
  if (position.includes("left")) {
    container.style.left = left;
  } else {
    container.style.right = right;
  }

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", brandName + " Chatbot");
  button.style.width = "56px";
  button.style.height = "56px";
  button.style.borderRadius = "999px";
  button.style.border = "none";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.2)";
  button.style.background = cfg.primaryColor || "#0f172a";
  button.style.color = "#fff";
  button.style.fontSize = "22px";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.overflow = "hidden";

  var buttonIcon = document.createElement("img");
  buttonIcon.alt = brandName + " Icon";
  buttonIcon.style.width = "56px";
  buttonIcon.style.height = "56px";
  buttonIcon.style.objectFit = "cover";
  buttonIcon.style.borderRadius = "999px";
  buttonIcon.style.display = "block";
  buttonIcon.style.pointerEvents = "none";

  var buttonLabel = document.createElement("span");
  buttonLabel.textContent = cfg.launcherLabel || "💬";
  buttonLabel.style.display = "none";
  buttonLabel.style.fontSize = "20px";
  buttonLabel.style.pointerEvents = "none";

  buttonIcon.onerror = function () {
    buttonIcon.style.display = "none";
    buttonLabel.style.display = "block";
  };

  button.appendChild(buttonIcon);
  button.appendChild(buttonLabel);

  function readThemeValue(theme, keys) {
    if (!theme || typeof theme !== "object") return "";
    for (var i = 0; i < keys.length; i++) {
      var value = theme[keys[i]];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  function normalizeIconUrl(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.indexOf("data:") === 0 || raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("blob:") === 0) {
      return raw;
    }
    if (raw.indexOf("/") === 0) {
      return baseUrl + raw;
    }
    return raw;
  }

  function resolveLauncherIcon() {
    var raw =
      readThemeValue(cfg, ["launcherIconUrl", "launcherIcon", "launcher_icon_url", "icon", "icon_url"]) ||
      readThemeValue(themeConfig, ["launcher_icon_url", "launcherIconUrl", "icon_url", "iconUrl", "icon"]);
    return normalizeIconUrl(raw) || baseUrl + "/brand/logo.png";
  }

  function resolveLauncherColor() {
    return (
      readThemeValue(cfg, ["primaryColor", "primary_color", "launcher_bg", "launcherBg"]) ||
      readThemeValue(themeConfig, ["launcher_bg", "launcherBg", "primary_color", "primaryColor"])
    );
  }

  function applyLauncherTheme() {
    var iconUrl = resolveLauncherIcon();
    if (iconUrl) {
      buttonIcon.src = iconUrl;
      buttonIcon.style.display = "block";
      buttonLabel.style.display = "none";
    }
    var color = resolveLauncherColor();
    if (color) {
      button.style.background = color;
    }
  }

  function updateBrandName(nextName) {
    if (nextName && typeof nextName === "string") {
      brandName = nextName;
      button.setAttribute("aria-label", brandName + " Chatbot");
      buttonIcon.alt = brandName + " Icon";
    }
  }

  function storeSession(nextSessionId) {
    if (!nextSessionId) return;
    sessionId = String(nextSessionId || "").trim();
    if (!sessionId) return;
    try {
      localStorage.setItem(sessionStorageKey, sessionId);
    } catch (e) {
      // ignore
    }
  }

  applyLauncherTheme();

  var iframe = document.createElement("iframe");
  iframe.title = "Mejai Widget";
  iframe.allow = "clipboard-write";
  iframe.style.position = "absolute";
  iframe.style.bottom = "72px";
  if (position.includes("left")) {
    iframe.style.left = "0";
  } else {
    iframe.style.right = "0";
  }
  iframe.style.width = "360px";
  iframe.style.height = "560px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "16px";
  iframe.style.boxShadow = "0 20px 40px rgba(15, 23, 42, 0.2)";
  iframe.style.background = "#fff";
  iframe.style.display = "none";

  var iframeSrc = baseUrl + "/embed/" + encodeURIComponent(publicKey) + "?vid=" + encodeURIComponent(visitorId);
  if (sessionId) {
    iframeSrc += "&sid=" + encodeURIComponent(sessionId);
  }
  iframe.src = iframeSrc;

  var isOpen = false;
  function notify(eventType) {
    try {
      iframe.contentWindow.postMessage({ type: "mejai_widget_event", event: eventType }, "*");
    } catch (e) {
      // ignore
    }
  }

  function toggle() {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? "block" : "none";
    notify(isOpen ? "open" : "close");
  }

  button.addEventListener("click", toggle);

  iframe.addEventListener("load", function () {
    try {
      iframe.contentWindow.postMessage(
        {
          type: "mejai_widget_init",
          user: cfg.user || null,
          origin: window.location.origin,
          page_url: window.location.href,
          referrer: document.referrer || "",
          visitor_id: visitorId,
          session_id: sessionId || "",
        },
        "*"
      );
    } catch (e) {
      // ignore
    }
    notify("open");
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== baseUrl) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data || {};
    if (data.type === "mejai_widget_session" && data.session_id) {
      storeSession(data.session_id);
    }
    if (data.type === "mejai_widget_theme" && data.theme) {
      themeConfig = data.theme || {};
      updateBrandName(data.name || "");
      applyLauncherTheme();
    }
  });

  function fetchRemoteConfig() {
    try {
      var url = baseUrl + "/api/widget/config?key=" + encodeURIComponent(publicKey);
      fetch(url)
        .then(function (res) {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.widget) return;
          themeConfig = data.widget.theme || {};
          updateBrandName(data.widget.name || "");
          applyLauncherTheme();
        })
        .catch(function () {
          // ignore
        });
    } catch (e) {
      // ignore
    }
  }

  fetchRemoteConfig();

  function mount() {
    container.appendChild(button);
    container.appendChild(iframe);
    document.body.appendChild(container);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
