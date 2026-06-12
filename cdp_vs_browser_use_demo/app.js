const state = {
  conversations: [],
  selectedId: null,
  messages: [],
  styleTrapEnabled: false
};

const els = {
  visibleStatus: document.querySelector("#visibleStatus"),
  conversationCount: document.querySelector("#conversationCount"),
  renderCost: document.querySelector("#renderCost"),
  conversationList: document.querySelector("#conversationList"),
  chatTitle: document.querySelector("#chatTitle"),
  messageList: document.querySelector("#messageList"),
  messageInput: document.querySelector("#messageInput"),
  inputLagReadout: document.querySelector("#inputLagReadout"),
  sendButton: document.querySelector("#sendButton"),
  refreshBtn: document.querySelector("#refreshBtn"),
  styleTrapBtn: document.querySelector("#styleTrapBtn"),
  failureBtn: document.querySelector("#failureBtn"),
  messageForm: document.querySelector("#messageForm"),
  visibleLog: document.querySelector("#visibleLog")
};

const fakeToken = "fake_demo_token_do_not_use";

localStorage.setItem("cdp_demo_auth_token", fakeToken);
localStorage.setItem("cdp_demo_mode", "slow-chat-lab");
sessionStorage.setItem("cdp_demo_session_marker", `session-${Date.now()}`);

console.info("[CDP demo] App booted with fake local storage state.");
console.warn("[CDP demo] Deliberate warning: conversation rendering does unnecessary work.");

setTimeout(() => {
  Promise.reject(new Error("[CDP demo] Deliberate unhandled rejection for CDP Runtime inspection."));
}, 1100);

function setStatus(message) {
  els.visibleStatus.textContent = message;
}

function logVisible(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  els.visibleLog.prepend(item);
}

function authHeaders() {
  return {
    authorization: `Bearer ${localStorage.getItem("cdp_demo_auth_token")}`,
    "x-demo-client": "cdp-vs-browser-use-demo"
  };
}

function busyWait(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    Math.sqrt(Math.random() * 10_000);
  }
}

function renderConversations() {
  const start = performance.now();

  const fragment = document.createDocumentFragment();
  state.conversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation${conversation.id === state.selectedId ? " active" : ""}`;
    button.dataset.id = String(conversation.id);
    button.innerHTML = `
      <span class="conversation-title">
        <span>${conversation.title}</span>
        <span class="${conversation.unread ? "unread" : ""}">${conversation.owner}</span>
      </span>
      <span class="conversation-preview">${conversation.preview}</span>
    `;
    fragment.appendChild(button);
  });

  els.conversationList.replaceChildren(fragment);
  els.conversationCount.textContent = String(state.conversations.length);
  els.renderCost.textContent = String(Math.round(performance.now() - start));
}

function renderMessages() {
  if (!state.messages.length) {
    els.messageList.innerHTML = `<p class="empty-state">No messages loaded yet. Select a conversation to trigger duplicate network requests.</p>`;
    return;
  }

  const html = state.messages
    .map((message) => {
      const variant = message.sender === "Codex" ? " codex" : "";
      return `
        <article class="message${variant}">
          <div class="message-meta">${message.sender} / ${new Date(message.sentAt).toLocaleTimeString()}</div>
          <div>${message.body}</div>
        </article>
      `;
    })
    .join("");

  els.messageList.innerHTML = html;
}

async function loadConversations() {
  setStatus("Loading conversations...");
  logVisible("Fetching conversation list.");

  const response = await fetch("/api/conversations", {
    headers: authHeaders()
  });

  const payload = await response.json();
  state.conversations = payload.conversations;
  renderConversations();
  setStatus("Conversation list loaded.");
  logVisible(`Loaded ${payload.count} conversations.`);
}

async function fetchMessages(id) {
  return fetch(`/api/conversations/${id}/messages`, {
    headers: authHeaders()
  });
}

async function selectConversation(id) {
  state.selectedId = id;
  state.messages = [];
  els.chatTitle.textContent = `Conversation ${String(id).padStart(3, "0")}`;
  renderConversations();
  renderMessages();
  setStatus("Loading messages...");
  logVisible(`Selected conversation ${id}; app will accidentally request messages twice.`);
  console.warn(`[CDP demo] Duplicate fetch path entered for conversation ${id}.`);

  try {
    const responses = await Promise.all([fetchMessages(id), fetchMessages(id)]);
    const failed = responses.find((response) => !response.ok);
    if (failed) {
      throw new Error(`A duplicate request failed with HTTP ${failed.status}.`);
    }

    const payload = await responses[0].json();
    state.messages = payload.messages;
    renderMessages();
    setStatus("Messages loaded.");
    logVisible(`Loaded messages for conversation ${id}.`);
  } catch (error) {
    console.error("[CDP demo] Message loading failed.", error);
    els.messageList.innerHTML = `
      <p class="empty-state error">
        Something went wrong while loading messages. The visible UI hides the request details; CDP can inspect them.
      </p>
    `;
    setStatus("Generic visible error.");
    logVisible("Visible UI only shows a generic message-loading error.");
  }
}

async function triggerFailedApi() {
  setStatus("Calling failing API...");
  logVisible("Triggering a failed API request with fake auth headers.");

  try {
    const response = await fetch("/api/profile/secret", {
      headers: authHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("[CDP demo] Failed profile request.", error);
    setStatus("Generic failed API message.");
    logVisible("The UI hides failed API details; CDP can inspect the network response.");
  }
}

function toggleStyleTrap() {
  state.styleTrapEnabled = !state.styleTrapEnabled;
  document.body.classList.toggle("style-trap", state.styleTrapEnabled);
  setStatus(state.styleTrapEnabled ? "Style trap applied." : "Style trap removed.");
  logVisible("Changed send button styling through CSS. CDP can inspect computed style.");
}

els.refreshBtn.addEventListener("click", loadConversations);

els.conversationList.addEventListener("click", (event) => {
  const button = event.target.closest(".conversation");
  if (!button) return;
  selectConversation(Number(button.dataset.id));
});

els.messageInput.addEventListener("input", () => {
  const start = performance.now();
  busyWait(85);
  renderConversations();
  const elapsed = Math.round(performance.now() - start);
  els.inputLagReadout.textContent = `Last input handler blocked for ${elapsed} ms.`;
  console.info(`[CDP demo] Slow input handler took ${elapsed} ms.`);
});

els.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const draft = els.messageInput.value.trim();
  if (!draft) {
    setStatus("Draft is empty.");
    return;
  }

  await fetch("/api/messages", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "content-type": "application/json"
    },
    body: JSON.stringify({ conversationId: state.selectedId, draft })
  });

  logVisible("Posted a fake message. Nothing is stored permanently.");
  setStatus("Fake message sent.");
  els.messageInput.value = "";
});

els.styleTrapBtn.addEventListener("click", toggleStyleTrap);
els.failureBtn.addEventListener("click", triggerFailedApi);

loadConversations();
