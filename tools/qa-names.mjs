// qa-names.mjs — 카드 지정 Q&A의 display_cards 카드명을 ws_auto 표기와 매칭
//   node tools/qa-names.mjs
// 출력: sources/qa_names.json  { cardKoByNo }  (번호→KO 카드명)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WS = "C:/Users/diash/AI_Project/ws_auto/data";
const qa = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "qa.ja.json"), "utf8"));

const splitNo = (n) => { const m = String(n).match(/^(.*-[A-Z]{0,2}\d+)([A-Za-z]*)[^A-Za-z0-9]*$/); return m ? m[1] : String(n); };

// ws_auto 전 번역 인덱스 (번호 base → KO 카드명)
const nameByBase = {};
for (const f of fs.readdirSync(WS).filter((n) => /^translations\.\d+\.json$/.test(n))) {
  const j = JSON.parse(fs.readFileSync(path.join(WS, f), "utf8"));
  for (const [no, v] of Object.entries(j)) if (v && v.name) nameByBase[splitNo(no)] = v.name;
}

// 카드 지정 Q&A의 display_cards에서 카드번호 추출
const cardKoByNo = {};
let hit = 0, tot = 0;
for (const x of qa) {
  for (const d of x.display_cards || []) {
    const m = String(d).match(/^\[?([A-Z0-9]{2,5}\/[A-Za-z0-9-]+)\s*[:：]/);
    if (!m) continue;
    const no = m[1];
    if (no in cardKoByNo) continue;
    tot++;
    const ko = nameByBase[splitNo(no)];
    if (ko) { cardKoByNo[no] = ko; hit++; }
  }
}
fs.writeFileSync(path.join(ROOT, "sources", "qa_names.json"), JSON.stringify({ cardKoByNo }, null, 1));
console.log(`display_cards 고유 카드 ${tot}종 중 KO명 매칭 ${hit} (${(hit/tot*100).toFixed(1)}%)`);
