# Comparison Matrix

This matrix compares what ordinary Browser Use can observe with what CDP can inspect.

| Scenario | Ordinary Browser Use | CDP | Why CDP Matters | Risk Lesson |
| --- | --- | --- | --- | --- |
| Page loads | Can confirm the app renders | Can also inspect runtime, storage, and network state during load | Shows whether the page is healthy internally, not just visually present | Internals may include private app state |
| Conversation list | Can see conversations appear | Can inspect the `/api/conversations` request and response metadata | Confirms where data came from and how long it took | Request URLs and headers may be sensitive |
| Selecting a conversation | Can see a generic message-loading error | Can see duplicate message requests and HTTP 429 | Turns a vague UI symptom into a specific root cause | Network data may expose endpoints and auth details |
| Slow typing | Can observe input delay and visible lag text | Can collect console logs and performance metrics | Helps distinguish CPU-bound work from network delay or rendering issues | Performance inspection reveals detailed runtime behavior |
| Console-only bug | May not notice because the page still works | Can capture console warnings and runtime exceptions | Finds hidden failures before they become visible bugs | Console logs may accidentally contain secrets |
| Failed API | Can see generic status text | Can inspect status code, headers, and response body | Explains what failed and why | Failed responses may include private user data |
| Runtime evaluation | Cannot run hidden diagnostic JavaScript from outside the UI | Can execute page-context JavaScript when allowed | Can collect evidence that the UI never renders | Executing code in a logged-in page can expose or alter sensitive state |
| Local/session storage | Usually invisible | Can read fake demo storage values | Explains behavior that persists across refreshes | Real storage may contain tokens or user-specific state |
| CSS style trap | Can see the send button looks disabled | Can inspect computed `opacity`, `filter`, and `pointer-events` | Identifies the actual styling cause | DOM and styling internals may expose implementation details |

## The Main Lesson

Browser Use is enough for reproduction:

> I can make the bug happen.

CDP is better for diagnosis:

> I can see the internal evidence that explains why the bug happens.

Both are useful. CDP is more powerful and therefore more sensitive.
