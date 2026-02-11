/* Minimal WebSocket server entrypoint for Railway */
import http from "http";
import WebSocket from "ws";

const PORT = Number(process.env.PORT || 8080);
const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ws-server ok");
});

const wss = new WebSocket.Server({ server });

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

wss.on("connection", (ws, req) => {
  const reqUrl = new URL(req.url || "/", "http://localhost");
  const connectionState = {
    token: reqUrl.searchParams.get("token") || "",
    accessToken: reqUrl.searchParams.get("access_token") || "",
    agentId: reqUrl.searchParams.get("agent_id") || "",
    sessionId: reqUrl.searchParams.get("session_id") || "",
    llm: reqUrl.searchParams.get("llm") || "chatgpt",
    mode: reqUrl.searchParams.get("mode") || "mk2",
  };

  sendJson(ws, { type: "ready", ts: Date.now() });

  ws.on("message", (raw) => {
    const message = safeJsonParse(String(raw));
    if (!message || typeof message !== "object") {
      sendJson(ws, { type: "error", error: "INVALID_JSON" });
      return;
    }

    if (message.type === "ping") {
      sendJson(ws, { type: "pong", ts: Date.now() });
      return;
    }

    if (message.type === "join") {
      if (typeof message.token === "string" && message.token.trim()) {
        connectionState.token = message.token.trim();
      }
      if (typeof message.access_token === "string" && message.access_token.trim()) {
        connectionState.accessToken = message.access_token.trim();
      }
      if (typeof message.agent_id === "string" && message.agent_id.trim()) {
        connectionState.agentId = message.agent_id.trim();
      }
      if (typeof message.session_id === "string" && message.session_id.trim()) {
        connectionState.sessionId = message.session_id.trim();
      }
      if (typeof message.llm === "string" && message.llm.trim()) {
        connectionState.llm = message.llm.trim();
      }
      if (typeof message.mode === "string" && message.mode.trim()) {
        connectionState.mode = message.mode.trim();
      }
      sendJson(ws, { type: "joined", ts: Date.now() });
      return;
    }

    if (message.type === "user_message") {
      const accessToken =
        (typeof message.access_token === "string" && message.access_token.trim()) ||
        connectionState.accessToken ||
        "";
      const agentId =
        (typeof message.agent_id === "string" && message.agent_id.trim()) ||
        connectionState.agentId ||
        "";
      const text = message.text || "";
      const sessionId =
        (typeof message.session_id === "string" && message.session_id.trim()) ||
        connectionState.sessionId ||
        "";
      const mode =
        (typeof message.mode === "string" && message.mode.trim()) ||
        connectionState.mode ||
        "mk2";
      const llm =
        (typeof message.llm === "string" && message.llm.trim()) ||
        connectionState.llm ||
        "chatgpt";

      if (!accessToken) {
        sendJson(ws, { type: "error", error: "MISSING_ACCESS_TOKEN" });
        return;
      }
      if (!text) {
        sendJson(ws, { type: "error", error: "MISSING_TEXT" });
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const requestBody = {
        message: String(text),
        ...(sessionId ? { session_id: sessionId } : {}),
        mode: mode || "mk2",
        ...(agentId ? { agent_id: agentId } : { llm }),
      };

      fetch(`${APP_BASE_URL}/api/runtime/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
        .then(async (res) => {
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            sendJson(ws, {
              type: "error",
              error: payload.error || "REQUEST_FAILED",
              detail: payload,
              status: res.status,
            });
            return;
          }
          if (typeof payload.session_id === "string" && payload.session_id) {
            connectionState.sessionId = payload.session_id;
          }
          sendJson(ws, {
            type: "assistant_message",
            role: "bot",
            text: payload.message || "",
            step: payload.step || "final",
            session_id: payload.session_id || sessionId || null,
            mcp_actions: payload.mcp_actions || [],
          });
        })
        .catch((err) => {
          sendJson(ws, {
            type: "error",
            error: err?.message || "REQUEST_FAILED",
          });
        })
        .finally(() => clearTimeout(timeout));
      return;
    }

    sendJson(ws, { type: "error", error: "UNKNOWN_TYPE" });
  });
});

server.listen(PORT, () => {
  console.log(`ws-server listening on ${PORT}`);
});
