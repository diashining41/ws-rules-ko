// stitch-advanced.mjs — 응용 플로어 룰 파트들을 advanced.md 하나로 합침
//   node tools/stitch-advanced.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "docs", "floor-rule", "parts");
const read = (f) => fs.readFileSync(path.join(P, f), "utf8");
const stripHdr = (s) => s.replace(/^﻿?\s*<!--[\s\S]*?-->\s*/, "").trim();

const header = `<!--
바이스슈발츠 응용 플로어 룰 ver.1.2.12 (2026-07-09) 한글판
원본: https://ws-tcg.com/wordpress/wp-content/uploads/2026/07/09103406/floor_app_ver1-2-12.pdf
이 PDF는 「응용 플로어 룰」과 「벌칙 규정」 두 문서로 구성됨. 용어: ../../GLOSSARY.md 기준.
-->

# 바이스슈발츠 응용 플로어 룰

> **ver. 1.2.12** — 2026년 7월 9일. 원문 구성(응용 플로어 룰 + 벌칙 규정) 그대로.
`;

let body = [
  stripHdr(read("adv-1.md")),   // 응용FR 部1-2
  stripHdr(read("adv-2.md")),   // 응용FR 部3-5 + 부칙
  "\n---\n",
  read("adv-3-intro.md").trim(), // # 벌칙 규정 + 서문 (직접 번역)
  stripHdr(read("adv-3.md")),   // 벌칙 部1-3
  stripHdr(read("adv-4.md")),   // 벌칙 部4-5 + 갱신이력 + 참고
].join("\n\n");

// 파일 내 표기 통일: 巻き戻し 되감기 → 되돌림(룰북 11장·서문과 일치)
body = body.replace(/되감기/g, "되돌림");

const outFile = path.join(ROOT, "docs", "floor-rule", "advanced.md");
fs.writeFileSync(outFile, header + "\n" + body + "\n");
console.log(`✔ advanced.md 작성 — ${(fs.statSync(outFile).size/1024|0)}KB`);
console.log(`   ## 수: ${(body.match(/^## /gm)||[]).length}, ### 수: ${(body.match(/^### /gm)||[]).length}`);
