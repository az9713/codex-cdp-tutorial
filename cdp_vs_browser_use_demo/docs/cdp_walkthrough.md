# CDP Walkthrough

CDP stands for Chrome DevTools Protocol.

You do not need to know the protocol details to understand the value. Think of CDP as a programmable version of Chrome DevTools.

If ordinary Browser Use is "use the page," CDP is "inspect the browser while the page runs."

## What CDP Adds

CDP can collect evidence that is not visible on the page:

- Console messages.
- JavaScript runtime exceptions.
- Network request URLs, methods, headers, timings, status codes, and response details.
- Local storage and session storage.
- Computed CSS.
- Performance metrics.

## Before Running the Probe

Start the demo app:

```powershell
npm start
```

Start Chrome with remote debugging enabled:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\cdp-demo-profile"
```

If that command fails, use Chrome's full path:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\cdp-demo-profile"
```

The `--user-data-dir` flag creates a temporary profile. This is a good habit because it avoids inspecting your normal logged-in browser profile while learning.

## Run the Probe

From this demo folder:

```powershell
npm run probe:port
```

The probe connects to:

```text
http://127.0.0.1:9222
```

It opens or finds the demo page, performs the same interactions a user would perform, and writes:

```text
output/cdp_probe_report.json
```

## What the Probe Does

The probe:

1. Enables CDP domains for page, runtime, network, DOM, CSS, and performance.
2. Navigates to the demo app.
3. Clicks reload.
4. Selects a conversation.
5. Types into the message box.
6. Applies the style trap.
7. Triggers the failing API.
8. Reads local storage and session storage.
9. Reads computed CSS for the send button.
10. Performs one explicit CDP Runtime fetch to read the failing demo endpoint.
11. Reads browser performance metrics.
12. Writes a JSON report.

## What to Look For

### Console Events

In `consoleEvents`, you should see logs and warnings such as:

```text
Deliberate warning: conversation rendering does unnecessary work.
```

This is useful because production bugs often leave hints in the console that are not rendered in the UI.

### Runtime Exceptions

In `runtimeExceptions`, you should see the deliberate unhandled rejection.

A normal screenshot may miss this because the page keeps running.

### Network Requests

In `networkRequests`, look for requests to:

```text
/api/conversations
/api/conversations/1/messages
/api/profile/secret
```

The app intentionally requests messages twice. CDP can show duplicate requests and the HTTP 429 response.

### Failed or Interesting Responses

In `failedOrInterestingResponses`, look for:

- HTTP 429 from duplicate message loading.
- HTTP 500 from the failed profile API.

Browser Use can see the generic UI error. CDP can see the real request result.

### Response Bodies

In `responseBodies`, Chrome may retain response body samples for some API requests. When a body is not available through the Network domain, the report records an explicit `unavailable` reason instead of hiding the limitation.

This is normal CDP behavior to be aware of: network metadata is usually reliable, while response body retrieval can depend on browser buffering and request timing.

### Runtime Fetch Evidence

In `runtimeFetchEvidence`, the probe uses CDP `Runtime.evaluate` to execute one extra local demo request and read the failing endpoint's response text.

This is included to make the risk concrete. CDP can do more than observe. It can also run JavaScript in the page context if that access is allowed.

This is the privacy lesson. In a real app, a failed API response might include private user data or internal error details.

### Storage

In `storage`, look for:

```text
cdp_demo_auth_token
cdp_demo_mode
cdp_demo_session_marker
```

These values are fake, but they show that CDP can inspect browser storage.

### Computed Style

In `computedSendButtonStyle`, look for:

```text
opacity
pointer-events
filter
```

This explains why the send button looks disabled after clicking **Apply style trap**.

### Performance Metrics

In `performanceMetrics`, look for script, task, layout, and style metrics.

These are not a full performance trace, but they show the kind of browser-level evidence CDP can collect. A fuller version could add CDP tracing or CPU profiling.

## CDP Finding

A CDP-backed summary can say:

> The visible message-loading error is caused by duplicate `/api/conversations/:id/messages` requests. One request returns successfully and the duplicate receives HTTP 429. The failed profile request returns HTTP 500 and includes fake internal details in the response body. The send button looks disabled because computed CSS sets low opacity and disables pointer events. The browser also captured console warnings, an unhandled runtime exception, fake storage state, and performance metrics showing script work.

That is much more actionable than the Browser Use-only finding.
