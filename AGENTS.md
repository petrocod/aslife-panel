# AGENTS.md – aslife-panel

Shared context for every AI agent (Claude, GPT/Codex, Gemini, Cursor). `CLAUDE.md` and `GEMINI.md` only point here.

## Project
TODO: one paragraph – what the panel does, stack, how to run it.
**This repo is public.** Nothing private (keys, customer data, internal URLs) may be committed.

## Git rules (all AI agents and humans)
- `master` = what is live. Never commit directly to `master`; open a Pull Request.
- One branch per task, deleted after merge: `claude/<topic>`, `gpt/<topic>`, `gemini/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Start of work: `git pull`. End of work: commit + `git push`.
- After each merged PR: add one line to `CHANGELOG.md` and update "Status" / "Open items" below.
- Never commit secrets (API keys, webhook secrets, SMTP passwords, `.env`). Secrets live only in the password manager.
- No real customer data in tests, previews or fixtures.
- Line endings are LF (see `.gitattributes`); `.bat`/`.cmd` stay CRLF.
- Customer-facing texts are Turkish; the owner (Tohid) talks in Persian.
- Only `master` here (plus short-lived task branches).

## Status
- Repo set up under `Projects/aslife-panel` (2026-11-18).

## Open items
- Check the history for committed secrets; rotate anything found.
- Archive the repo if it is no longer used.
