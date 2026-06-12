#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || 9222);
const demoUrl = args.url || "http://localhost:4173";
const outputPath = path.resolve(args.out || path.join(__dirname, "output", "cdp_probe_report.json"));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) {
      parsed[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true;
    }
  }
  return parsed;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed with HTTP ${response.status}`);
  }
  return response.json();
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
      this.ws.addEventListener("message", (event) => this.onMessage(event));
    });
  }

  on(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName).push(handler);
  }

  onMessage(event) {
    const message = JSON.parse(event.data);

    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message || "CDP error"} (${message.error.code})`));
      } else {
        resolve(message.result || {});
      }
      return;
    }

    if (message.method && this.handlers.has(message.method)) {
      for (const handler of this.handlers.get(message.method)) {
        Promise.resolve(handler(message.params || {})).catch((error) => {
          console.error(`CDP event handler failed for ${message.method}:`, error.message);
        });
      }
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    this.ws.send(payload);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function getOrCreateTarget() {
  const base = `http://127.0.0.1:${port}`;
  let targets = await jsonFetch(`${base}/json`);
  let target = targets.find((item) => item.type === "page" && item.url.startsWith(demoUrl));

  if (!target) {
    target = await jsonFetch(`${base}/json/new?${encodeURIComponent(demoUrl)}`, { method: "PUT" });
  }

  return target;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simplifyHeaders(headers = {}) {
  const interesting = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (["authorization", "content-type", "x-demo-client", "x-demo-cdp-lesson"].includes(lower)) {
      interesting[key] = value;
    }
  }
  return interesting;
}

async function runScenario(cdp) {
  await cdp.send("Page.navigate", { url: demoUrl });
  await new Promise((resolve) => {
    cdp.on("Page.loadEventFired", resolve);
  });
  await wait(700);

  await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        document.querySelector("#refreshBtn")?.click();
        await wait(500);
        document.querySelector(".conversation")?.click();
        await wait(900);
        const input = document.querySelector("#messageInput");
        input.value = "Typing through the intentionally slow handler";
        input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "x", bubbles: true }));
        await wait(250);
        document.querySelector("#styleTrapBtn")?.click();
        await wait(150);
        document.querySelector("#failureBtn")?.click();
        await wait(600);
        return {
          status: document.querySelector("#visibleStatus")?.textContent,
          lag: document.querySelector("#inputLagReadout")?.textContent,
          logItems: Array.from(document.querySelectorAll("#visibleLog li")).slice(0, 5).map((item) => item.textContent)
        };
      })()
    `
  });
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This script requires Node 22+ with the global WebSocket API.");
  }

  const target = await getOrCreateTarget();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.open();

  const report = {
    generatedAt: new Date().toISOString(),
    demoUrl,
    targetTitle: target.title,
    beginnerSummary: {
      browserUse: "Can reproduce visible symptoms such as slow typing, generic errors, and styling changes.",
      cdp: "Can inspect browser internals such as console events, network failures, storage, computed CSS, and performance metrics."
    },
    consoleEvents: [],
    runtimeExceptions: [],
    networkRequests: [],
    failedOrInterestingResponses: [],
    responseBodies: [],
    runtimeFetchEvidence: null,
    storage: {},
    computedSendButtonStyle: [],
    performanceMetrics: []
  };

  const requestById = new Map();
  const responseBodyCandidates = new Set();

  cdp.on("Runtime.consoleAPICalled", (params) => {
    report.consoleEvents.push({
      type: params.type,
      text: params.args.map((arg) => arg.value || arg.description || arg.type).join(" "),
      url: params.stackTrace?.callFrames?.[0]?.url || "",
      line: params.stackTrace?.callFrames?.[0]?.lineNumber ?? null
    });
  });

  cdp.on("Runtime.exceptionThrown", (params) => {
    report.runtimeExceptions.push({
      text: params.exceptionDetails?.text,
      description: params.exceptionDetails?.exception?.description,
      url: params.exceptionDetails?.url,
      line: params.exceptionDetails?.lineNumber
    });
  });

  cdp.on("Network.requestWillBeSent", (params) => {
    requestById.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      requestHeaders: simplifyHeaders(params.request.headers)
    });
    if (params.request.url.includes("/api/")) {
      report.networkRequests.push({
        id: params.requestId,
        method: params.request.method,
        url: params.request.url,
        requestHeaders: simplifyHeaders(params.request.headers)
      });
    }
  });

  cdp.on("Network.responseReceived", (params) => {
    const request = requestById.get(params.requestId);
    if (!request || !request.url.includes("/api/")) return;

    const item = {
      id: params.requestId,
      url: request.url,
      method: request.method,
      status: params.response.status,
      mimeType: params.response.mimeType,
      responseHeaders: simplifyHeaders(params.response.headers)
    };

    if (params.response.status >= 400 || params.response.headers["x-demo-cdp-lesson"]) {
      report.failedOrInterestingResponses.push(item);
      responseBodyCandidates.add(params.requestId);
    }
  });

  cdp.on("Network.loadingFailed", (params) => {
    const request = requestById.get(params.requestId);
    report.failedOrInterestingResponses.push({
      id: params.requestId,
      url: request?.url || "",
      method: request?.method || "",
      failed: true,
      errorText: params.errorText
    });
  });

  cdp.on("Network.loadingFinished", async (params) => {
    const request = requestById.get(params.requestId);
    if (!request || !request.url.includes("/api/")) return;
    responseBodyCandidates.add(params.requestId);
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable", {
    maxTotalBufferSize: 10_000_000,
    maxResourceBufferSize: 5_000_000
  });
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  await cdp.send("Performance.enable");

  await runScenario(cdp);
  await wait(1000);

  for (const requestId of responseBodyCandidates) {
    const request = requestById.get(requestId);
    if (!request) continue;

    try {
      const body = await cdp.send("Network.getResponseBody", { requestId });
      report.responseBodies.push({
        id: requestId,
        url: request.url,
        body: body.body.slice(0, 1200),
        base64Encoded: body.base64Encoded
      });
    } catch (error) {
      report.responseBodies.push({
        id: requestId,
        url: request.url,
        unavailable: true,
        reason: error.message
      });
    }
  }

  const runtimeFetchResult = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      (async () => {
        const token = localStorage.getItem("cdp_demo_auth_token");
        const response = await fetch("/api/profile/secret", {
          headers: {
            authorization: "Bearer " + token,
            "x-demo-client": "cdp-runtime-fetch"
          }
        });
        return {
          note: "This section is collected by CDP Runtime.evaluate and executes one extra demo request.",
          url: response.url,
          status: response.status,
          responseText: (await response.text()).slice(0, 1200)
        };
      })()
    `
  });
  report.runtimeFetchEvidence = runtimeFetchResult.result?.value || null;

  const storageResult = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `({
      localStorage: Object.fromEntries(Object.entries(localStorage)),
      sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
    })`
  });
  report.storage = storageResult.result?.value || {};

  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const sendButtonNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: "#sendButton"
  });

  if (sendButtonNode.nodeId) {
    const style = await cdp.send("CSS.getComputedStyleForNode", { nodeId: sendButtonNode.nodeId });
    const interestingStyleNames = new Set(["opacity", "pointer-events", "filter", "background-color", "color", "cursor"]);
    report.computedSendButtonStyle = style.computedStyle
      .filter((item) => interestingStyleNames.has(item.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const metrics = await cdp.send("Performance.getMetrics");
  const interestingMetrics = new Set(["Timestamp", "Documents", "Frames", "JSEventListeners", "LayoutCount", "RecalcStyleCount", "ScriptDuration", "TaskDuration", "JSHeapUsedSize"]);
  report.performanceMetrics = metrics.metrics.filter((metric) => interestingMetrics.has(metric.name));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  cdp.close();

  console.log(`CDP probe complete. Report written to ${outputPath}`);
  console.log("");
  console.log("High-signal findings:");
  console.log(`- Console events captured: ${report.consoleEvents.length}`);
  console.log(`- Runtime exceptions captured: ${report.runtimeExceptions.length}`);
  console.log(`- API requests captured: ${report.networkRequests.length}`);
  console.log(`- Failed or interesting responses captured: ${report.failedOrInterestingResponses.length}`);
  console.log(`- Runtime fetch evidence status: ${report.runtimeFetchEvidence?.status || "missing"}`);
  console.log(`- Storage keys captured: ${Object.keys(report.storage.localStorage || {}).join(", ")}`);
  console.log(`- Send button computed styles captured: ${report.computedSendButtonStyle.map((item) => `${item.name}=${item.value}`).join(", ")}`);
}

main().catch((error) => {
  console.error("CDP probe failed.");
  console.error(error.message);
  console.error("");
  console.error("Beginner checklist:");
  console.error("1. Start the demo app: npm start");
  console.error("2. Start Chrome with remote debugging enabled, for example:");
  console.error('   chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\\cdp-demo-profile"');
  console.error("3. Run this probe again: npm run probe:port");
  process.exit(1);
});
