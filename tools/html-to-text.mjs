// html-to-text.mjs — 덱룰/페널티 등 정적 HTML 페이지의 본문을 구조화 텍스트로 추출
//   node tools/html-to-text.mjs <입력.html> <출력.txt> [본문시작정규식]
// 헤딩(#), 목록(-), 표(| ), 문단을 순서대로 남긴다.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [inp, out] = process.argv.slice(2);
let html = fs.readFileSync(path.join(ROOT, inp), "utf8");

// 본문 영역만: <main> 또는 article 컨테이너 우선, 없으면 전체
const main = html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<div[^>]*(?:contents|article|rules)[^>]*>[\s\S]*<\/div>/i);
if (main) html = main[0];
// 스크립트/스타일 제거
html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#039;|&#8217;/g, "'");
const clean = (s) => decode(s.replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

const lines = [];
// 토큰 순서대로 처리
const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<li[^>]*>([\s\S]*?)<\/li>|<tr[^>]*>([\s\S]*?)<\/tr>|<p[^>]*>([\s\S]*?)<\/p>|<(?:div)[^>]*class="[^"]*accordionTitle[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
let m;
while ((m = re.exec(html))) {
  if (m[1]) { const t = clean(m[2]); if (t) lines.push(`\n${"#".repeat(+m[1][1])} ${t}`); }
  else if (m[3] != null) { const t = clean(m[3]); if (t) lines.push(`- ${t}`); }
  else if (m[4] != null) { const cells = [...m[4].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1])); if (cells.some(Boolean)) lines.push(`| ${cells.join(" | ")} |`); }
  else if (m[5] != null) { const t = clean(m[5]); if (t) lines.push(t); }
  else if (m[6] != null) { const t = clean(m[6]); if (t) lines.push(`\n### ${t}`); }
}
const text = lines.join("\n").replace(/\n{3,}/g, "\n\n");
fs.writeFileSync(path.join(ROOT, out), text);
console.log(`✔ ${out} — ${text.split(/\n/).length}행, ${text.length}자`);
console.log(text.slice(0, 700));
