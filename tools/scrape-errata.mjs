// scrape-errata.mjs — ws-tcg 에라타 페이지를 구조화 JSON으로 저장
//
//   node tools/scrape-errata.mjs
//
// 출력: sources/errata.ja.json  (일본판 원본 구조: 최신순, 항목별 필드)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "sources", "errata.ja.json");
const URL = "https://ws-tcg.com/rules/errata/";

const decode = (s) => s
  .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const stripTags = (h) => decode(h.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim();

const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error("fetch 실패: " + res.status);
const html = await res.text();

// 요약 테이블: post-id → 교환 기간(날짜)
const dateByPost = {};
for (const tr of html.matchAll(/<tr class="js-errata-row([^"]*)"[^>]*data-post-id="(\d+)"[\s\S]*?<\/tr>/g)) {
  const tds = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
  dateByPost[tr[2]] = { status: tr[1].trim(), no: tds[0] || "", name: tds[1] || "", period: tds[2] || "" };
}

// 상세 블록 파싱
const blocks = html.split(/(?=<div class="errata__listsBlock)/).slice(1);
const entries = [];
for (const blk of blocks) {
  const id = (blk.match(/id="er(\d+)"/) || [])[1];
  if (!id) continue;
  const status = (blk.match(/errata__listsBlock\s+(\w+)/) || [, ""])[1];
  const heading = stripTags((blk.match(/<h3>([\s\S]*?)<\/h3>/) || [, ""])[1]);
  const innerRaw = (blk.match(/errata__listsInner"?>([\s\S]*?)<\/div>\s*<\/div>/) || [, ""])[1] || blk;
  const images = [...innerRaw.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  const paras = [...innerRaw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1])).filter(Boolean);

  const cards = [];
  const fields = { 修正内容: "", 修正理由: "", カード交換: "", その他: [] };
  for (const p of paras) {
    if (/カードNo|カード名称|カード番号/.test(p)) {
      const no = (p.match(/カード(?:No|番号)[.．]?\s*[:：]\s*([^\n]+)/) || [, ""])[1].trim();
      const nm = (p.match(/カード名称\s*[:：]\s*([^\n]+)/) || [, ""])[1].trim();
      if (no || nm) cards.push({ no, name: nm });
    } else if (/^▼?修正内容/.test(p)) fields.修正内容 = p.replace(/^▼?修正内容\s*/, "").trim();
    else if (/^▼?修正理由/.test(p)) fields.修正理由 = p.replace(/^▼?修正理由\s*/, "").trim();
    else if (/^▼?カード交換/.test(p)) fields.カード交換 = p.replace(/^▼?カード交換に関して\s*/, "").trim();
    else if (p.trim()) fields.その他.push(p.trim());
  }
  entries.push({ id, status, heading, cards, images, ...fields,
    period: dateByPost[id]?.period || "" });
}

fs.writeFileSync(OUT, JSON.stringify(entries, null, 1));
console.log(`✔ ${entries.length}개 에라타 항목 → ${path.relative(ROOT, OUT)}`);
console.log(`   카드 참조 ${entries.reduce((n, e) => n + e.cards.length, 0)}건, 상태: ` +
  Object.entries(entries.reduce((a, e) => (a[e.status] = (a[e.status]||0)+1, a), {})).map(([k,v])=>`${k||"?"}=${v}`).join(" "));
console.log("샘플[0]:", JSON.stringify(entries[0], null, 1).slice(0, 500));
