// scrape-qa.mjs — ws-tcg Q&A(FAQ) 전체를 구조화 JSON으로 저장
//   node tools/scrape-qa.mjs
// API: https://ws-tcg.com/manage/faq/searchJson?page=N  → {total, page, limit, items:[{id,update_time,question,answer,card_number,display_cards}]}
// 출력: sources/qa.ja.json (전체), 일반 룰(카드 미지정)만 별도 카운트

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://ws-tcg.com/manage/faq/searchJson";
const OUT = path.join(ROOT, "sources", "qa.ja.json");

const get = async (page) => {
  const r = await fetch(`${API}?page=${page}`, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
  if (!r.ok) throw new Error(`page ${page}: ${r.status}`);
  return r.json();
};

const first = await get(1);
const limit = first.limit || 30;
const total = first.total || 0;
const pages = Math.ceil(total / limit);
console.log(`총 ${total}건 / ${limit}건씩 / ${pages}페이지 수집…`);

const items = [...first.items];
for (let p = 2; p <= pages; p++) {
  const j = await get(p);
  items.push(...(j.items || []));
  if (p % 5 === 0 || p === pages) console.log(`  ${items.length}/${total}`);
}

// id 기준 정렬(오름차순 = 오래된 것부터; 일본판은 기본 신규순이나 id로 안정 정렬)
items.sort((a, b) => a.id - b.id);
const general = items.filter((x) => !(x.card_number && x.card_number.trim()) && !(x.display_cards && x.display_cards.length));
fs.writeFileSync(OUT, JSON.stringify(items, null, 1));
console.log(`✔ ${items.length}건 → ${path.relative(ROOT, OUT)}`);
console.log(`   일반 룰(카드 미지정) ${general.length}건 / 카드 지정 ${items.length - general.length}건`);
console.log(`   샘플 Q${items[0].id}: ${items[0].question.slice(0, 50)}`);
