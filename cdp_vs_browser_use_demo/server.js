const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const conversations = Array.from({ length: 160 }, (_, index) => ({
  id: index + 1,
  title: `Conversation ${String(index + 1).padStart(3, "0")}`,
  owner: index % 4 === 0 ? "Design" : index % 4 === 1 ? "Support" : index % 4 === 2 ? "Ops" : "Research",
  unread: index % 9 === 0,
  preview: `Synthetic thread with ${18 + (index % 12)} messages and a deliberately heavy render path.`
}));

const messageHitTimes = new Map();

function sendJson(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  res.end(json);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
  });
}

async function handleApi(req, res, url) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, authorization, x-demo-client");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/api/conversations") {
    await delay(140);
    sendJson(res, 200, {
      count: conversations.length,
      conversations
    });
    return;
  }

  const messageMatch = url.pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
  if (messageMatch) {
    const id = Number(messageMatch[1]);
    const now = Date.now();
    const previous = messageHitTimes.get(id) || 0;
    messageHitTimes.set(id, now);

    await delay(id % 5 === 0 ? 260 : 90);

    if (now - previous < 850) {
      sendJson(
        res,
        429,
        {
          error: "duplicate_request",
          message: "Demo-only rate limit: the app made the same request twice too quickly.",
          visibleToUser: "Something went wrong while loading messages.",
          fakeInternalHint: "Look for duplicate fetch calls in selectConversation()."
        },
        { "retry-after": "1", "x-demo-cdp-lesson": "network-duplicates" }
      );
      return;
    }

    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: `${id}-${index + 1}`,
      sender: index % 2 === 0 ? "Alex" : "Codex",
      body: `Message ${index + 1} for conversation ${id}. This is synthetic demo content.`,
      sentAt: new Date(Date.now() - index * 90_000).toISOString()
    }));

    sendJson(res, 200, { conversationId: id, messages }, { "x-demo-cdp-lesson": "request-timing" });
    return;
  }

  if (url.pathname === "/api/profile/secret") {
    await delay(180);
    sendJson(
      res,
      500,
      {
        error: "demo_private_payload",
        message: "The UI hides this detail, but CDP can inspect failed request metadata.",
        fakeTokenSeenByServer: req.headers.authorization || "missing",
        fakeUserId: "fake-user-1842"
      },
      { "x-demo-cdp-lesson": "failed-request-body" }
    );
    return;
  }

  if (url.pathname === "/api/messages" && req.method === "POST") {
    const body = await readRequestBody(req);
    await delay(70);
    sendJson(res, 201, {
      ok: true,
      stored: false,
      demoOnlyEcho: JSON.parse(body || "{}")
    });
    return;
  }

  sendJson(res, 404, { error: "not_found" });
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: "server_error", message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`CDP vs Browser Use demo running at http://localhost:${PORT}`);
});
