/* Minimal WebSocket server entrypoint for Railway */
const http = require("http");
const WebSocket = require("ws");

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

wss.on("connection", (ws) => {
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
      sendJson(ws, { type: "joined", ts: Date.now() });
      return;
    }

    if (message.type === "user_message") {
      const accessToken = message.access_token || "";
      const agentId = message.agent_id || "";
      const text = message.text || "";
      const sessionId = message.session_id || "";
      if (!accessToken || !agentId || !text) {
        sendJson(ws, { type: "error", error: "MISSING_FIELDS" });
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      fetch(`${APP_BASE_URL}/api/playground/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          agent_id: agentId,
          message: String(text),
          session_id: sessionId || null,
        }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            sendJson(ws, { type: "error", error: payload.error || "REQUEST_FAILED" });
            return;
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
          sendJson(ws, { type: "error", error: err?.message || "REQUEST_FAILED" });
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
