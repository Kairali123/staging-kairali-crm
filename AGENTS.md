# AGENTS

## GRE / GRM staff workspace (MID-19899)

For work on the GRE / GRM staff workspace, read
`docs/GRM-STAFF-WORKSPACE/GRM-ONLY-REQUIREMENTS.md` at the start of every
session and again after any context reset. Read its `README.md`,
`SOURCE_REGISTER.md`, `DESIGN_BRIEF.md`, and `BUILDER_PROMPT.md` before design
or implementation decisions. This scoped brief replaces the earlier combined
guest-app pack for GRM only; keep the arrival/iPad-in-cars project separate.
Preserve existing application code. Collect and verify the real FMS/sheet/form
sources and field map, prepare phone and iPad wireframes, and obtain Abhilash's
explicit approval of the exact wireframe version before starting or resuming
GRM programming. Do not invent fields, working integrations, approval, or a
production release. Record source verification, wireframe version, approval
evidence, programming authorisation, and production acceptance separately.

Read `AI-HUMAN.md` first and follow it as the project operating system. Then load the
parameters and current task state it names. Project facts belong in `FACTS.md`; human
rulings belong in `DECISIONS.md`.

Do not import assumptions from another project. Do not start a second task while one is
live. Available tools do not grant permission; check `TOOLBOX.md` and `GATES.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Arrival Companion Gate (Oct 2026)
CRITICAL: Read `docs/ARRIVAL-ONLY-REQUIREMENTS.md` every session.
- SOURCE COLLECTION AND WIREFRAMES ONLY.
- Application programming for the Arrival Companion remains PAUSED until Abhilash explicitly approves the exact wireframe version.
- Do NOT write new application code for this specific feature until approval is confirmed.
