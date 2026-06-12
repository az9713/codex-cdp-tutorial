# Browser Use, CDP, and Developer Mode

This document explains the Codex Browser Use feature, Chrome DevTools Protocol (CDP), why full CDP access is labeled as elevated risk, and how a future showcase can demonstrate the difference between ordinary Browser Use and CDP-backed debugging.

The local source material for this document is `transcript.txt`, which summarizes a Codex demo about using CDP through Browser Use to debug a slow chat application. The relevant Codex Browser setting is:

> Developer mode  
> Elevated risk  
> Enable full CDP access  
> Allow Codex to use full Chrome DevTools Protocol (CDP) access in connected Browser Use sessions. Full CDP access lets Codex inspect and control sensitive browser internals that may put your data at risk.

## Executive Summary

Browser Use is the browser automation layer Codex uses to interact with websites and local web apps. It lets Codex open pages, click controls, type into fields, scroll, inspect visible page state, and take screenshots. It is useful for testing the application the way a user would experience it.

CDP is the lower-level Chrome DevTools Protocol. It is the protocol behind many Chrome DevTools capabilities. CDP can inspect and control browser internals such as console logs, JavaScript runtime errors, network requests, local storage, applied styles, and performance profiles.

The important distinction is this:

- Ordinary Browser Use helps Codex see and operate the page.
- CDP helps Codex debug the page from inside the browser engine.

That is why full CDP access requires Developer mode and is marked as elevated risk. It can expose sensitive browser and application data that would not necessarily be visible in screenshots or normal page interaction.

## What Browser Use Is

Browser Use is a high-level browser automation capability. In practical terms, it lets Codex use a browser session to perform actions such as:

- Open a URL.
- Navigate between pages.
- Click buttons and links.
- Type into inputs and textareas.
- Press keyboard shortcuts.
- Scroll.
- Inspect visible or interactable page elements.
- Take screenshots.
- Verify whether visible UI changed after an action.

Browser Use is especially useful for frontend development because it lets Codex test the app after changing code. Instead of only reading source files, Codex can run the app and confirm that the rendered interface behaves as expected.

Examples of ordinary Browser Use tasks:

- "Open `localhost:3000` and check whether the settings page loads."
- "Click the save button and verify that the success message appears."
- "Fill out this form with test data."
- "Take a screenshot of the mobile layout."
- "Check whether the dropdown options are visible."

These are user-level or page-level tasks. They mostly answer: what can a user see and do?

## What CDP Is

CDP stands for Chrome DevTools Protocol. It is a lower-level protocol exposed by Chromium-based browsers for debugging, inspection, profiling, and browser automation.

CDP is what allows tools to ask the browser questions like:

- What network requests were made?
- Which request failed?
- What were the response status codes?
- What console warnings or runtime errors occurred?
- What is stored in local storage or session storage?
- Which CSS rules were applied to this element?
- How long did this JavaScript task take?
- Why is this interaction slow?
- What happened during a performance trace?

In the Codex transcript, CDP support is described as enabling Codex to inspect:

- Console logs.
- Runtime errors.
- Local storage.
- Applied styling.
- Network traffic.
- Performance profiles.

Those are DevTools-style debugging surfaces, not just visible page surfaces.

## Does Browser Use Automatically Invoke CDP?

For the elevated setting shown in the screenshot, the practical answer is no: full CDP access should be treated as opt-in.

The transcript says that to use the deeper CDP functionality, the user must:

1. Enable Developer mode in the Codex app's Browser settings.
2. Explicitly approve CDP access when Codex starts using CDP to inspect a website.

There may be internal browser automation mechanisms that use browser protocols behind the scenes, but that is different from granting Codex full CDP access to inspect sensitive browser internals. The setting in the screenshot is specifically about allowing full CDP access in connected Browser Use sessions.

## What CDP Can Do That Ordinary Browser Use Cannot

Ordinary Browser Use can often tell that something is wrong. CDP can often explain why it is wrong.

| Debugging need | Ordinary Browser Use | CDP-backed inspection |
| --- | --- | --- |
| User interaction | Click, type, scroll, navigate, screenshot | Can also observe lower-level event and runtime behavior during the interaction |
| Console logs | Usually not visible unless the app renders them | Can read warnings, errors, stack traces, and logged diagnostics |
| Runtime exceptions | May only see a broken UI | Can inspect JavaScript errors and stack traces |
| Network traffic | May infer loading or failure from UI | Can inspect request URLs, methods, status codes, timings, failures, headers, and responses |
| Local storage | Usually invisible from UI | Can inspect stored values that influence behavior |
| Session storage | Usually invisible from UI | Can inspect temporary browser state |
| Cookies and auth state | Usually not visible directly | May expose session-related browser state depending on access and context |
| Applied CSS | Can see the final visual result | Can inspect computed style, matched rules, and layout-related details |
| Performance | Can notice that typing or loading is slow | Can capture profiles, long tasks, main-thread blocking, and timing measurements |
| Hidden app state | Limited to what the UI exposes | Can inspect browser/runtime state that the UI never shows |

## Why CDP Is Elevated Risk

Full CDP access is powerful because it operates closer to the browser's internals. That is useful for debugging, but it can reveal sensitive information.

Examples of sensitive data CDP may expose:

- Authentication-related request headers.
- API responses containing private data.
- Local storage values such as tokens, feature flags, user IDs, draft content, or app state.
- Session storage values.
- Cookies or cookie-adjacent session state, depending on the browser context and permissions.
- Full network request URLs, including query parameters.
- Console logs that accidentally contain secrets.
- Typed form data.
- Internal application state that is not visible in the UI.

This is why the Codex setting says:

> Full CDP access lets Codex inspect and control sensitive browser internals that may put your data at risk.

The risk is not abstract. If a logged-in app stores tokens in local storage, sends private API responses, or logs sensitive information to the console, CDP can potentially reveal those details to the agent during debugging.

## When Ordinary Browser Use Is Enough

Use ordinary Browser Use when the task is mostly about visible behavior:

- Checking that a page loads.
- Testing a button or form.
- Verifying layout at different screen sizes.
- Capturing screenshots.
- Confirming that visible copy or UI state is correct.
- Reproducing a simple user flow.

For these tasks, CDP may be unnecessary. Browser Use can act like a test user and verify the page from the outside.

## When CDP Is Worth Enabling

CDP is worth enabling when the problem requires DevTools-level inspection:

- The app is slow, but the cause is unclear.
- A page looks fine but logs runtime errors.
- A request is failing silently.
- A loading spinner never resolves.
- The UI shows stale data and you need to inspect cache or storage.
- A bug only happens after certain stored state exists.
- CSS looks wrong and you need to inspect applied rules.
- You need before-and-after performance measurements.
- You need to prove a fix improved network or runtime behavior.

The transcript's example is a good fit: a chat app becomes slow as the conversation list grows. Ordinary Browser Use can observe the slowness. CDP can profile the interaction, inspect network requests, and identify the true bottlenecks before code changes are made.

## Showcase Goal

The planned showcase should make the difference between Browser Use and CDP concrete.

The core idea is to build a small local demo app with visible problems and hidden diagnostic signals. Ordinary Browser Use should be able to reproduce the symptoms. CDP should be able to reveal the underlying causes.

The showcase should answer four questions:

1. What can Browser Use do by itself?
2. What additional information does CDP reveal?
3. Why does that extra information improve debugging quality?
4. Why does that same power create privacy and security risk?

## Proposed Showcase App

The example app should resemble the transcript's slow chat app scenario.

Working title:

`cdp_vs_browser_use_demo`

Proposed behavior:

- A conversation list grows large enough to slow down rendering.
- Selecting a conversation triggers duplicate or inefficient network requests.
- Typing into the message box becomes delayed because of unnecessary JavaScript work.
- A hidden runtime error appears in the console.
- A failed API request occurs but the visible UI only shows a vague loading or error state.
- Local storage contains app state that changes behavior across refreshes.
- A styling issue is caused by an unexpected applied CSS rule.

The app should be safe and local-only. Any fake sensitive values should be clearly marked as fake demo data.

## Planned Documentation and Files

The future implementation can create a folder like:

```text
cdp_vs_browser_use_demo/
  README.md
  index.html
  server.js
  cdp_probe.js
  docs/
    browser_use_walkthrough.md
    cdp_walkthrough.md
    comparison_matrix.md
    security_risk_notes.md
```

This request is documentation-only, so these files should not be created yet except for planning documentation.

## Showcase Walkthrough: Ordinary Browser Use

The Browser Use walkthrough should demonstrate tasks such as:

1. Open the local app.
2. Observe that the conversation list renders.
3. Click a conversation.
4. Type a message.
5. Notice that typing feels delayed.
6. Observe that an error message or loading state appears.
7. Take a screenshot.
8. Verify visible UI state before and after interaction.

Expected conclusion:

Browser Use can reproduce the symptoms and verify user-visible behavior, but it has limited visibility into why the symptoms occur.

Example finding from ordinary Browser Use:

> The app loads, but selecting a conversation is slow. Typing into the message box appears delayed. A generic error message appears after selecting one conversation.

That is useful, but incomplete.

## Showcase Walkthrough: CDP

The CDP walkthrough should demonstrate deeper inspection:

1. Capture console warnings and runtime errors.
2. Inspect failed network requests.
3. Identify duplicate requests.
4. Inspect request timings.
5. Read local storage and session storage values that affect app behavior.
6. Inspect computed CSS for the confusing visual issue.
7. Capture a performance profile while typing or switching conversations.
8. Identify long tasks or main-thread blocking.
9. Produce before-and-after measurements after a future fix.

Expected conclusion:

CDP can identify root causes that are invisible or ambiguous from the rendered page alone.

Example CDP-backed finding:

> Selecting a conversation triggers two identical `/api/conversations/:id/messages` requests. One returns `200`, the duplicate returns `429`. The UI only shows a generic error, but the network panel reveals that the error is caused by duplicate fetches. A performance trace also shows a long JavaScript task during message input.

That is much more actionable.

## Comparison Matrix for the Final Showcase

The final comparison artifact should include a table like this:

| Scenario | Browser Use observation | CDP observation | Why CDP matters | Risk exposed |
| --- | --- | --- | --- | --- |
| Slow typing | Typing visibly lags | Performance profile shows long main-thread task | Points to CPU-bound render or event handler work | Captures detailed runtime behavior |
| Generic error | UI says "Something went wrong" | Network request failed with status and response body | Identifies the failing endpoint | May expose private API response data |
| Duplicate loading | Page feels slow | Network log shows duplicate requests | Reveals inefficient fetch logic | May expose request headers and URLs |
| Stale app state | UI opens in unexpected mode | Local storage contains persisted flag | Explains cross-refresh behavior | May expose tokens or user-specific state |
| Styling bug | Button looks disabled or wrong | Computed style shows rule overriding intended style | Identifies the exact CSS source | Reveals full DOM and styling internals |
| Console-only bug | UI mostly works | Console contains runtime exception | Finds hidden failures before users report them | Console logs may contain sensitive values |

## Security Guidance for the Showcase

The future demo should avoid real credentials, real cookies, or real private data.

Recommended safeguards:

- Use only local demo data.
- Use fake tokens such as `fake_demo_token_do_not_use`.
- Make all sensitive-looking values visibly fake.
- Do not connect the demo to real services.
- Do not inspect a real logged-in browser profile during the showcase unless there is a specific reason.
- Make the CDP risk visible by showing what could be exposed, without exposing real secrets.

## Suggested Narrative

The documentation and demo should use this narrative:

1. Browser Use is enough to operate and test the app like a user.
2. The app has symptoms that are visible from the outside.
3. Those symptoms are not enough to identify root causes confidently.
4. CDP provides DevTools-level evidence.
5. That evidence makes debugging faster and more precise.
6. The same access can reveal sensitive internals, which is why the setting requires Developer mode and explicit approval.

## Non-Goals for This Documentation Pass

This document does not implement the showcase.

It does not create:

- A runnable demo app.
- A local server.
- A CDP probe script.
- Browser automation tests.
- Screenshots of the future app.

Those should be created in a later implementation step after the documentation direction is approved.

## Final Takeaway

Ordinary Browser Use answers: what is happening on the page?

CDP answers: what is happening inside the browser while the page runs?

That difference is why CDP is valuable for debugging slow, broken, or confusing web apps. It is also why full CDP access is treated as elevated risk in Codex.
