// build-site.mjs — docs/*.md + GLOSSARY.md → 자체완결 정적 사이트(site/index.html)
//   node tools/build-site.mjs
// 의존성 없음(Node 내장만). 출력은 인라인 CSS/JS 단일 HTML → GitHub Pages/로컬/Artifact 어디든 사용.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ── 문서 목록 (일본판 구성 순서) ──────────────────────────
const DOCS = [
  { group: "플로어 룰(대회 매너)", id: "floor-basic", title: "기본 플로어 룰", file: "docs/floor-rule/basic.md" },
  { group: "플로어 룰(대회 매너)", id: "floor-adv", title: "응용 플로어 룰", file: "docs/floor-rule/advanced.md" },
  { group: "종합 룰(룰북)", id: "rb-00", title: "종합 룰 개요", file: "docs/rulebook/00-표지-목차.md" },
  { group: "종합 룰(룰북)", id: "rb-01", title: "1. 게임 개요", file: "docs/rulebook/01-게임-개요.md" },
  { group: "종합 룰(룰북)", id: "rb-02", title: "2. 카드 정보", file: "docs/rulebook/02-카드-정보.md" },
  { group: "종합 룰(룰북)", id: "rb-03", title: "3. 게임의 영역", file: "docs/rulebook/03-게임-영역.md" },
  { group: "종합 룰(룰북)", id: "rb-04", title: "4. 기초 용어", file: "docs/rulebook/04-기초-용어.md" },
  { group: "종합 룰(룰북)", id: "rb-05", title: "5. 게임의 준비", file: "docs/rulebook/05-게임-준비.md" },
  { group: "종합 룰(룰북)", id: "rb-06", title: "6. 게임의 진행", file: "docs/rulebook/06-게임-진행.md" },
  { group: "종합 룰(룰북)", id: "rb-07", title: "7. 어택과 배틀", file: "docs/rulebook/07-어택과-배틀.md" },
  { group: "종합 룰(룰북)", id: "rb-08", title: "8. 플레이와 해결", file: "docs/rulebook/08-플레이와-해결.md" },
  { group: "종합 룰(룰북)", id: "rb-09", title: "9. 룰 처리", file: "docs/rulebook/09-룰-처리.md" },
  { group: "종합 룰(룰북)", id: "rb-10", title: "10. 키워드 능력", file: "docs/rulebook/10-키워드-능력.md" },
  { group: "종합 룰(룰북)", id: "rb-11", title: "11. 기타", file: "docs/rulebook/11-기타.md" },
  { group: "Q&A", id: "qa", title: "일반 룰", file: "docs/qa/general/README.md" },
  { group: "Q&A", id: "qa-cards", title: "카드 지정", file: "docs/qa/cards/README.md" },
  { group: "그 외 자료", id: "errata", title: "에라타 카드 리스트", file: "docs/errata/README.md" },
  { group: "그 외 자료", id: "deck", title: "덱 구축 규칙", file: "docs/deck-rule/README.md" },
  { group: "그 외 자료", id: "penalty", title: "페널티 이력", file: "docs/penalty/README.md" },
  { group: "참고", id: "glossary", title: "용어 글로서리", file: "GLOSSARY.md" },
];

// ── 최소 마크다운 → HTML 변환기 (이 리포의 마크다운 구성에 특화) ──
const inline = (s) =>
  s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">🖼 $1</a>')
   .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|#[^)]*|mailto:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
   .replace(/(^|[^"(>])\b(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
   .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
   .replace(/`([^`]+)`/g, "<code>$1</code>");

// 저작권 문제로 이미지는 넣지 않는다 — 이미지 마크다운은 대체 텍스트만 표시
const embedImg = (alt) => (alt ? `<p><em>(${alt})</em></p>` : "");

function mdToHtml(md, baseDir = ".") {
  md = md.replace(/<!--[\s\S]*?-->/g, "");           // 주석 제거
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0, para = [];
  const flushPara = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
  while (i < lines.length) {
    let ln = lines[i];
    // 블록 이미지(자체 줄) → 로컬은 data URI 임베드
    let im = ln.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (im) { flushPara(); out.push(embedImg(im[1], im[2], baseDir)); i++; continue; }
    // 원문 raw HTML 블록 (details/summary 등) — 그대로 통과
    if (/^\s*<(details|\/details|summary|\/summary|div|\/div)/.test(ln)) { flushPara(); out.push(ln); i++; continue; }
    // 표
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      flushPara();
      const head = ln.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())); i++;
      }
      out.push("<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>");
      continue;
    }
    // 헤딩
    let m = ln.match(/^(#{1,6})\s+(.*)$/);
    if (m) { flushPara(); const l = m[1].length; out.push(`<h${l}>${inline(m[2].trim())}</h${l}>`); i++; continue; }
    // 수평선
    if (/^\s*---+\s*$/.test(ln)) { flushPara(); out.push("<hr>"); i++; continue; }
    // 인용
    if (/^\s*>\s?/.test(ln)) {
      flushPara(); const q = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>"); continue;
    }
    // 목록 (2칸 들여쓰기 = 중첩)
    if (/^(\s*)[-*]\s+/.test(ln)) {
      flushPara();
      const stack = []; // 열린 깊이
      while (i < lines.length && /^(\s*)[-*]\s+/.test(lines[i])) {
        const mm = lines[i].match(/^(\s*)[-*]\s+(.*)$/);
        const depth = Math.floor(mm[1].length / 2);
        while (stack.length <= depth) { out.push("<ul>"); stack.push(1); }
        while (stack.length - 1 > depth) { out.push("</ul>"); stack.pop(); }
        out.push("<li>" + inline(mm[2]) + "</li>");
        i++;
      }
      while (stack.length) { out.push("</ul>"); stack.pop(); }
      continue;
    }
    // 빈 줄
    if (/^\s*$/.test(ln)) { flushPara(); i++; continue; }
    // 일반 문단
    para.push(ln.trim()); i++;
  }
  flushPara();
  return out.join("\n");
}

// ── 섹션 빌드 ─────────────────────────────────────────────
// Q&A 섹션: 각 항목을 .qa-item으로 감싸고 상단에 필터 입력 추가(항목이 많아 검색 필요)
const wrapQa = (html) => {
  const parts = html.split(/(?=<h2)/);
  const intro = parts[0] || "";
  const items = parts.slice(1).map((p) => `<div class="qa-item">${p}</div>`).join("");
  return intro + `<input class="qa-filter" placeholder="이 목록에서 검색 (카드명·키워드)…" oninput="qaFilter(this)"><p class="qa-count"></p>` + items;
};
const sections = DOCS.map((d) => {
  let html;
  try { html = mdToHtml(rd(d.file), path.dirname(d.file)); }
  catch { html = `<p><em>(${d.file} 없음)</em></p>`; }
  if (d.id === "qa" || d.id === "qa-cards") html = wrapQa(html);
  return { ...d, html };
});

const errataCount = (rd("docs/errata/README.md").match(/^## /gm) || []).length;

// 홈(소개) 섹션
const home = `<h1>바이스슈발츠 룰 한글화</h1>
<p><a href="https://ws-tcg.com/rules/" target="_blank" rel="noopener">ws-tcg.com/rules</a> 의 일본판 자료(종합 룰·에라타·덱 구축 규칙·Q&A·플로어 룰·페널티)를 <strong>일본판 구성에 최대한 맞춰</strong> 한국어로 옮긴 팬 번역입니다.</p>
<blockquote>팬 제작 <strong>비공식·비영리</strong> 참고 자료입니다. 룰·데이터 출처 ⓒ BushiRoad / <a href="https://ws-tcg.com/" target="_blank" rel="noopener">ws-tcg.com</a>.</blockquote>
<table><thead><tr><th>자료</th><th>내용</th></tr></thead><tbody>
<tr><td>종합 룰(룰북)</td><td>ver.1.113 · 11장 (673섹션)</td></tr>
<tr><td>에라타</td><td>${errataCount}항목</td></tr>
<tr><td>덱 구축 규칙</td><td>170작품 + 제한 리스트</td></tr>
<tr><td>Q&amp;A(일반 룰)</td><td>97건</td></tr>
<tr><td>플로어 룰</td><td>기본 + 응용(10部)</td></tr>
<tr><td>페널티 이력</td><td>23건</td></tr>
</tbody></table>
<p>왼쪽 메뉴에서 문서를 선택하세요. <strong>상단 검색창</strong>에 단어를 넣으면 모든 문서(종합 룰·Q&amp;A·플로어 룰·에라타 등)에서 찾아 목록으로 보여 줍니다. 키보드 <code>/</code> 로 바로 검색창에 들어갈 수 있습니다.</p>
<hr>
<p style="color:var(--muted);font-size:.92em"><strong>출처</strong> — 원문 룰/Q&amp;A 페이지: <a href="https://ws-tcg.com/rules/" target="_blank" rel="noopener">https://ws-tcg.com/rules/</a></p>`;

// 사이드바 그룹
const groups = [];
for (const s of sections) {
  let g = groups.find((x) => x.name === s.group);
  if (!g) { g = { name: s.group, items: [] }; groups.push(g); }
  g.items.push(s);
}
const navHtml = `<a class="nav-link" data-target="home" href="#home">소개</a>` +
  groups.map((g) => `<div class="nav-group"><div class="nav-group-title">${g.name}</div>` +
    g.items.map((s) => `<a class="nav-link" data-target="${s.id}" href="#${s.id}">${s.title}</a>`).join("") + `</div>`).join("");

const sectionsHtml = `<section id="home" class="doc">${home}</section>` +
  `<section id="search" class="doc" hidden><div id="sres"></div></section>` +
  sections.map((s) => `<section id="${s.id}" class="doc" hidden>${s.html}</section>`).join("\n");

// 전체 검색: 결과는 사이드바 순서가 아니라 이 그룹 순서로 보여 준다(룰 질문은 종합 룰이 먼저 필요하므로)
const SEARCH_GROUP_ORDER = ["종합 룰(룰북)", "Q&A", "플로어 룰(대회 매너)", "그 외 자료", "참고"];
const searchMeta = [...sections]
  .sort((a, b) => SEARCH_GROUP_ORDER.indexOf(a.group) - SEARCH_GROUP_ORDER.indexOf(b.group))
  .map((s) => ({ id: s.id, title: s.title, group: s.group.replace(/\(.*\)$/, "") }));

const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>바이스슈발츠 룰 한글화</title>
<meta name="description" content="바이스슈발츠 종합 룰·에라타·Q&A·플로어 룰 한글 번역(팬 비공식)">
<style>
/* 팔레트: 바이스슈발츠(흰색/검정) 이원성 — 쿨 뉴트럴 + 크림슨 액센트(카드 프레임 적색) */
:root{--bg:#ffffff;--fg:#16181c;--muted:#5b626b;--line:#e6e9ee;--accent:#b0293a;--accent-soft:#f7e7e9;--side:#f5f7f9;--card:#fff;--codebg:#eef1f4}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#141619;--fg:#e7e9ec;--muted:#98a0aa;--line:#282c32;--accent:#ea8a93;--accent-soft:#2a2023;--side:#191c20;--card:#191c20;--codebg:#20242a}}
:root[data-theme=dark]{--bg:#141619;--fg:#e7e9ec;--muted:#98a0aa;--line:#282c32;--accent:#ea8a93;--accent-soft:#2a2023;--side:#191c20;--card:#191c20;--codebg:#20242a}
*{box-sizing:border-box}html,body{margin:0}
body{font-family:"Malgun Gothic","Apple SD Gothic Neo","Segoe UI",system-ui,sans-serif;color:var(--fg);background:var(--bg);line-height:1.7;font-size:16px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{display:flex;min-height:100vh}
.side{width:280px;flex:0 0 280px;background:var(--side);border-right:1px solid var(--line);position:sticky;top:0;height:100vh;overflow-y:auto;padding:14px}
.brand{font-weight:700;font-size:15px;padding:6px 8px 12px;line-height:1.35}
.brand-eyebrow{display:block;font-weight:600;font-size:10px;letter-spacing:.14em;color:var(--accent);margin-bottom:3px}
.brand small{display:block;font-weight:400;color:var(--muted);font-size:12px;margin-top:3px}
.nav-group{margin:10px 0}
.nav-group-title{font-size:11px;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;padding:4px 8px;font-weight:700}
.nav-link{display:block;padding:6px 10px;border-radius:7px;color:var(--fg);font-size:14px}
.nav-link:hover{background:var(--line);text-decoration:none}
.nav-link.active{background:var(--accent);color:#fff}
.main{flex:1;min-width:0;padding:32px 40px 80px;max-width:900px}
/* 상단 고정 검색 바 */
.topstick{position:sticky;top:0;z-index:15;background:var(--bg);margin:-32px -40px 22px;padding:12px 40px 10px;border-bottom:1px solid var(--line)}
.searchbar{display:flex;gap:8px;align-items:center}
.sbox{position:relative;flex:1;min-width:0}
#sq{width:100%;padding:9px 40px 9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--side);color:var(--fg);font-size:15px;font-family:inherit}
#sq:focus{outline:2px solid var(--accent);outline-offset:-1px;background:var(--bg)}
.hint{position:absolute;right:10px;top:50%;transform:translateY(-50%);font:12px/1 ui-monospace,Consolas,monospace;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:3px 6px;pointer-events:none}
#sq:focus~.hint,#sq:not(:placeholder-shown)~.hint{display:none}
.icon-btn{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:8px;padding:7px 11px;cursor:pointer;font-size:14px;font-family:inherit}
.icon-btn:hover{background:var(--side)}
.recent-pop{position:absolute;left:0;right:0;top:calc(100% + 6px);background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:10px 12px;z-index:25}
.rc-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted);font-weight:700;margin-bottom:8px}
.linkbtn{border:0;background:none;color:var(--muted);cursor:pointer;font-size:12px;padding:0;font-family:inherit}
.linkbtn:hover{color:var(--accent)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--side);color:var(--fg);border-radius:999px;font-size:13px;line-height:1.4}
.chip button{border:0;background:none;color:inherit;cursor:pointer;font:inherit;padding:3px 4px 3px 11px}
.chip button.x{padding:3px 9px 3px 4px;color:var(--muted)}
.chip button.x:hover{color:var(--accent)}
button.chip{cursor:pointer;padding:3px 11px;font-family:inherit}
button.chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.chip .n{opacity:.7;margin-left:4px}
.hitbar{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:13px}
.hitbar[hidden]{display:none}
.hitbar .icon-btn{padding:3px 10px;font-size:13px}
#hitpos{flex:1;min-width:0;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 검색 결과 */
.sr-meta{color:var(--muted);margin:-.4em 0 1em}
.sr-scope{margin:0 0 1.4em}
.sr-docs{margin:0 0 1.2em}
.sr-group{display:flex;justify-content:space-between;gap:10px;margin:1.6em 0 .3em;padding-bottom:4px;border-bottom:1px solid var(--line);font-weight:700;font-size:.95em}
.sr-group .n{color:var(--muted);font-weight:400;font-size:.92em;white-space:nowrap}
a.sr{display:block;padding:8px 10px;margin:2px -10px;border-radius:8px;color:var(--fg)}
a.sr:hover,a.sr:focus{background:var(--side);text-decoration:none;outline:none}
a.sr:focus-visible{box-shadow:inset 0 0 0 2px var(--accent)}
.sr-ctx{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sr-txt{font-size:14.5px;line-height:1.6;overflow-wrap:anywhere}
.sr-more{display:block;margin:1.2em auto;padding:8px 18px}
.sr-tips{color:var(--muted);font-size:.92em}
mark{background:#ffe17a;color:inherit;border-radius:2px;padding:0 1px}
mark.cur{background:var(--accent);color:#fff}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) mark{background:#6b5412;color:#fff4d2}:root:not([data-theme=light]) mark.cur{background:var(--accent);color:#141619}}
:root[data-theme=dark] mark{background:#6b5412;color:#fff4d2}
:root[data-theme=dark] mark.cur{background:var(--accent);color:#141619}
.flash{animation:flash 2s ease-out}
@keyframes flash{0%,45%{background:var(--accent-soft)}100%{background:transparent}}
.scrim{display:none}
h1{font-size:1.7em;border-bottom:2px solid var(--line);padding-bottom:.3em;margin-top:0}
h2{font-size:1.35em;margin-top:1.6em;border-bottom:1px solid var(--line);padding-bottom:.2em}
h3{font-size:1.15em;margin-top:1.3em}h4{font-size:1.02em;color:var(--muted)}
ul{padding-left:1.3em}li{margin:.15em 0}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92em;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
th{background:var(--side)}
blockquote{margin:1em 0;padding:.6em 1em;border-left:4px solid var(--accent);background:var(--codebg);border-radius:0 8px 8px 0;color:var(--muted)}
code{background:var(--codebg);padding:.1em .35em;border-radius:5px;font-size:.9em}
.revised{color:#d32f2f;font-weight:500}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .revised{color:#ff8a80}}
:root[data-theme=dark] .revised{color:#ff8a80}
:root[data-theme=light] .revised{color:#d32f2f}
.qa-filter{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;margin:.6em 0 .2em}
.qa-count{color:var(--muted);font-size:.85em;margin:.1em 0 1em}
.qa-item{border-top:1px solid var(--line);padding-top:.2em;margin-top:.8em}
.qa-item h2{font-size:1.1em;border:0;margin-top:.5em}
hr{border:0;border-top:1px solid var(--line);margin:2em 0}
details{margin:.5em 0;border:1px solid var(--line);border-radius:8px;padding:.4em .8em}
summary{cursor:pointer;font-weight:600}
.menu-btn{display:none}
@media(max-width:800px){
 .side{position:fixed;left:0;top:0;z-index:30;transform:translateX(-100%);transition:.2s}
 .side.open{transform:none}
 .side.open~.scrim{display:block;position:fixed;inset:0;z-index:25;background:rgba(0,0,0,.35)}
 .main{padding:0 16px 60px}
 .topstick{margin:0 -16px 16px;padding:10px 16px 8px}
 .menu-btn{display:block}
 #sq{font-size:16px;padding-right:12px}
 .hint{display:none}
}
</style></head><body>
<div class="wrap">
<nav class="side">
 <div class="brand"><span class="brand-eyebrow">ヴァイスシュヴァルツ</span>바이스슈발츠 룰 한글화<small>종합 룰 ver.1.113 · 팬 비공식 번역</small></div>
 <div id="nav">${navHtml}</div>
</nav>
<div class="scrim" onclick="toggleSide(false)"></div>
<main class="main" id="main">
<div class="topstick">
 <div class="searchbar" role="search">
  <button class="icon-btn menu-btn" onclick="toggleSide()" aria-label="메뉴 열기">☰</button>
  <div class="sbox">
   <input id="sq" type="search" placeholder="전체 문서에서 검색 (예: 앙코르, 트리거, 7.4)" autocomplete="off" spellcheck="false" aria-label="전체 문서 검색">
   <kbd class="hint">/</kbd>
   <div id="recent" class="recent-pop" hidden></div>
  </div>
  <button class="icon-btn" onclick="tglTheme()" aria-label="테마 전환">🌗</button>
 </div>
 <div id="hitbar" class="hitbar" hidden>
  <button class="icon-btn" onclick="backToResults()">‹ 검색 결과</button>
  <span id="hitpos"></span>
  <button class="icon-btn" onclick="stepHit(-1)" aria-label="이전 일치">▲</button>
  <button class="icon-btn" onclick="stepHit(1)" aria-label="다음 일치">▼</button>
  <button class="icon-btn" onclick="closeHits()" aria-label="하이라이트 닫기">✕</button>
 </div>
</div>
${sectionsHtml}</main>
</div>
<script>
const META=${JSON.stringify(searchMeta)};
const $=s=>document.querySelector(s);
const links=[...document.querySelectorAll('.nav-link')];
const sq=$('#sq');
let curSec='';
function toggleSide(v){$('.side').classList.toggle('open',v);}
function show(id,keepScroll){
 if(id!==curSec)clearMarks();
 document.querySelectorAll('.doc').forEach(s=>s.hidden=s.id!==id);
 links.forEach(a=>a.classList.toggle('active',a.dataset.target===id));
 toggleSide(false);
 curSec=id;
 if(!keepScroll)window.scrollTo(0,0);
}
links.forEach(a=>a.addEventListener('click',()=>{clearMarks();show(a.dataset.target);}));
function qaFilter(inp){const q=inp.value.trim().toLowerCase();const sec=inp.closest('.doc');const items=[...sec.querySelectorAll('.qa-item')];let shown=0;items.forEach(it=>{const m=!q||it.textContent.toLowerCase().includes(q);it.style.display=m?'':'none';if(m)shown++;});const c=sec.querySelector('.qa-count');if(c)c.textContent=q?(shown+' / '+items.length+'건'):(items.length+'건');}
function tglTheme(){const r=document.documentElement;const cur=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');const nx=cur==='dark'?'light':'dark';r.setAttribute('data-theme',nx);try{localStorage.setItem('ws-theme',nx)}catch(e){}}

/* ── 전체 검색 ───────────────────────────────────────── */
// 전각 영숫자→반각·소문자. 글자 수를 바꾸지 않아야 원문 위치에 그대로 하이라이트할 수 있다.
const norm=s=>s.replace(/[\\uFF01-\\uFF5E]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/\\u3000/g,' ').toLowerCase();
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const terms=q=>[...new Set(norm(q).split(/\\s+/).filter(Boolean))];
const TITLE={},GROUP={};META.forEach(m=>{TITLE[m.id]=m.title;GROUP[m.id]=m.group;});
function ranges(n,ts){const rs=[];for(const t of ts){let i=n.indexOf(t);while(i>=0){rs.push([i,i+t.length]);i=n.indexOf(t,i+t.length);}}
 rs.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);const out=[];for(const r of rs){const l=out[out.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else out.push(r.slice());}return out;}
let IDX=null;
function ownText(el){if(el.tagName==='TR')return [...el.cells].map(c=>c.textContent.trim()).join(' · ');
 if(el.tagName!=='LI')return el.textContent;let t='';el.childNodes.forEach(n=>{if(!(n.nodeType===1&&/^(UL|OL)$/.test(n.tagName)))t+=n.textContent;});return t;}
function buildIdx(){IDX=[];
 for(const m of META){const sec=document.getElementById(m.id);if(!sec)continue;const stack=[];
  sec.querySelectorAll('h1,h2,h3,h4,h5,p,li,tr,blockquote,summary').forEach(el=>{
   if(el.tagName==='P'&&el.parentElement.closest('li,td,th,blockquote'))return;
   const txt=ownText(el).replace(/\\s+/g,' ').trim();if(!txt)return;
   const hl=/^H([1-5])$/.exec(el.tagName);
   if(hl){const lv=+hl[1];stack.length=lv;stack[lv-1]=txt;}
   IDX.push({sec:m.id,el,txt,n:norm(txt),ctx:hl?'':stack.slice(1).filter(Boolean).join(' › ')});
  });}}
let lastQ='',hits=[],scope='',limit=150,resScroll=0;
function find(q){if(!IDX)buildIdx();const ts=terms(q);const out=ts.length?IDX.filter(r=>ts.every(t=>r.n.includes(t))):[];out.forEach((r,i)=>r.hi=i);return out;}
function setQuery(q){q=q.trim();if(q!==lastQ){lastQ=q;hits=q?find(q):[];scope='';limit=150;resScroll=0;}}
function snippet(r,ts){const rs=ranges(r.n,ts),W=150,t=r.txt;let s=rs.length?Math.max(0,rs[0][0]-45):0;const e=Math.min(t.length,s+W);s=Math.max(0,Math.min(s,e-W));
 let o=s>0?'…':'',p=s;for(const [a,b] of rs){if(b<=p||a>=e)continue;const aa=Math.max(a,p),bb=Math.min(b,e);o+=esc(t.slice(p,aa))+'<mark>'+esc(t.slice(aa,bb))+'</mark>';p=bb;}
 return o+esc(t.slice(p,e))+(e<t.length?'…':'');}
// 검색창 입력 → 결과 화면. 문서를 읽다가 검색을 시작하면 히스토리에 한 번만 쌓아 '뒤로'로 돌아갈 수 있게 한다.
function runSearch(q){q=q.trim();
 if(!q&&curSec!=='search'){setQuery('');return;}
 hideRecent();setQuery(q);
 const h=q?'#q='+encodeURIComponent(q):'#search';
 if(curSec!=='search'){history.pushState(null,'',h);show('search');}else history.replaceState(null,'',h);
 renderResults();}
function renderResults(){const box=$('#sres'),q=lastQ;
 if(!q){box.innerHTML='<h1>전체 검색</h1>'+(RECENT.length?'<div class="sr-scope">'+recentHtml()+'</div>':'')+
  '<ul class="sr-tips"><li>종합 룰·Q&amp;A·플로어 룰·에라타·덱 구축 규칙·페널티·글로서리 전체에서 찾습니다.</li><li>여러 단어를 띄어 쓰면 <strong>모두 포함된</strong> 항목만 보여 줍니다. (예: <code>앙코르 리버스</code>)</li><li>조항 번호나 일본어 원어로도 찾을 수 있습니다. (예: <code>7.4</code>, <code>控え室</code>)</li><li>키보드 <code>/</code> 또는 <code>Ctrl+K</code> 로 검색창, 결과에서는 <code>↑</code> <code>↓</code> 로 이동합니다.</li></ul>';return;}
 const cnt={},per={};hits.forEach(r=>{cnt[GROUP[r.sec]]=(cnt[GROUP[r.sec]]||0)+1;per[r.sec]=(per[r.sec]||0)+1;});
 const list=scope?hits.filter(r=>GROUP[r.sec]===scope):hits;
 const ts=terms(q),nq=norm(q);
 const docs=META.filter(m=>ts.every(t=>norm(m.title).includes(t)));
 let o='<h1>검색 결과</h1><p class="sr-meta">“'+esc(q)+'” — '+hits.length+'건 · 문서 '+Object.keys(per).length+'개</p>';
 if(docs.length)o+='<div class="sr-docs chips">'+docs.map(m=>'<a class="chip" style="padding:3px 11px" href="#'+m.id+'">📄 '+esc(m.title)+'</a>').join('')+'</div>';
 if(hits.length){o+='<div class="sr-scope chips"><button class="chip'+(scope?'':' on')+'" data-scope="">전체<span class="n">'+hits.length+'</span></button>'+
  [...new Set(META.map(m=>m.group))].filter(g=>cnt[g]).map(g=>'<button class="chip'+(scope===g?' on':'')+'" data-scope="'+esc(g)+'">'+esc(g)+'<span class="n">'+cnt[g]+'</span></button>').join('')+'</div>';}
 else o+='<p>일치하는 내용이 없습니다. 띄어쓰기를 줄이거나 다른 표기(예: <code>CX</code> / <code>클라이맥스</code>)로 찾아보세요.</p>';
 let prev='';list.slice(0,limit).forEach(r=>{
  if(r.sec!==prev){prev=r.sec;o+='<div class="sr-group"><span>'+esc(TITLE[r.sec])+'</span><span class="n">'+per[r.sec]+'건</span></div>';}
  o+='<a class="sr" href="#'+r.sec+'" data-i="'+r.hi+'">'+(r.ctx?'<div class="sr-ctx">'+esc(r.ctx)+'</div>':'')+'<div class="sr-txt">'+snippet(r,ts)+'</div></a>';});
 if(list.length>limit)o+='<button class="icon-btn sr-more">더 보기 (나머지 '+(list.length-limit)+'건)</button>';
 box.innerHTML=o;}
$('#sres').addEventListener('click',e=>{const a=e.target.closest('a.sr');if(a){e.preventDefault();openHit(+a.dataset.i);return;}
 const c=e.target.closest('[data-scope]');if(c){scope=c.dataset.scope;limit=150;renderResults();return;}
 if(e.target.closest('.sr-more')){limit+=300;renderResults();}});
$('#sres').addEventListener('keydown',e=>{const a=e.target.closest('a.sr');if(!a||!/^Arrow(Up|Down)$/.test(e.key))return;e.preventDefault();
 const all=[...document.querySelectorAll('#sres a.sr')],i=all.indexOf(a)+(e.key==='ArrowDown'?1:-1);if(i<0)sq.focus();else if(all[i])all[i].focus();});
// 본문 하이라이트
let marks=[],cur=-1,hitTarget=null;
function clearMarks(){const ps=new Set();marks.forEach(m=>{const p=m.parentNode;if(p){p.replaceChild(document.createTextNode(m.textContent),m);ps.add(p);}});ps.forEach(p=>p.normalize());marks=[];cur=-1;$('#hitbar').hidden=true;}
function markSection(id,ts){clearMarks();const sec=document.getElementById(id);
 const w=document.createTreeWalker(sec,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
 for(const nd of nodes){if(marks.length>3000)break;const t=nd.nodeValue,rs=ranges(norm(t),ts);if(!rs.length)continue;const f=document.createDocumentFragment();let p=0;
  for(const [a,b] of rs){if(a>p)f.appendChild(document.createTextNode(t.slice(p,a)));const m=document.createElement('mark');m.textContent=t.slice(a,b);f.appendChild(m);marks.push(m);p=b;}
  if(p<t.length)f.appendChild(document.createTextNode(t.slice(p)));nd.parentNode.replaceChild(f,nd);}}
function reveal(el){for(let d=el.closest('details');d;d=d.parentElement.closest('details'))d.open=true;
 const qi=el.closest('.qa-item');if(qi&&qi.style.display==='none'){const inp=qi.closest('.doc').querySelector('.qa-filter');inp.value='';qaFilter(inp);}}
function flash(el){el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}
function setCur(k){if(!marks.length)return;if(cur>=0&&marks[cur])marks[cur].classList.remove('cur');cur=(k+marks.length)%marks.length;const m=marks[cur];m.classList.add('cur');reveal(m);m.scrollIntoView({block:'center'});
 $('#hitpos').textContent=(cur+1)+' / '+marks.length+(marks.length>3000?'+':'')+' · “'+lastQ+'”';}
function openHit(i){const r=hits[i];if(!r)return;saveRecent(lastQ);resScroll=window.scrollY;
 history.pushState(null,'','#'+r.sec);show(r.sec);reveal(r.el);markSection(r.sec,terms(lastQ));
 $('#hitbar').hidden=false;let k=marks.findIndex(m=>r.el.contains(m));
 if(k<0)k=marks.findIndex(m=>r.el.compareDocumentPosition(m)&Node.DOCUMENT_POSITION_FOLLOWING);
 if(marks.length)setCur(Math.max(k,0));else{$('#hitpos').textContent='“'+lastQ+'”';r.el.scrollIntoView({block:'center'});}
 flash(r.el);}
function stepHit(d){setCur(cur+d);}
function closeHits(){clearMarks();}
function backToResults(){location.hash='q='+encodeURIComponent(lastQ);}
// 최근 검색어(이 브라우저에만 저장)
let RECENT=[];try{RECENT=JSON.parse(localStorage.getItem('ws-recent'))||[]}catch(e){}
function saveRecent(q){q=q.trim();if(!q)return;RECENT=[q,...RECENT.filter(x=>x!==q)].slice(0,10);try{localStorage.setItem('ws-recent',JSON.stringify(RECENT))}catch(e){}}
function dropRecent(q){RECENT=q==null?[]:RECENT.filter(x=>x!==q);try{localStorage.setItem('ws-recent',JSON.stringify(RECENT))}catch(e){}}
function recentHtml(){return '<div class="rc-head"><span>최근 검색어</span><button class="linkbtn" data-rclear>전체 삭제</button></div><div class="chips">'+
 RECENT.map(q=>'<span class="chip"><button data-rq="'+esc(q)+'">'+esc(q)+'</button><button class="x" data-rdel="'+esc(q)+'" aria-label="'+esc(q)+' 삭제">×</button></span>').join('')+'</div>';}
function showRecent(){const p=$('#recent');if(!RECENT.length){p.hidden=true;return;}p.innerHTML=recentHtml();p.hidden=false;}
function hideRecent(){$('#recent').hidden=true;}
document.addEventListener('click',e=>{const t=e.target;
 if(t.closest('[data-rq]')){const q=t.closest('[data-rq]').dataset.rq;sq.value=q;saveRecent(q);runSearch(q);return;}
 if(t.closest('[data-rdel]')){e.stopPropagation();dropRecent(t.closest('[data-rdel]').dataset.rdel);refreshRecent();return;}
 if(t.closest('[data-rclear]')){dropRecent(null);refreshRecent();return;}
 if(!t.closest('.sbox'))hideRecent();});
function refreshRecent(){if(!$('#recent').hidden)showRecent();if(curSec==='search'&&!lastQ)renderResults();}
let tmr;
sq.addEventListener('input',()=>{clearTimeout(tmr);if(!sq.value.trim())showRecent();else hideRecent();tmr=setTimeout(()=>runSearch(sq.value),140);});
sq.addEventListener('focus',()=>{if(!sq.value.trim())showRecent();});
sq.addEventListener('keydown',e=>{
 if(e.key==='Enter'){e.preventDefault();clearTimeout(tmr);saveRecent(sq.value);runSearch(sq.value);}
 else if(e.key==='Escape'){if(sq.value){sq.value='';clearTimeout(tmr);showRecent();}else{hideRecent();sq.blur();}}
 else if(e.key==='ArrowDown'&&curSec==='search'){const f=$('#sres a.sr');if(f){e.preventDefault();hideRecent();f.focus();}}});
document.addEventListener('keydown',e=>{const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable;
 if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();sq.focus();sq.select();}});
// 라우팅: #문서ID · #q=검색어 · #search
function route(){let h=location.hash.slice(1);try{h=decodeURIComponent(h)}catch(e){}
 if(h.startsWith('q=')||h==='search'){const q=h==='search'?'':h.slice(2).trim();const back=q===lastQ&&q!=='';
  sq.value=q;hideRecent();setQuery(q);show('search',back);renderResults();if(back)window.scrollTo(0,resScroll);return;}
 show(h&&h!=='search'&&document.getElementById(h)?h:'home');}
window.addEventListener('hashchange',route);
(function(){try{const t=localStorage.getItem('ws-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}
 document.querySelectorAll('.qa-filter').forEach(qaFilter);route();})();
</script>
</body></html>`;

// GitHub Pages 루트 서빙용
fs.writeFileSync(path.join(ROOT, "index.html"), page);

// Artifact용(body-only: <head>/<body> 래퍼 없이 style+콘텐츠+script만) — claude.ai Artifact는 head/body를 감싸므로
fs.mkdirSync(path.join(ROOT, "site"), { recursive: true });
const styleBlock = page.match(/<style>[\s\S]*?<\/style>/)[0];
const bodyInner = page.match(/<body>([\s\S]*)<\/body>/)[1];
fs.writeFileSync(path.join(ROOT, "site", "artifact.html"), styleBlock + "\n" + bodyInner);

console.log(`✔ index.html (루트, GitHub Pages) — ${(page.length/1024).toFixed(0)}KB · 섹션 ${sections.length + 1}개`);
console.log(`✔ site/artifact.html — ${((styleBlock.length+bodyInner.length)/1024).toFixed(0)}KB (claude.ai Artifact 발행용)`);
