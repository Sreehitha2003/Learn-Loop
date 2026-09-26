# LearnLoop

A personal website that tells you what to learn in AI this week, tuned to your
role (engineer, PM, designer, leader, student…) and experience (new to AI →
advanced). It rebuilds itself every morning at 7:50 AM IST from the latest AI
news, model launches and MCP updates.

## What's on it

- **Start here this week:** your top three topics, why they matter now, your
  next step at your level, and where to study.
- **Worth your time today:** the news stories most relevant to your role.
- **Your learning path:** all 17 topics (LLM basics, context engineering, coding
  agents, agents, MCP, skills, tool use, RAG, evals, open models, multimodal,
  cost, fine-tuning, security, AI UX, strategy, AI at work) ordered Now / Next /
  Later / Optional, each with an explanation and study links filtered to your level.
- **The model landscape:** who's shipping what.
- **All AI news:** 45 days of stories, filterable by topic.

Your role and level are remembered in your browser. Anyone you share the link
with can pick their own.

## Set it up (10 minutes, once)

Same steps as IPO Radar:

1. Create a **public** repository, e.g. `learnloop`.
2. Upload everything in this folder (show hidden files so `.github` comes along;
   or create `.github/workflows/daily.yml` by hand and paste its contents).
3. Settings › Pages › Source: **GitHub Actions**.
4. Settings › Actions › General › Workflow permissions: **Read and write**.
5. Actions › "Daily AI learning update" › **Run workflow**.

Your site: `https://YOUR-USERNAME.github.io/learnloop/`

## How it stays current

- **Automatic, daily:** news from OpenAI, Google AI, Google DeepMind, Hugging Face,
  the MCP blog, Simon Willison, Latent Space, MIT Technology Review, The Verge,
  Hacker News and Google News searches for Anthropic, MCP and new model launches.
  Each story is tagged with learning topics, and topics getting more coverage
  than last week move up your path and get a "Trending" label.
- **By hand, occasionally:** the topic explanations, study links and model
  landscape live in `data/curriculum.json`. Edit it on GitHub, or ask Claude to
  refresh it, when something big changes. News feeds are listed in `data/feeds.json`.

If a news source changes or blocks the robot, the others still work, and the
footer shows which sources succeeded that day.

## Files

- `scripts/build.mjs`: reads the feeds, tags stories, builds the page
- `site/template.html`: the page
- `data/curriculum.json`: topics, roles, levels, study links, models
- `data/feeds.json`: news sources
- `data/news.json`: saved stories (updated daily)
- `.github/workflows/daily.yml`: the 7:50 AM IST daily run
