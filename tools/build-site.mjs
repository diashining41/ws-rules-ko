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
  { group: "그 외 자료", id: "errata", title: "에라타 카드 리스트", file: "docs/errata/README.md" },
  { group: "그 외 자료", id: "deck", title: "덱 구축 규칙", file: "docs/deck-rule/README.md" },
  { group: "그 외 자료", id: "qa", title: "Q&A (일반 룰)", file: "docs/qa/general/README.md" },
  { group: "그 외 자료", id: "floor-basic", title: "기본 플로어 룰", file: "docs/floor-rule/basic.md" },
  { group: "그 외 자료", id: "floor-adv", title: "응용 플로어 룰", file: "docs/floor-rule/advanced.md" },
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

// 로컬 이미지는 data URI로 인라인(자체완결) · 외부 URL은 그대로 <img>
const embedImg = (alt, src, baseDir) => {
  if (/^https?:/i.test(src)) return `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`;
  try {
    const buf = fs.readFileSync(path.resolve(ROOT, baseDir, src));
    const ext = path.extname(src).slice(1).toLowerCase().replace("jpg", "jpeg");
    return `<figure><img src="data:image/${ext};base64,${buf.toString("base64")}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
  } catch { return `<p><em>[이미지 없음: ${src}]</em></p>`; }
};

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
const sections = DOCS.map((d) => {
  let html;
  try { html = mdToHtml(rd(d.file), path.dirname(d.file)); }
  catch { html = `<p><em>(${d.file} 없음)</em></p>`; }
  return { ...d, html };
});

// 홈(소개) 섹션
const home = `<h1>바이스슈발츠 룰 한글화</h1>
<p><a href="https://ws-tcg.com/rules/" target="_blank" rel="noopener">ws-tcg.com/rules</a> 의 일본판 자료(종합 룰·에라타·덱 구축 규칙·Q&A·플로어 룰·페널티)를 <strong>일본판 구성 그대로</strong> 한국어로 옮긴 팬 번역입니다.</p>
<blockquote><strong>면책</strong> · 팬 제작 <strong>비공식·비영리</strong> 참고 자료입니다. 룰·데이터 출처 ⓒ BushiRoad / <a href="https://ws-tcg.com/" target="_blank" rel="noopener">ws-tcg.com</a>. BushiRoad와 제휴·후원 관계가 없습니다.</blockquote>
<table><thead><tr><th>자료</th><th>내용</th></tr></thead><tbody>
<tr><td>종합 룰(룰북)</td><td>ver.1.111 · 11장 (660섹션)</td></tr>
<tr><td>에라타</td><td>167항목</td></tr>
<tr><td>덱 구축 규칙</td><td>165작품 + 제한 리스트</td></tr>
<tr><td>Q&amp;A(일반 룰)</td><td>97건</td></tr>
<tr><td>플로어 룰</td><td>기본 + 응용(10部)</td></tr>
<tr><td>페널티 이력</td><td>22건</td></tr>
</tbody></table>
<p>왼쪽 메뉴에서 문서를 선택하세요. 상단 검색으로 메뉴를 필터할 수 있습니다.</p>
<hr>
<p style="color:var(--muted);font-size:.92em"><strong>출처</strong> — 원문 룰/Q&amp;A 페이지: <a href="https://ws-tcg.com/rules/" target="_blank" rel="noopener">https://ws-tcg.com/rules/</a><br>종합 룰 원문 PDF (ver.1.111): <a href="https://ws-tcg.com/wordpress/wp-content/uploads/2026/05/19125324/WS_rule_1.111.pdf" target="_blank" rel="noopener">WS_rule_1.111.pdf</a></p>`;

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
  sections.map((s) => `<section id="${s.id}" class="doc" hidden>${s.html}</section>`).join("\n");

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
#q{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);margin-bottom:10px;font-size:14px}
.nav-group{margin:10px 0}
.nav-group-title{font-size:11px;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;padding:4px 8px;font-weight:700}
.nav-link{display:block;padding:6px 10px;border-radius:7px;color:var(--fg);font-size:14px}
.nav-link:hover{background:var(--line);text-decoration:none}
.nav-link.active{background:var(--accent);color:#fff}
.nav-link.hide{display:none}
.main{flex:1;min-width:0;padding:32px 40px 80px;max-width:900px}
.topbar{display:none}
h1{font-size:1.7em;border-bottom:2px solid var(--line);padding-bottom:.3em;margin-top:0}
h2{font-size:1.35em;margin-top:1.6em;border-bottom:1px solid var(--line);padding-bottom:.2em}
h3{font-size:1.15em;margin-top:1.3em}h4{font-size:1.02em;color:var(--muted)}
ul{padding-left:1.3em}li{margin:.15em 0}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92em;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
th{background:var(--side)}
blockquote{margin:1em 0;padding:.6em 1em;border-left:4px solid var(--accent);background:var(--codebg);border-radius:0 8px 8px 0;color:var(--muted)}
code{background:var(--codebg);padding:.1em .35em;border-radius:5px;font-size:.9em}
figure{margin:1.4em 0;text-align:center}
figure img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px;background:#fff}
figcaption{font-size:.85em;color:var(--muted);margin-top:.6em}
.revised{color:#d32f2f;font-weight:500}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .revised{color:#ff8a80}}
:root[data-theme=dark] .revised{color:#ff8a80}
:root[data-theme=light] .revised{color:#d32f2f}
hr{border:0;border-top:1px solid var(--line);margin:2em 0}
details{margin:.5em 0;border:1px solid var(--line);border-radius:8px;padding:.4em .8em}
summary{cursor:pointer;font-weight:600}
.theme{position:fixed;top:12px;right:16px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:20px;padding:5px 12px;cursor:pointer;font-size:13px;z-index:20}
.menu-btn{display:none}
@media(max-width:800px){
 .side{position:fixed;left:0;top:0;z-index:30;transform:translateX(-100%);transition:.2s}
 .side.open{transform:none}
 .main{padding:64px 18px 60px}
 .menu-btn{display:block;position:fixed;top:12px;left:12px;z-index:20;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:8px;padding:6px 12px;cursor:pointer}
 .theme{top:12px;right:12px}
}
</style></head><body>
<button class="menu-btn" onclick="document.querySelector('.side').classList.toggle('open')">☰ 메뉴</button>
<button class="theme" onclick="tglTheme()">🌗 테마</button>
<div class="wrap">
<nav class="side">
 <div class="brand"><span class="brand-eyebrow">ヴァイスシュヴァルツ</span>바이스슈발츠 룰 한글화<small>종합 룰 ver.1.111 · 팬 비공식 번역</small></div>
 <input id="q" placeholder="메뉴 검색…" oninput="filterNav(this.value)">
 <div id="nav">${navHtml}</div>
</nav>
<main class="main" id="main">${sectionsHtml}</main>
</div>
<script>
const links=[...document.querySelectorAll('.nav-link')];
function show(id){
 document.querySelectorAll('.doc').forEach(s=>s.hidden=s.id!==id);
 links.forEach(a=>a.classList.toggle('active',a.dataset.target===id));
 document.querySelector('.side').classList.remove('open');
 document.getElementById('main').scrollTop=0;window.scrollTo(0,0);
}
links.forEach(a=>a.addEventListener('click',e=>{show(a.dataset.target);}));
function filterNav(v){v=v.trim().toLowerCase();links.forEach(a=>a.classList.toggle('hide',v&&!a.textContent.toLowerCase().includes(v)));document.querySelectorAll('.nav-group').forEach(g=>{const any=[...g.querySelectorAll('.nav-link')].some(a=>!a.classList.contains('hide'));g.style.display=any?'':'none';});}
function tglTheme(){const r=document.documentElement;const cur=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');const nx=cur==='dark'?'light':'dark';r.setAttribute('data-theme',nx);try{localStorage.setItem('ws-theme',nx)}catch(e){}}
(function(){try{const t=localStorage.getItem('ws-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}
 const h=location.hash.slice(1);show(document.getElementById(h)?h:'home');})();
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(document.getElementById(h))show(h);});
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
