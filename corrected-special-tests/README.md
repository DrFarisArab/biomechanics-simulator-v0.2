# Corrected special tests

Staging area for **end-pose corrections** to the special-test 3D poses.

## How files get here

In the app (Special Tests → open a test → **Edit end pose**), adjusting the
final joint angles and hitting **Save correction** writes one JSON per test
here, e.g. `kn1.json`:

```json
{
  "testId": "kn1",
  "testName": "Lachman test",
  "baseId": "supine",
  "angles": { "knee_right": { "flexExt": 40 } },
  "savedAt": "2026-07-18T09:24:19.424Z"
}
```

- Only the **joint angles** are corrected — the base position (`baseId`),
  root transform, and furniture are never editable and always come from the
  shipped pose.
- `angles` is trimmed to just the non-neutral degrees of freedom.
- The correction also lives in the browser's `localStorage` so it takes effect
  immediately on this device; this file is the copy meant to be folded back
  into source. (Resetting a correction in the app deletes both.)
- File writing only works when the app runs on a writable server (local
  `next dev`). On a read-only host the Save falls back to downloading the JSON.

## Folding into source (the permanent step)

Each JSON here is a **pending change to `lib/specialTests.ts`**. To make a
correction the real default for everyone, merge its `angles` into that test's
`fromProcedure(...)` command list (or preset), then delete the JSON. Once the
folder is empty, the shipped library is the single source of truth again.
