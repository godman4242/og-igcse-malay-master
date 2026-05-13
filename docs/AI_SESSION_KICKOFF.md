# The "Baby Steps" AI Session Kickoff Guide

Treat this file as your personal "cheat sheet". Every time you start a new chat with Claude (or any other AI), copy and paste the prompt below. 

This ensures the AI instantly knows the rules, the architecture, and exactly what to do.

---

## 1. The Perfect Kickoff Prompt

**Copy and paste this exactly as it is written as your FIRST message in a new session:**

```text
Hello! You are the Senior Architect for my project, the "IGCSE Malay Master" web application.

Here are the strict rules you must follow for this entire session:
1. READ BEFORE CODING: Start by reading `RESUME_HERE.md` and `docs/improvements.md`. Do not write any code until you tell me what those files say is our current priority.
2. ARCHITECTURE RULE: We are using a SINGLE CODEBASE architecture. Do not suggest making a separate repo or project for different users. We use Supabase Auth to hide premium features, while keeping basic features available via localStorage for guests.
3. THE "ADHD" RULE: Keep UX extremely clean. Avoid hard timers, avoid losing user data if they get distracted, and build continuous, flowing interfaces.
4. ATOMIC COMMITS: If you write code that works, you MUST commit it immediately using my terminal. Do not give me 4 files of changes at once without committing the first step.

Please confirm you understand these rules, tell me what you learned from `RESUME_HERE.md`, and suggest the exact next step we should take.
```

---

## 2. Tools & Commands You Should Always Have the AI Use

When you talk to Claude (especially Claude via terminal or an MCP server), it has access to tools. If it starts acting dumb, tell it: **"Use your tools!"**

*   **For reading the project plan:** Tell it to use `view_file` on `RESUME_HERE.md` and `docs/PLANS_STATUS.md`.
*   **For making changes:** Tell it to use `multi_replace_file_content` instead of just giving you copy-paste code. Make the AI do the manual labor.
*   **For Git Commits:** Tell it to use `run_command` to run `git status`, `git add .`, and `git commit -m "..."`. You should never have to commit manually if the AI does its job right.

## 3. How to use this `improvements.md` file

I have created `docs/improvements.md` for you. Here is how you use it:
1. Whenever an AI gives you an idea, say: *"Does this conflict with the rules in `docs/improvements.md`? Check it."*
2. If the AI breaks the Single Codebase rule, say: *"Read `docs/improvements.md` Phase 3. You are making the Two-Repo Trap mistake."*

You are the **Director**. The AI is your **Typist**. Point to your plans, and make the AI follow them!
