// check-sections.mjs — 원문(JP) 대비 한글판(KR)의 섹션 번호 완전성 검증
//
//   node tools/check-sections.mjs
//
// JP: sources/WS_rule_1.111.ja.txt 본문에서 줄머리 섹션 번호(1.2.3. …)를 뽑는다.
// KR: docs/rulebook/*.md 의 제목(# N. / ## N.M.)과 항목(- **N.M.K.**)에서 번호를 뽑는다.
// 챕터별로 누락/추가를 보고한다. 인라인 참조(예: "클록 존(3.8)")는 줄머리·**볼드**만
// 잡으므로 오탐되지 않는다.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "sources", "WS_rule_1.111.ja.txt");
const RB = path.join(ROOT, "docs", "rulebook");

// ── JP 본문 파싱 ────────────────────────────────────────────
const lines = fs.readFileSync(SRC, "utf8").split(/\r?\n/);
let bodyStart = lines.findIndex((l) => l.trim() === "総合ルール本文");
if (bodyStart < 0) bodyStart = 0;
const jpByChapter = {};
let curCh = null;
for (let i = bodyStart + 1; i < lines.length; i++) {
  const m = lines[i].match(/^(\d+(?:\.\d+)*)\.(?:\s|$)/);
  if (!m) continue;
  const num = m[1];
  const ch = num.split(".")[0];
  if (!num.includes(".")) curCh = ch; // 챕터 헤더
  (jpByChapter[ch] ||= new Set()).add(num);
}

// ── KR 파싱 ─────────────────────────────────────────────────
const krByChapter = {};
for (const f of fs.readdirSync(RB).filter((n) => /^\d+-.*\.md$/.test(n))) {
  const txt = fs.readFileSync(path.join(RB, f), "utf8");
  for (const line of txt.split(/\r?\n/)) {
    let m = line.match(/^#{1,6}\s+(\d+(?:\.\d+)*)\.\s/);          // 제목
    if (!m) m = line.match(/^\s*-\s+\*\*(\d+(?:\.\d+)*)\.\*\*/);   // 항목
    if (!m) continue;
    const ch = m[1].split(".")[0];
    (krByChapter[ch] ||= new Set()).add(m[1]);
  }
}

// ── 비교 ────────────────────────────────────────────────────
const sortNums = (a, b) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? -1) !== (pb[i] ?? -1)) return (pa[i] ?? -1) - (pb[i] ?? -1);
  }
  return 0;
};
let ok = true;
const chapters = Object.keys(krByChapter).sort((a, b) => a - b);
if (chapters.length === 0) { console.log("KR 룰북 파일이 없습니다."); process.exit(0); }
for (const ch of chapters) {
  const jp = jpByChapter[ch] || new Set();
  const kr = krByChapter[ch];
  const missing = [...jp].filter((n) => !kr.has(n)).sort(sortNums);   // JP엔 있고 KR엔 없음
  const extra = [...kr].filter((n) => !jp.has(n)).sort(sortNums);     // KR엔 있고 JP엔 없음
  const mark = missing.length || extra.length ? "✗" : "✓";
  if (missing.length || extra.length) ok = false;
  console.log(`${mark} ${ch}장: JP ${jp.size} / KR ${kr.size}` +
    (missing.length ? `\n   누락(JP→KR): ${missing.join(", ")}` : "") +
    (extra.length ? `\n   초과(KR only): ${extra.join(", ")}` : ""));
}
console.log(ok ? "\n✔ 검증 통과 — 섹션 번호 1:1 일치" : "\n✗ 불일치 있음 — 위 목록 확인");
process.exit(ok ? 0 : 1);
