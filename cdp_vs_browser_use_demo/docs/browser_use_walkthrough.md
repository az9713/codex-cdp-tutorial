# Ordinary Browser Use Walkthrough

This walkthrough assumes no CDP knowledge.

Ordinary Browser Use means the agent interacts with the web page through visible browser behavior: opening pages, clicking controls, typing text, scrolling, and checking screenshots or page state.

It is similar to a human tester using the app.

## Start

Run the demo:

```powershell
npm start
```

Open:

```text
http://localhost:4173
```

## What Browser Use Can Observe

### 1. The Page Loads

The page shows:

- A conversation list.
- A message panel.
- A hidden-evidence panel.
- A visible status card.

Browser Use can verify that these elements are present.

### 2. Conversation Loading Works Visibly

Click **Reload**.

Browser Use can see that conversations appear and that the loaded count changes.

It can also see render timing text such as:

```text
160 loaded
```

### 3. Selecting a Conversation Produces a Generic Error

Click a conversation.

Browser Use can see:

- The selected conversation is highlighted.
- The chat title changes.
- A generic error appears in the message area.
- The visible status changes to a generic error message.

Browser Use cannot directly see the duplicate network requests that caused the error.

### 4. Typing Feels Slow

Type in the message draft box.

Browser Use can notice that the page responds slowly and can read the visible lag readout.

It cannot directly inspect the JavaScript execution path or browser task timing.

### 5. The Send Button Looks Disabled

Click **Apply style trap**.

Browser Use can see that the send button becomes faded.

It cannot directly inspect which CSS rule caused that appearance.

### 6. The Failed API Is Hidden Behind a Generic Status

Click **Trigger failed API**.

Browser Use can see that the visible app status changes.

It cannot directly inspect:

- The failed request URL.
- The HTTP status code.
- Request headers.
- Response headers.
- Response body.

## Browser Use Finding

After this walkthrough, a Browser Use-only summary would look like:

> The chat app loads, but selecting a conversation causes a generic error. Typing in the draft box is slow. The send button can be made to look disabled. Triggering the failed API changes the visible status, but the page does not show low-level request details.

That is useful, but it does not identify root causes.
