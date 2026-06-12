# Security Risk Notes

Codex labels full CDP access as elevated risk because CDP can inspect browser internals.

That power is useful for debugging, but it can expose sensitive data.

## Why This Demo Uses Fake Data

The demo stores this fake value in local storage:

```text
fake_demo_token_do_not_use
```

It also sends the fake value as an authorization header to local demo APIs.

This is intentional. It shows what CDP can reveal without exposing real credentials.

## What CDP Could Expose in a Real App

In a real logged-in browser session, CDP may expose:

- Session tokens.
- Authorization headers.
- Cookies or cookie-adjacent state.
- Private API responses.
- User IDs.
- Draft form data.
- Local storage values.
- Session storage values.
- Full request URLs and query parameters.
- Console logs containing secrets.
- Internal app routes, feature flags, and debug data.

## Safe Learning Practices

Use these habits when learning CDP:

1. Prefer local demo apps.
2. Use fake credentials and fake data.
3. Use a temporary Chrome profile.
4. Avoid connecting CDP to your normal logged-in browser profile.
5. Do not inspect production apps unless you have permission and understand what data may be exposed.
6. Treat CDP reports as sensitive artifacts if they include headers, storage, or response bodies.

## Why the Codex Setting Requires Approval

Ordinary Browser Use can interact with a page.

Full CDP access can inspect and control browser internals.

That includes information the app does not show in the UI. The approval step exists because the privacy and security boundary is different.

## Demo Cleanup

The demo itself does not persist real data.

Generated CDP reports are written under:

```text
output/
```

The repository `.gitignore` excludes that folder so generated reports are not committed by accident.
