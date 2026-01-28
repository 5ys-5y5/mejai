/* Minimal WebSocket server entrypoint for Railway */
const http = require("http");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 8080);

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

    // TODO: connect to LLM/MCP/KB pipeline and stream responses
    if (message.type === "user_message") {
      sendJson(ws, {
        type: "assistant_message",
        role: "bot",
        text: "WebSocket 연결은 정상입니다. LLM/MCP/KB 연동은 다음 단계에서 연결됩니다.",
      });
      return;
    }

    sendJson(ws, { type: "error", error: "UNKNOWN_TYPE" });
  });
});

server.listen(PORT, () => {
  console.log(`ws-server listening on ${PORT}`);
});
