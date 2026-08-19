# Job Match

Personal project for ASE-26 (Agentic Software Engineering), HIT.

Keep a skills profile. Paste job ads one at a time. Each ad is broken into structured
requirements, checked against the profile, and added to a list ranked by how well it
matches — so the next application goes to the ad most worth the effort.

## Documents

| File | What it holds |
|---|---|
| [`docs/FRAMING.md`](docs/FRAMING.md) | The problem, stakeholders, definition of done, out of scope |
| [`docs/SPEC.md`](docs/SPEC.md) | The specification in five parts |
| [`CLAUDE.md`](CLAUDE.md) | How work is done here: stack, standards, gates |
| [`docs/PROMPTS.md`](docs/PROMPTS.md) | Every substantial prompt given to the agent |
| [`docs/LESSONS.md`](docs/LESSONS.md) | What each spiral turn taught |

## Stack

Node.js / Express, MongoDB, React (Vite, plain JavaScript), OpenRouter. No TypeScript.

## Running it

Copy `.env.example` to `.env` and fill in `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
and `MONGODB_URI`.

```
cd server && npm install && npm run dev   # http://localhost:3000
cd client && npm install && npm run dev   # http://localhost:5173, proxies /api to the server
```

Run the server's tests with `cd server && npm test`.