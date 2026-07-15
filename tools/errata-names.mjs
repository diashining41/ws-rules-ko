// errata-names.mjs — 에라타 카드/작품명을 ws_auto 코퍼스 표기와 매칭
//   node tools/errata-names.mjs
// 출력: sources/errata_names.json  { cardKoByNo, titleKoByCode, unmatched }

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WS = "C:/Users/diash/AI_Project/ws_auto/data";
const errata = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "errata.ja.json"), "utf8"));
const titlesKo = JSON.parse(fs.readFileSync(path.join(WS, "titles_ko.json"), "utf8"));

// canon.js와 동일한 base 추출 (포일 변형 S 등 흡수)
const splitNo = (n) => { const m = String(n).match(/^(.*-[A-Z]{0,2}\d+)([A-Za-z]*)[^A-Za-z0-9]*$/); return m ? m[1] : String(n); };

const nameByBase = {};       // 카드번호 base → KO 카드명
const titleKoByCode = {};    // 작품코드(BRD 등) → KO 작품명
for (const f of fs.readdirSync(WS).filter((n) => /^translations\.\d+\.json$/.test(n))) {
  const side = f.match(/\d+/)[0];
  const ko = titlesKo[side];
  const j = JSON.parse(fs.readFileSync(path.join(WS, f), "utf8"));
  for (const [no, v] of Object.entries(j)) {
    if (v && v.name) nameByBase[splitNo(no)] = v.name;
    const code = no.split("/")[0];
    if (ko && !(code in titleKoByCode)) titleKoByCode[code] = ko;
  }
}

// 에라타 카드 매칭
const cardKoByNo = {};
const unmatched = [];
let hit = 0, tot = 0;
for (const e of errata) for (const c of e.cards) {
  if (!c.no) continue;
  tot++;
  const ko = nameByBase[splitNo(c.no)];
  if (ko) { cardKoByNo[c.no] = ko; hit++; }
  else unmatched.push({ no: c.no, name: c.name });
}
fs.writeFileSync(path.join(ROOT, "sources", "errata_names.json"),
  JSON.stringify({ cardKoByNo, titleKoByCode, unmatched }, null, 1));
console.log(`카드명 매칭 ${hit}/${tot} (${(hit/tot*100).toFixed(1)}%) | 작품코드 ${Object.keys(titleKoByCode).length}종`);
console.log(`미매칭 ${unmatched.length}건 샘플:`, unmatched.slice(0, 8).map((u) => `${u.no}(${u.name})`).join(", "));
