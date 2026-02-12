(function () {
  if (window.__mejaiWidgetLoaded) return;
  window.__mejaiWidgetLoaded = true;

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var cfg = window.mejaiWidget || {};
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
  button.setAttribute("aria-label", "Mejai Chatbot");
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
  button.innerHTML = cfg.launcherLabel || "💬";

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
        },
        "*"
      );
    } catch (e) {
      // ignore
    }
    notify("open");
  });

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
