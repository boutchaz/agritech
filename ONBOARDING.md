# Welcome to AgroGina

## How We Use Claude

Based on boutchaz's usage over the last 30 days:

Work Type Breakdown:
  Build Feature    ████████░░░░░░░░░░░░  45%
  Debug & Fix      ███████░░░░░░░░░░░░░  37%
  Plan & Design    ██░░░░░░░░░░░░░░░░░░  10%
  Improve Quality  █░░░░░░░░░░░░░░░░░░░   6%
  Analyze Data     ░░░░░░░░░░░░░░░░░░░░   2%

Top Skills & Commands:
  /reespec-discover  █████████████████░░░  5x/month
  /agri-expert       ███████░░░░░░░░░░░░░  2x/month
  /review            ███████░░░░░░░░░░░░░  2x/month
  /ask-agronomist    ███████░░░░░░░░░░░░░  2x/month
  /investigate       ████░░░░░░░░░░░░░░░░  1x/month

Top MCP Servers:
  context7 (Context7)  ████████████████████  6 calls
  ide                  ███░░░░░░░░░░░░░░░░░  1 call

## Your Setup Checklist

### Codebases
- [ ] agritech — github.com/boutchaz/agritech (monorepo: frontend, NestJS API, FastAPI satellite service, mobile app, admin tools)

### MCP Servers to Activate
- [ ] Context7 — Pulls up-to-date library docs and examples on demand. Install the context7 MCP server from the plugin registry.
- [ ] IDE — Bridges Claude Code with your editor for diagnostics and inline code execution. Comes with the VS Code / JetBrains extension.

### Skills to Know About
- `/reespec-discover` — Discovery mode for new feature requests. Use it before writing any code to challenge assumptions and explore the problem space.
- `/reespec-plan` — Generates implementation plans with RED/GREEN checklists after discovery is done.
- `/agri-expert` — Consult an AI agronomist for crop, soil, irrigation, or pest questions. Useful when working on calibration or phenology features.
- `/ask-agronomist` — Quick agronomist consultation, same domain but lighter weight.
- `/review` — Pre-landing code review. Run it before merging to catch multi-tenancy leaks, security issues, and pattern violations.
- `/investigate` — Structured debugging. Use when you hit a bug — it forces root-cause analysis before any fix.
- `/data-scientist` — Satellite imagery analysis, yield prediction, statistical modeling. Use when working on the satellite/calibration pipeline.
- `/office-hours` — YC-style brainstorming for product ideas and feature validation.
- `/charlie` — CFO mode for unit economics, runway, and financial planning.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
