# CLAUDE.md — 작업 지침

[ws-tcg.com/rules](https://ws-tcg.com/rules/) 의 일본판 공식 룰 자료를 한국어로 옮겨,
자체 완결형 단일 HTML 페이지로 배포하는 프로젝트.
공개 페이지: **https://diashining41.github.io/ws-rules-ko/**

---

## 새 PC 셋업

필요한 것은 두 가지뿐이다. npm 패키지 의존성은 없다.

| 도구 | 비고 |
|------|------|
| **Node.js 18+** (검증: 24.x) | `npm install` 불필요 — 전부 표준 라이브러리 + `fetch` |
| **Git for Windows** | `pdftotext.exe`(xpdf 4.x)가 **같이 설치된다**. Git Bash에서 바로 쓸 수 있고, PowerShell에서 쓰려면 `C:\Program Files\Git\mingw64\bin` 을 PATH에 추가. macOS/Linux는 `poppler-utils` 설치 |

```sh
git clone https://github.com/diashining41/ws-rules-ko.git ws_rules
cd ws_rules
node tools/fetch-sources.mjs      # sources/ 복원 — 공식 사이트에서 재수집 (약 4MB, 2~3분)
node tools/check-sections.mjs     # 룰북 섹션 번호 JP↔KR 1:1 검증
node tools/build-site.mjs         # index.html · site/artifact.html 재생성
```

`sources/`(부시로드 원본 PDF·HTML·추출 텍스트)는 **원본 재배포를 피하려고 git에 넣지 않는다.**
위 `fetch-sources.mjs` 가 공식 사이트에서 다시 받아 동일한 파일을 만든다 (PDF 추출 결과까지 바이트 단위 일치 확인됨).

단, 카드명 병기에 쓰는 `sources/qa_names.json` · `sources/errata_names.json` 은
별도 로컬 도구가 필요하다 → **`CLAUDE.local.md`** (git 미포함, PC 간 직접 복사).
이 두 파일이 없어도 룰북·플로어 룰·페널티 작업과 사이트 빌드는 정상 동작한다.

## 구조

```
GLOSSARY.md            JP→KR 용어 기준 (룰북과 카드가 같은 용어를 쓰도록)
docs/                  한글판 원고 (이것이 진짜 소스)
  rulebook/            종합 룰 00~11
  errata/ deck-rule/ floor-rule/ penalty/ qa/general/ qa/cards/
tools/
  fetch-sources.mjs    sources/ 복원·갱신
  scrape-qa.mjs        Q&A 동적 DB 수집
  scrape-errata.mjs    에라타 페이지 수집
  html-to-text.mjs     정적 HTML → 구조화 텍스트
  check-sections.mjs   룰북 섹션 번호 1:1 검증
  build-site.mjs       docs/**/*.md → index.html
sources/               (git 미포함) 일본판 원본 + 추출 텍스트
index.html             빌드 산출물 — GitHub Pages가 이 파일을 그대로 서빙
```

빌드는 `docs/**/*.md` → `index.html` 단방향이다. **`index.html` 을 직접 고치지 말 것** — 다음 빌드에 덮어써진다.

## 룰 갱신 절차

```sh
node tools/fetch-sources.mjs          # 현행 버전 감지 + 전체 재수집
```
출력의 `· 현행 종합 룰 ver.X.XXX` 로 새 버전을 확인한다. 올라갔다면:

1. `sources/WS_rule_<신>.ja.txt` 와 `<구>.ja.txt` 를 diff 해서 실제 변경 조항만 뽑는다.
2. 해당 `docs/rulebook/*.md` 를 수정한다. 각 파일 머리주석의 버전·날짜도 함께 올린다.
3. **개정 표시 이관** — 이전 판에 달린 `<span class="revised">` 를 모두 걷어내고 이번 판 변경분에만 새로 단다.
   공식 룰북이 최신 개정분을 빨간색으로 표기하는 방식을 그대로 따른 것. `00-표지-목차.md` 의 해당 섹션 목록도 갱신.
4. `docs/rulebook/11-기타.md` 의 개정 이력에 새 항목 추가.
5. 버전 문자열이 박힌 곳: `tools/check-sections.mjs`(소스 파일명) · `tools/build-site.mjs`(2곳) · `README.md` · `docs/rulebook/00-표지-목차.md`
6. `node tools/check-sections.mjs` → 섹션 수 1:1 통과 확인 → `node tools/build-site.mjs`
7. 커밋·푸시하면 GitHub Pages가 자동 배포한다 (1~2분).

Q&A·에라타·덱 구축 규칙은 `fetch-sources.mjs` 결과를 이전 `sources/` 와 비교해 증분만 반영한다.
Q&A 카드 지정분은 **Q번호 역순(최신이 위)** 이므로 신규 항목은 문서 맨 위에 넣는다.

> 참고: 공식 페이지 내용이 예고 없이 빠지는 일이 있다. 재수집 결과가 기존 `sources/` 보다
> 짧아졌다면 반드시 diff로 확인하고, 상류에서 사라진 내용을 문서에서 지울지는 따로 판단한다.

## 지켜야 할 것

- **이미지 금지** — 저작권 우려로 공개 페이지에 이미지를 넣지 않는다.
  아이콘은 아이콘 이름 텍스트로, 카드 이미지는 생략, 에라타는 링크 대신 출처 안내 문구로 대체한다.
- **면책 문구** — 공개 페이지에 "면책"이라는 단어와 "제휴·후원 관계가 없습니다" 류의 표현을 쓰지 않는다.
  현재 문구: `팬 제작 비공식 참고용(비영리)입니다. 룰 출처 ⓒ BushiRoad / ws-tcg.com.`
- **`sources/` 미배포** — 원본 PDF·HTML·추출 텍스트는 커밋하지 않는다.
- **원문 오타는 고치지 않는다** — 일본판 원문의 오기·오타는 그대로 옮긴다 (참조 번호 오기 포함).
  단 상류가 다음 판에서 고치면 그때 따라간다.
- **용어는 GLOSSARY.md 기준** — 룰북 용어는 실제 한글판 카드의 표기를 따른다.
  카드 텍스트 표기와 룰북 표기가 갈릴 때는 카드 쪽을 택한다 (예: `CX 페이즈`, `CX존`, `앙코르`, `스톡`).
- **번역 방침** — 일본판 구성을 **최대한** 따르되, 한국어로 어색한 직역은 피한다.

## 세션 설정

`~/.claude/settings.json` 의 `cleanupPeriodDays` 기본값이 30이라 오래된 세션 기록이 지워진다.
새 PC에서도 다음을 넣어둘 것:

```json
{ "cleanupPeriodDays": 3650 }
```
