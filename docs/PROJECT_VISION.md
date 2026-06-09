# Project Vision & Agent Guidelines

> Moved out of `CLAUDE.md` on 2026-06-09 to keep the always-loaded project memory
> lean (per Anthropic's CLAUDE.md guidance: a bloated CLAUDE.md causes Claude to
> ignore the rules that matter every session). This content is *strategic* — it
> guides feature planning, not per-edit behaviour — so it lives here and is read
> on demand during Design & Research sessions rather than loaded into every chat.
>
> The per-edit rules that used to live in "AI Agent Mindset" (lint gate, test
> verification) are now **enforced automatically** by the `.githooks/pre-commit`
> quality gate, so they no longer need to be repeated as instructions.

## The "Zero-Waste Cognitive Engine" Master Plan

To elevate this codebase to an enterprise-grade standard, the UX and architecture must prioritize elite cognitive science over cheap gamification. The goal is frictionless, maximum-efficiency learning. Follow this 5-Phase Plan strictly:
1. **Architectural Detox:** Extract logic from massive files (`Study.jsx`, `Writing.jsx`) into custom hooks to prepare the surface for functional UI polish.
2. **Interleaved Practice:** Build dynamic study sessions that mix FSRS flashcards, writing, and speaking to maintain novelty and build neural pathways.
3. **Adaptive Scaffolding (Desirable Difficulty):** Tune AI evaluators to dynamically lower cognitive load when a student struggles, preventing burnout.
4. **Frictionless UX & Deep Work:** Use `framer-motion` for smooth, functional transitions. Implement a distraction-free "Theater Mode" for heavy tasks.
5. **Tight Feedback Loops:** Ensure every mistake visually and instantly routes into the Mistake Journal and FSRS pipeline, creating intrinsic dopamine from tangible progress.

## AI Agent Mindset & Execution Guidelines

To maintain an elite, enterprise-grade codebase, all AI agents (including Claude Code CLI) working in this repository MUST adopt the following operational mindset:

1. **Deep Research First**: Before writing any code, always perform a thorough search (`grep` or find) across the codebase to map how variables, types, and hooks are integrated globally. Never assume line numbers or patterns.
2. **Surgical Diffs Only**: Write clean, isolated modifications. Avoid rewriting full files or deleting existing unrelated code blocks, inline comments, or type definitions.
3. **Strict Linting Gate**: After every file change, immediately run `npm run lint`. You must proactively fix any linter warnings or syntax errors before proposing the code as finished.
4. **Unit Test Verification**: Run `npm run test:run` after every major state-level or scheduling logic edit. Ensure 100% of the FSRS and grading tests pass successfully before committing.
5. **Clear Commit Hygiene**: Group your modifications into clean, descriptive commits (e.g., `fix(security)`, `fix(roleplay)`, `perf(dashboard)`) describing *what* changed and *why*.
6. **Bilingual Awareness**: Always respect that learning surfaces are bilingual. Ensure changes do not break MS/EN toggles or leak layout classes across languages.
