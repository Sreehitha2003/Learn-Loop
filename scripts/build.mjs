// Daily build: read AI news feeds, tag each story with learning topics, keep 45 days of history,
// work out which topics are trending, and render the personalised site. No API keys, no dependencies.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const ROOT = new URL("..", import.meta.url);
const P = (p) => new URL(p, ROOT);
const readJson = async (p, d) => { try { return JSON.parse(await readFile(P(p), "utf8")); } catch { return d; } };
const nowIST = new Date(Date.now() + 5.5 * 3600e3);
const TODAY = nowIST.toISOString().slice(0, 10);
const STAMP = nowIST.toISOString().slice(0, 16).replace("T", " ") + " IST";
const daysAgo = (d) => (new Date(TODAY) - new Date(d)) / 864e5;

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: "–", mdash: "—", hellip: "…" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m);
const strip = (s) => decode(decode(String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };

/** Items from RSS 2.0 or Atom. */
export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = strip(tag(b, "link"));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i); link = m ? m[1] : ""; }
    const date = strip(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    const d = new Date(date);
    const title = strip(tag(b, "title"));
    if (!title || !link) continue;
    const sum = strip(tag(b, "description") || tag(b, "summary") || tag(b, "content")).slice(0, 260);
    items.push({ t: title, u: link.trim(), d: isNaN(d) ? TODAY : new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10), sum });
  }
  return items;
}

// Words that make a story about AI at all (filters general tech feeds).
const AI_WORDS = /\b(ai|a\.i\.|llm|llms|gpt|claude|gemini|anthropic|openai|deepmind|mcp|model|models|agent|agents|agentic|machine learning|neural|chatbot|copilot|transformer|inference|hugging face|llama|qwen|deepseek|mistral)\b/i;
function topicsFor(text, topics) {
  const t = " " + text.toLowerCase() + " ";
  const esc = (k) => k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return topics.filter((tp) => tp.keywords.some((k) => new RegExp("(^|[^a-z0-9])" + esc(k)).test(t))).map((tp) => tp.id);
}
const NEW_MODEL = /\b(introduc|launch|releas|unveil|announc|debut|rolls? out|now available)/i;

async function get(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; LearnLoopBot/1.0; +https://github.com)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status); return await r.text();
  } finally { clearTimeout(t); }
}
const FIXTURES = process.env.FEED_FIXTURES;
async function fetchFeed(f, i) {
  if (FIXTURES) return readFile(`${FIXTURES.replace(/\/$/, "")}/${i}.xml`, "utf8");
  return get(f.url);
}

async function main() {
  const cur = await readJson("data/curriculum.json", null);
  const feeds = await readJson("data/feeds.json", []);
  const old = await readJson("data/news.json", []);
  const health = [];
  const fresh = [];
  for (const [i, f] of feeds.entries()) {
    try {
      let items = parseFeed(await fetchFeed(f, i)).filter((x) => AI_WORDS.test(x.t + " " + x.sum) && daysAgo(x.d) <= 14);
      if (f.max) items = items.slice(0, f.max);
      items.forEach((x) => { x.src = f.name.replace(/^News: .*/, "") || (x.t.match(/ - ([^-]+)$/)?.[1] ?? "News"); if (f.name.startsWith("News:")) x.t = x.t.replace(/ - [^-]+$/, ""); });
      fresh.push(...items); health.push({ source: f.name, ok: true, items: items.length });
    } catch (e) { health.push({ source: f.name, ok: false, error: String(e.message || e) }); }
  }
  console.log("Feeds:", health.map((h) => `${h.source}: ${h.ok ? h.items : "failed"}`).join(", "));

  // Merge, de-duplicate by link and by near-identical title, keep 45 days.
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 3).slice(0, 8).join(" ");
  const seen = new Set(), all = [];
  for (const x of [...fresh, ...old]) {
    const k1 = x.u.split("?")[0], k2 = norm(x.t);
    const k = k1 + "|" + k2;
    if (seen.has(k) || (k2 && seen.has(k2))) continue;
    seen.add(k); if (k2) seen.add(k2);
    if (daysAgo(x.d) > (x.seed ? 90 : 45)) continue;
    x.topics = topicsFor(x.t + " " + (x.sum || ""), cur.topics);
    x.launch = NEW_MODEL.test(x.t) && /\b(model|gpt|claude|gemini|llama|qwen|deepseek|grok|mistral|kimi|glm)\b/i.test(x.t);
    x.firstSeen ??= TODAY;
    all.push(x);
  }
  all.sort((a, b) => (b.d > a.d ? 1 : b.d < a.d ? -1 : 0));
  const news = all.slice(0, 400);

  // Trending: stories per topic this week vs the week before.
  const trend = {};
  for (const tp of cur.topics) {
    const wk = news.filter((x) => x.topics.includes(tp.id) && daysAgo(x.d) <= 7).length;
    const prev = news.filter((x) => x.topics.includes(tp.id) && daysAgo(x.d) > 7 && daysAgo(x.d) <= 14).length;
    trend[tp.id] = { week: wk, prev, hot: wk >= 3 && wk >= prev * 1.5 };
  }

  await writeFile(P("data/news.json"), JSON.stringify(news, null, 1));
  if (process.env.FEED_SEED) health.length = 0;
  await writeFile(P("data/health.json"), JSON.stringify({ date: TODAY, health }, null, 1));
  const data = { today: TODAY, stamp: STAMP, curriculum: cur, news, trend, health };
  const tpl = await readFile(P("site/template.html"), "utf8");
  await mkdir(P("site/out/"), { recursive: true });
  await writeFile(P("site/out/index.html"), tpl.replace("/*__DATA__*/null", JSON.stringify(data).replace(/</g, "\\u003c")));
  console.log(`Built ${TODAY}: ${news.length} stories (${fresh.length} fetched today).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
