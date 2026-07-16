// stitch-qa-cards.mjs — 카드 지정 Q&A part-1..5.md를 하나로 합치고 '대상 카드' 줄을 소스에서 균일 재생성
//   node tools/stitch-qa-cards.mjs
// 출력: docs/qa/cards/README.md

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS = path.join(ROOT, "docs", "qa", "cards");
const qa = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "qa.ja.json"), "utf8"));
const names = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "qa_names.json"), "utf8")).cardKoByNo;

// id → 소스 항목
const byId = {};
for (const x of qa) byId[x.id] = x;

// 균일한 '대상 카드' 줄 생성
function targetLine(x) {
  if (!x) return "공통 재정";
  if (x.display_cards && x.display_cards.length) {
    return x.display_cards.map((d) => {
      const m = String(d).match(/^\[?\s*([A-Z0-9]{2,6}\/[A-Za-z0-9-]+)\s*[:：]\s*([\s\S]*?)\s*\]?$/);
      if (!m) return String(d).replace(/^\[|\]$/g, "").trim();
      const no = m[1], jp = m[2].trim();
      const ko = names[no];
      return ko ? `${no} ${ko} (${jp})` : `${no} (${jp})`;
    }).join(" · ");
  }
  const nums = [...new Set((x.card_number || "").match(/[A-Z0-9]{2,6}\/[A-Za-z0-9-]+/g) || [])];
  if (!nums.length) return "특정 카드 지정 없음";
  if (nums.length <= 3) return nums.map((no) => (names[no] ? `${no} ${names[no]}` : no)).join(" · ");
  return `적용 카드 ${nums.length}종`;
}

let entries = [];
for (let n = 1; n <= 5; n++) {
  const p = path.join(CARDS, `part-${n}.md`);
  if (!fs.existsSync(p)) { console.log(`⚠ part-${n}.md 없음`); continue; }
  let txt = fs.readFileSync(p, "utf8").replace(/^﻿?\s*<!--[\s\S]*?-->\s*/, "");
  for (const block of txt.split(/(?=^## Q\d)/m)) {
    const m = block.match(/^## Q(\d+)/);
    if (!m) continue;
    const id = +m[1];
    // '대상 카드' 줄 교체(있으면), 없으면 ## 다음 줄에 삽입
    let b = block.trimEnd();
    const tl = `**대상 카드**: ${targetLine(byId[id])}`;
    if (/^\*\*대상 카드\*\*\s*[:：].*$/m.test(b)) b = b.replace(/^\*\*대상 카드\*\*\s*[:：].*$/m, tl);
    else b = b.replace(/^(## Q\d.*)$/m, `$1\n${tl}`);
    entries.push({ id, b });
  }
}
entries.sort((a, b) => b.id - a.id); // Q번호 역순(최신순)
// id 중복 제거(안전)
const seen = new Set(); entries = entries.filter((e) => !seen.has(e.id) && seen.add(e.id));

const header = `# 바이스슈발츠 Q&A — 카드 지정

<!-- 출처: https://ws-tcg.com/question/ · 카드별 재정 · 대상 카드명은 ws_auto 카드 리스트 표기와 통일. 일반 룰 Q&A는 별도 문서. -->

> 특정 카드·상황에 관한 재정 ${entries.length}건입니다. 대상 카드명은 ws_auto 카드 리스트 표기를 따릅니다. (카드가 특정되지 않은 공통 재정은 「공통 재정」으로 표시)
`;
fs.mkdirSync(CARDS, { recursive: true });
fs.writeFileSync(path.join(CARDS, "README.md"), header + "\n" + entries.map((e) => e.b).join("\n\n") + "\n");
console.log(`✔ docs/qa/cards/README.md — ${entries.length}건 (part 5개 합침, 대상 카드 균일 재생성)`);
