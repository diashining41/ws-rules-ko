// normalize-qa-cards.mjs — 카드 지정 Q&A의 카드명을 ws_auto 카드명으로 통일
//   node tools/normalize-qa-cards.mjs
// 1) 대상 카드 줄을 소스에서 재생성(ws_auto 번호→KO명)
// 2) 본문 「」 카드명을 JP원문과 순서 정렬해 ws_auto KO명으로 교체(미번역 JP·오역 KO 모두)
// ws_auto에 없는 최신 카드는 원문 유지.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WS = "C:/Users/diash/AI_Project/ws_auto/data";
const splitNo = (n) => { const m = String(n).match(/^(.*-[A-Z]{0,2}\d+)([A-Za-z]*)[^A-Za-z0-9]*$/); return m ? m[1] : String(n); };

// ── ws_auto 맵 ──
const koByNo = {};
for (const f of fs.readdirSync(WS).filter((n) => /^translations\.\d+\.json$/.test(n))) {
  const j = JSON.parse(fs.readFileSync(path.join(WS, f), "utf8"));
  for (const [no, v] of Object.entries(j)) if (v && v.name) koByNo[splitNo(no)] = v.name;
}
const cards = JSON.parse(fs.readFileSync(path.join(WS, "all_cards.json"), "utf8"));
const koByJp = {};
for (const c of cards) { const b = splitNo(c.card_number); if (c.card_name && koByNo[b]) koByJp[c.card_name] = koByNo[b]; }

// ── 소스 Q&A ──
const qa = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "qa.ja.json"), "utf8"));
const byId = {}; for (const x of qa) byId[x.id] = x;
const clean = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const jpQuotes = (x) => [...(clean(x.question) + "\n" + clean(x.answer)).matchAll(/「([^「」]*)」/g)].map((m) => m[1]);

// ── 대상 카드 줄 ──
function targetLine(x) {
  if (!x) return "특정 카드 지정 없음";
  const items = [];
  for (const d of x.display_cards || []) {
    const s = String(d).replace(/^\[|\]$/g, "");
    const wn = s.match(/^\s*([A-Z0-9]{2,6}\/[A-Za-z0-9-]+)\s*[:：]\s*([\s\S]+?)\s*$/); // [번호:이름]
    if (wn) {
      const no = wn[1], jp = wn[2].trim(), ko = koByNo[splitNo(no)];
      items.push(ko ? `${no} ${ko} (${jp})` : `${no} (${jp})`);
    } else { // 번호만(여러 개 가능)
      for (const no of s.match(/[A-Z0-9]{2,6}\/[A-Za-z0-9-]+/g) || []) {
        const ko = koByNo[splitNo(no)];
        items.push(ko ? `${no} ${ko}` : no);
      }
    }
  }
  if (items.length) return items.length <= 6 ? items.join(" · ") : items.slice(0, 3).join(" · ") + ` 외 ${items.length - 3}종`;
  const nums = [...new Set((x.card_number || "").match(/[A-Z0-9]{2,6}\/[A-Za-z0-9-]+/g) || [])];
  if (!nums.length) return "특정 카드 지정 없음";
  if (nums.length <= 3) return nums.map((no) => (koByNo[splitNo(no)] ? `${no} ${koByNo[splitNo(no)]}` : no)).join(" · ");
  return `적용 카드 ${nums.length}종`;
}

// ── README 처리 ──
const P = path.join(ROOT, "docs", "qa", "cards", "README.md");
let txt = fs.readFileSync(P, "utf8");
const i0 = txt.search(/^## Q\d/m);
const head = txt.slice(0, i0).trimEnd();
const blocks = txt.slice(i0).split(/(?=^## Q\d)/m).filter((b) => /^## Q\d/.test(b));

let nameFix = 0, tgtFix = 0, aligned = 0, skipped = 0;
const out = blocks.map((block) => {
  const id = +block.match(/^## Q(\d+)/)[1];
  const x = byId[id];
  const hLine = block.match(/^## Q\d.*$/m)[0];
  const qIdx = block.search(/^\*\*Q\.\*\*/m);
  if (qIdx < 0) return block.trimEnd();
  let body = block.slice(qIdx).trimEnd(); // **Q.** 이후

  // 1) 본문 「」 카드명 정렬 교체
  const jpq = jpQuotes(x);
  const koCount = (body.match(/「[^「」]*」/g) || []).length;
  if (jpq.length && jpq.length === koCount) {
    aligned++;
    let k = 0;
    body = body.replace(/「[^「」]*」/g, (m) => {
      const jp = (jpq[k] || "").trim(); k++;
      const ko = koByJp[jp];
      if (ko && `「${ko}」` !== m) { nameFix++; return `「${ko}」`; }
      return m;
    });
  } else if (jpq.length) skipped++;

  const tl = `**대상 카드**: ${targetLine(x)}`;
  tgtFix++;
  return `${hLine}\n${tl}\n${body}`;
});

fs.writeFileSync(P, head + "\n\n" + out.join("\n\n") + "\n");
console.log(`✔ ${blocks.length}건 처리 | 대상 카드 재생성 ${tgtFix} | 「」정렬 ${aligned}건(정렬불일치 ${skipped}건) | 카드명 교체 ${nameFix}곳`);
