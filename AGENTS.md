# Starter maintenance instructions

- Band only. Use this church's own selections; never introduce another church's IDs or data.
- Read README.md and VERIFICATION.md before setup or modification.
- Keep all pages and API routes authenticated and fail closed when config is missing.
- Keep credentials server-side and out of chat, logs, source, exports and NEXT_PUBLIC variables.
- This starter is draft-only. Do not enable writes until full conflict validation and server-enforced explicit approval are implemented and tested.
- Never treat absent availability data as proof that a musician is available.
- Get explicit user approval before OAuth consent, credential generation, external deployment, repository publishing or real schedule publication.
- Do not contact third parties or send notifications implicitly.
- Run tests, typecheck, lint and build after material changes. Report mocks separately from live verification.
