<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 🌑 Shadow AI — The Last-Minute Life Saver

**Deadline panic, meet your rescue plan. Shadow AI turns "I'm so behind" into a concrete, time-boxed sequence of next moves — in seconds.**

![Shadow AI](https://img.shields.io/badge/Shadow_AI-Deadline_Rescue-FF003C?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express)
![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Deployed-4285F4?style=for-the-badge&logo=googlecloud)
![Hackathon](https://img.shields.io/badge/Vibe2Ship-Hackathon_2026-FFD700?style=for-the-badge)

[**🔗 Live App**](https://shadow-ai-deadline-rescue-671773890045.asia-southeast1.run.app) · [**🧪 AI Studio Sandbox**](https://aistudio.google.com/apps/2dd1f5de-2ec0-4a06-84d5-011d44538277?showPreview=true&showAssistant=true) · [**💻 Repository**](https://github.com/Sanchita-InLoop/Shadow-AI-cloudrun)

</div>

---

## 🚨 The Problem

**Challenge brief: The Last-Minute Life Saver** — Students, professionals, and entrepreneurs routinely miss deadlines, assignments, meetings, and commitments. The tools they already have lean on passive reminders that are easy to swipe away and offer no real help in actually getting the work done.

**The ask:** build an AI productivity companion that proactively helps people plan, prioritize, and finish — not just remember.

> A calendar ping doesn't tell you what to physically do in the next 20 minutes when three deadlines collide. **Shadow AI does.**

---

## 💡 What Shadow AI Does

Shadow AI is an agentic deadline-rescue companion, not a to-do list with notifications bolted on. Feed it your active deadlines, and it actively steps in to rescue your schedule:

- **Server-side urgency evaluation** — every tracked task is re-scored on the backend, never trusting client-side ordering, and overdue items always come first.
- **Automatic panic mode** — a live urgency rating triggers "Panic Mode" once time-remaining thresholds and stated priority cross a line.
- **Time-budgeted execution** — the backend works out a realistic time allocation from the actual time remaining *before* the AI is ever called, so a deadline three days out doesn't hijack your whole schedule.
- **Gemini-driven action steps** — Gemini generates 1–3 concrete, sequenced micro-tasks per deadline, sized to match the task's real complexity.
- **Server-side safety clamping** — if the model's output drifts past the computed time budget, the backend proportionally rescales durations as a defensive net.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| ⚡ Instant Rescue Plan | Set a Primary Focus target plus any Secondary Conflicts, hit **Engage Rescue Engine**, and get a concrete, sequenced timeline in seconds. |
| 🔥 SYS_CRITICALITY_LEVEL | A live status readout (e.g. `DYNAMIC ESTIMATING` → `CRITICAL`) tracks how serious your overall situation is, and flips on `PANIC_MODE_ARMED` automatically as deadlines close in or pass. |
| 🎯 Primary Focus + Secondary Conflicts | Designate one core, absolute high-importance driver as your Primary Focus, then log every other looming obligation as a Secondary Conflict — each with its own due time and priority. |
| 🤖 Agentic Task Breakdown | The AI works inside a server-calculated time ceiling matched to real task complexity — no padding, no filler. |
| 🧭 Sequenced Step Deployment | Each rescue plan is broken into numbered, time-boxed steps (e.g. "1. Export Curves and Tables — 40m") with a **Tactical Action Directive** explaining exactly what to do. |
| ⏱️ Shadow Scheduler Timeline | An Active Plan view tracks timeline progression (e.g. "0% complete, 0 of 6 micro-tasks done") and shows total estimated dispatched time remaining across the whole plan. |
| 🔥 Pomodoro Burst Mode | Each step loads into a focused countdown burst (e.g. 40:00) with Start/Reset controls, so you work one micro-task at a time instead of staring at a wall of tasks. |
| ✏️ Inline Deadline Editing | Edit target parameters, add/edit/delete secondary conflicts, or discard and regenerate the active plan at any time. |
| 🌗 Light / Dark Theme | Tactical dark mode by default, clean light mode as an alternative, same urgency color language throughout. |
| 🔊 Synthesized Audio & Alarm Sync | Web Audio API–generated alarm tones and progress pings, plus a Test Alarm Sync control — no external audio assets needed. |
| 🛡️ Graceful Failure Handling | Rate-limit detection with parsed wait times and clear messaging when the backend is unreachable. |

---

## 🛠️ Technologies & Google Ecosystem

### Full-Stack Architecture
- **React 19 + Vite** — fast UI, built and served as optimized static assets.
- **Node.js + Express 4** — REST API and static file server, unified into a single deployable service.
- **TypeScript** — strictly typed across both client and server.
- **Tailwind CSS** — powers the tactical dark and light themes.
- **esbuild** — bundles the Express server into a single production CommonJS file for fast, dependency-light startup.

### Built with Google AI Studio & Cloud Run

| Google Technology | How It's Used |
| :--- | :--- |
| **Gemini API (`gemini-3.5-flash`)** | Powers the core agent that generates time-budgeted rescue plans via the official `@google/genai` SDK, using `responseSchema`-constrained structured JSON output. |
| **Google AI Studio** | Used to build, prototype, and iterate on the app via chat-driven workspace prompting and seamless environment export. |
| **Google Cloud Run** | The whole app — frontend and backend — deploys as a single containerized service, built automatically via Cloud Buildpacks straight from AI Studio. |

---

## 🏗️ Architecture Flow

```
User
  │
  ▼
Single Cloud Run Service
  │
  ├── Express serves the built React UI (static assets from /src)
  │     (track deadlines, view live countdowns, toggle theme, run Pomodoro timer)
  │
  └── Express API routes (/api/rescue)
        ├── Urgency & Panic Score Calculator (local, no API overhead)
        ├── Cross-Task Urgency Sorter
        ├── Time-Budget Calculator (per task, computed before the AI call)
        ├── Gemini API Integration (structured JSON output)
        └── Server-Side Duration Safety Net (clamps AI output to budget)
              │
              ▼
        Gemini 3.5 Flash
        (generates 1–3 sequenced micro-tasks per deadline)
```

---

## 🧠 How the Agent Decides What's Urgent

Urgency isn't just "closest deadline wins." The local execution engine weighs several factors before anything is rendered:

1. **Overdue validation** — any overdue task always overrides normal sorting and takes absolute priority.
2. **Threshold breakdown** — hours remaining until the closest deadline, measured against fixed intervals (6h / 12h / 24h / 48h).
3. **Stated user priority** — explicit High / Medium / Low priority is factored in for tasks outside the immediate 24-hour crisis window.

This computed urgency score is what calibrates the time budget handed to Gemini, keeping the generated micro-tasks tight, sustainable, and realistic to actually execute.

---

## 📦 Getting Started

### Prerequisites
- Node.js v18+
- A Gemini API key — free at [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repository
```bash
git clone https://github.com/Sanchita-InLoop/Shadow-AI-cloudrun.git
cd Shadow-AI-cloudrun
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the project root:
```
GEMINI_API_KEY=your_api_key_here
```

### 4. Run the application

**Development mode** (Vite hot-reloading with backend middleware support):
```bash
npm run dev
```
Then open `http://localhost:5173`.

**Production build & run** (compiles the frontend and bundles the server with esbuild):
```bash
npm run build
npm start
```
The app runs from the production bundle at `dist/server.cjs`.

---

## 📁 Project Structure

```
Shadow-AI-cloudrun/
├── assets/
│   └── .aistudio/        # Google AI Studio workspace configurations
├── src/                  # React 19 frontend source
├── .env.example          # Sample environment configuration
├── .gitignore
├── index.html            # HTML entry point
├── metadata.json         # Workspace project metadata
├── package.json          # Dependencies and build/start scripts
├── package-lock.json
├── server.ts             # Express server — hosts UI assets & Gemini API endpoints
├── tsconfig.json
└── vite.config.ts
```

---

## 👤 Author

**Sanchita** — [@Sanchita-InLoop](https://github.com/Sanchita-InLoop)

Built with 🧠 for the Vibe2Ship Hackathon 2026 🚀
