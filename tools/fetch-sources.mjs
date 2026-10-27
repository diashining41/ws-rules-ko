// fetch-sources.mjs — sources/ 를 공식 사이트에서 새로 받아 재구성한다.
//   node tools/fetch-sources.mjs                 전체
//   node tools/fetch-sources.mjs rulebook qa     일부만
//
// sources/ 는 원본 재배포 방지를 위해 git에 넣지 않는다. 새 PC에서는 이 스크립트로 복원한다.
// 필요 도구: node 18+ , pdftotext (xpdf 또는 poppler-utils) — PDF 항목에만 필요.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "sources");
const RULES_PAGE = "https://ws-tcg.com/rules/";
const UA = { "User-Agent": "Mozilla/5.0" };

fs.mkdirSync(SRC, { recursive: true });

const node = (args) => execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });

async function download(url, name) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(SRC, name), buf);
  console.log(`  ↓ ${name} (${(buf.length / 1024).toFixed(0)}KB)`);
  return buf;
}

// xpdf판 pdftotext 는 -v 가 종료코드 99라서 "실행됐는가"만 본다(ENOENT = 미설치).
let hasPdftotext = true;
try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); }
catch (e) { if (e.code === "ENOENT") hasPdftotext = false; }

function pdf2txt(pdfName, txtName) {
  if (!hasPdftotext) { console.log(`  ! pdftotext 없음 — ${txtName} 건너뜀 (xpdf/poppler 설치 후 재실행)`); return; }
  // -raw 필수: 2단 조판 + CJK 임베드 폰트라 이 옵션이 없으면 읽기 순서가 깨진다.
  execFileSync("pdftotext", ["-enc", "UTF-8", "-raw", path.join(SRC, pdfName), path.join(SRC, txtName)]);
  console.log(`  → ${txtName} (${(fs.statSync(path.join(SRC, txtName)).size / 1024).toFixed(0)}KB)`);
}

async function page(url, htmlName, txtName) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  fs.writeFileSync(path.join(SRC, htmlName), html);
  console.log(`  ↓ ${htmlName} (${(html.length / 1024).toFixed(0)}KB)`);
  const out = node(["tools/html-to-text.mjs", `sources/${htmlName}`, `sources/${txtName}`]);
  console.log("  → " + out.split("\n")[0].replace(/^✔ /, ""));
}

// ── 공식 룰 페이지에서 현행 PDF 링크를 찾아낸다(버전이 올라가도 그대로 동작) ──
let pdfs = null;
async function findPdfs() {
  if (pdfs) return pdfs;
  const html = await (await fetch(RULES_PAGE, { headers: UA })).text();
  const links = [...new Set([...html.matchAll(/href="([^"]*\.pdf)"/gi)].map((m) => m[1]))];
  const pick = (re) => links.find((l) => re.test(l.split("/").pop()));
  pdfs = {
    rulebook: pick(/^WS_rule_/i),
    basic: pick(/^floor_bsc/i),
    advanced: pick(/^floor_app/i),
  };
  return pdfs;
}

const TASKS = {
  async rulebook() {
    const { rulebook } = await findPdfs();
    if (!rulebook) throw new Error("종합 룰 PDF 링크를 찾지 못함 — " + RULES_PAGE + " 확인");
    const name = rulebook.split("/").pop();                 // WS_rule_1.113.pdf
    const ver = name.replace(/^WS_rule_|\.pdf$/g, "");
    await download(rulebook, name);
    pdf2txt(name, `WS_rule_${ver}.ja.txt`);
    console.log(`  · 현행 종합 룰 ver.${ver}  ${rulebook}`);
    return ver;
  },
  async floor() {
    const { basic, advanced } = await findPdfs();
    if (basic) { await download(basic, "floor_basic.pdf"); pdf2txt("floor_basic.pdf", "floor_basic.ja.txt"); }
    if (advanced) { await download(advanced, "floor_advanced.pdf"); pdf2txt("floor_advanced.pdf", "floor_advanced.ja.txt"); }
    console.log(`  · 기본 ${basic || "?"}\n  · 응용 ${advanced || "?"}`);
  },
  deck: () => page("https://ws-tcg.com/rules/deck_rule/", "deck_rule.ja.html", "deck_rule.ja.txt"),
  penalty: () => page("https://ws-tcg.com/rules/penalty/", "penalty.ja.html", "penalty.ja.txt"),
  qa: () => { console.log(node(["tools/scrape-qa.mjs"]).trim().split("\n").map((l) => "  " + l).join("\n")); },
  errata: () => { console.log(node(["tools/scrape-errata.mjs"]).trim().split("\n").slice(0, 4).map((l) => "  " + l).join("\n")); },
};

const want = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const run = want.length ? want : Object.keys(TASKS);
const bad = run.filter((k) => !TASKS[k]);
if (bad.length) { console.error(`알 수 없는 항목: ${bad.join(", ")}\n사용 가능: ${Object.keys(TASKS).join(" ")}`); process.exit(1); }

for (const k of run) {
  console.log(`\n[${k}]`);
  try { await TASKS[k](); } catch (e) { console.error(`  ✘ 실패: ${e.message}`); process.exitCode = 1; }
}

console.log(`\n✔ sources/ ${fs.readdirSync(SRC).length}개 파일`);
console.log("  카드명 병기용 sources/qa_names.json · errata_names.json 은 별도 도구가 필요합니다 (CLAUDE.local.md 참고).");
