# CDP vs Browser Use Demo

This demo is a local, intentionally flawed chat app. It is designed for someone with no prior CDP experience.

The goal is to show the practical difference between:

- **Ordinary Browser Use**: using a browser like a user or tester.
- **Chrome DevTools Protocol (CDP)**: inspecting browser internals like DevTools does.

The app uses only fake local data. Any token-like value is fake and exists only to show what CDP could expose in a real app.

## What You Will Learn

After running this demo, you should be able to explain:

1. What Browser Use can observe from the visible page.
2. What CDP can inspect inside the browser.
3. Why CDP is useful for debugging slow or broken apps.
4. Why full CDP access is labeled elevated risk.

## Mental Model

Browser Use is like asking someone to use the web app:

- Open the page.
- Click a conversation.
- Type a message.
- Notice that typing is slow.
- See that an error message appears.

CDP is like opening Chrome DevTools programmatically:

- Read console warnings and errors.
- Inspect network requests and failed responses.
- Read local storage and session storage.
- Inspect computed CSS.
- Collect performance metrics.

Browser Use can show that the app is broken. CDP can often show why.

## Run the Demo App

From this folder:

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```

The app starts as a fake chat interface with a conversation list, message panel, and "Hidden Evidence" panel.

## What Is Intentionally Broken

The app includes several deliberate issues:

| Issue | Visible symptom | CDP evidence |
| --- | --- | --- |
| Duplicate message requests | Generic message-loading error | Network log shows two requests; one returns HTTP 429 |
| Slow input handler | Typing feels delayed | Console logs and performance metrics show JavaScript work |
| Console-only bug | Page mostly keeps working | Runtime exception appears in CDP |
| Fake stored state | No obvious UI detail | CDP can read local storage and session storage |
| Failed API call | Generic visible failure | CDP can inspect request headers, status, and response body |
| CSS style trap | Send button looks disabled | CDP can inspect computed CSS like `opacity` and `pointer-events` |

## Ordinary Browser Use Walkthrough

Use the app like a normal user:

1. Open `http://localhost:4173`.
2. Confirm that the conversation list loads.
3. Click the first conversation.
4. Notice that the app shows a generic message-loading error.
5. Type in the message draft box.
6. Notice that typing is delayed.
7. Click **Apply style trap**.
8. Notice that the send button looks disabled.
9. Click **Trigger failed API**.
10. Notice that the visible status changes, but the UI does not reveal low-level request details.

This is what ordinary Browser Use is good at: reproducing symptoms and verifying visible behavior.

## CDP Walkthrough

The included `cdp_probe.js` script connects to Chrome's CDP endpoint, drives the demo page, and writes a structured report.

Start Chrome with remote debugging enabled. On Windows, one common command is:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\cdp-demo-profile"
```

If `chrome.exe` is not on your PATH, use the full path to Chrome, usually one of:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\cdp-demo-profile"
& "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\cdp-demo-profile"
```

Then run:

```powershell
npm run probe:port
```

The probe writes:

```text
output/cdp_probe_report.json
```

That report includes:

- Console messages.
- Runtime exceptions.
- API requests.
- Failed or interesting responses.
- Network response body samples when Chrome retains them.
- An explicit CDP Runtime fetch of the failing demo endpoint.
- Local storage and session storage values.
- Computed CSS for the send button.
- Browser performance metrics.

## Reading the CDP Report

Open `output/cdp_probe_report.json` after running the probe.

Look for these sections:

- `consoleEvents`: messages that are not shown in the app UI.
- `runtimeExceptions`: JavaScript errors that a screenshot may miss.
- `networkRequests`: API calls made by the app.
- `failedOrInterestingResponses`: requests with useful debug signals, including HTTP 429 and HTTP 500.
- `responseBodies`: response details that the UI hides.
- `runtimeFetchEvidence`: a CDP Runtime-based request that reads the failing endpoint directly. This executes one extra local demo request and is included to make the risk concrete.
- `storage`: fake local/session storage values.
- `computedSendButtonStyle`: CSS values that explain why the button looks disabled.
- `performanceMetrics`: browser-level metrics related to script, layout, style, and task duration.

## Why This Matters

If you only use ordinary Browser Use, you can say:

> The app becomes slow, message loading fails, and the send button looks disabled.

With CDP, you can say:

> Message loading fails because the app sends duplicate requests and one gets a 429 response. Typing is slow because the input handler blocks the main thread. The send button looks disabled because the computed CSS sets low opacity and disables pointer events. The app also has a console-only runtime error and fake stored state in local storage.

That second explanation is more useful for debugging.

## Safety Note

This demo uses fake values such as:

```text
fake_demo_token_do_not_use
```

In a real logged-in browser session, CDP could expose real tokens, request headers, local storage, private API responses, or typed form data. That is why Codex labels full CDP access as elevated risk.

For learning, use a temporary Chrome profile and local demo apps.

## Documentation Index

- [Ordinary Browser Use walkthrough](docs/browser_use_walkthrough.md)
- [CDP walkthrough](docs/cdp_walkthrough.md)
- [Comparison matrix](docs/comparison_matrix.md)
- [Security risk notes](docs/security_risk_notes.md)
