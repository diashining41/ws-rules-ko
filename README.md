# 바이스슈발츠 룰 한글화 (ws_rules)

👉 **공개 페이지: https://diashining41.github.io/ws-rules-ko/**

[ws-tcg.com/rules](https://ws-tcg.com/rules/) 의 일본판 자료(종합 룰·Q&A·에라타·덱 구축 규칙·플로어 룰)를 **일본판 구성에 최대한 맞춰** 한국어로 옮기는 프로젝트.

용어는 바이스슈발츠 카드의 한글 표기(카드명·능력 텍스트)에 맞춰, 룰북과 카드가 동일 용어를 쓰도록 한다. → **[GLOSSARY.md](GLOSSARY.md)**

## 진행 현황

| 자료 | 소스 | 상태 |
|------|------|------|
| 종합 룰(룰북) ver.1.112 | PDF 23p, 11챕터 | ✅ 완료 (667섹션 1:1 검증) |
| 에라타 카드 리스트 | HTML 167항목 | ✅ 완료 (카드명 원문 병기) |
| 덱 구축 규칙 | HTML | ✅ 완료 (165작품 · 특례 169장 · 제한 249종) |
| Q&A (일반 룰) | 동적 DB 97건 | ✅ 완료 (1단계) |
| Q&A (카드 지정) | 동적 DB 612건 | ✅ 완료 (2단계, Q번호 역순) |
| 플로어 룰(기본/응용) | PDF 2종 | ✅ 완료 (응용=2문서·10部) |
| 페널티 이력 | HTML 22건 | ✅ 완료 |

## 구조

```
CLAUDE.md            작업 지침 · 새 PC 셋업 · 룰 갱신 절차
GLOSSARY.md          JP→KR 용어 기준
docs/                한글판 원고 (실제 소스)
  rulebook/          종합 룰 한글판 (챕터별 01~11)
  errata/ deck-rule/ floor-rule/ penalty/ qa/general/ qa/cards/
tools/
  fetch-sources.mjs  sources/ 복원·갱신 (공식 사이트에서 재수집)
  check-sections.mjs 원문 대비 섹션 번호 완전성 검증
  build-site.mjs     docs/**/*.md → index.html
sources/             (git 미포함) 일본판 원본 + 추출 텍스트
index.html           빌드 산출물 — GitHub Pages가 이 파일을 서빙
```

원본 재배포를 피하려고 `sources/` 는 커밋하지 않는다. `fetch-sources.mjs` 가 공식 사이트에서 다시 받는다.

## 시작하기

필요한 것은 **Node.js 18+** 와 **Git for Windows**(`pdftotext` 동봉) 뿐. npm 의존성은 없다.
macOS/Linux는 `poppler-utils` 를 따로 설치한다.

```bash
git clone https://github.com/diashining41/ws-rules-ko.git ws_rules && cd ws_rules
node tools/fetch-sources.mjs      # sources/ 복원 (약 4MB, 2~3분)
node tools/check-sections.mjs     # 섹션 번호 1:1 검증
node tools/build-site.mjs         # index.html 재생성
```

자세한 작업 지침과 룰 갱신 절차는 **[CLAUDE.md](CLAUDE.md)**.

## 소스 추출

종합 룰 PDF는 임베디드 CJK 폰트라 **`-raw` 옵션**이 있어야 2단 조판이 올바른 읽기 순서로 추출된다.
`fetch-sources.mjs` 가 이 옵션으로 자동 처리하며, 수동으로는:

```bash
pdftotext -enc UTF-8 -raw sources/WS_rule_1.112.pdf sources/WS_rule_1.112.ja.txt
```

카드 타입·카운터·클록·소울·트리거 등 **아이콘 심볼 글리프는 빠지므로**, 한글판에서 `[카운터 아이콘]` 형태로 보완한다.

## 검증

```bash
node tools/check-sections.mjs   # 원문의 모든 섹션 번호가 한글판에 존재하는지 확인
```

## 버전

- 종합 룰: **ver. 1.112** (2026-08-24)
- 원본 URL: `https://ws-tcg.com/wordpress/wp-content/uploads/2026/08/24155315/WS_rule_1.112.pdf`

## 면책

팬 제작 비공식 참고용(비영리). 룰·카드 데이터 출처 ⓒ BushiRoad / ws-tcg.com. BushiRoad와 제휴 관계 없음.
