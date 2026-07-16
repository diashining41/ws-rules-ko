# 바이스슈발츠 룰 한글화 (ws_rules)

👉 **공개 페이지: https://diashining41.github.io/ws-rules-ko/**

[ws-tcg.com/rules](https://ws-tcg.com/rules/) 의 일본판 자료(종합 룰·Q&A·에라타·덱 구축 규칙·플로어 룰)를 **일본판 구성에 최대한 맞춰** 한국어로 옮기는 프로젝트.

용어는 인접 프로젝트 **`ws_auto`(전 166작품·기본카드 41,629종 한글화)** 코퍼스 표기에 맞춰, 룰북과 카드 텍스트가 동일 용어를 쓰도록 한다. → **[GLOSSARY.md](GLOSSARY.md)**

## 진행 현황

| 자료 | 소스 | 상태 |
|------|------|------|
| 종합 룰(룰북) ver.1.111 | PDF 23p, 11챕터 | ✅ 완료 (660섹션 1:1 검증) |
| 에라타 카드 리스트 | HTML 167항목 | ✅ 완료 (카드명 ws_auto 병기) |
| 덱 구축 규칙 | HTML | ✅ 완료 (165작품·388/389 카드) |
| Q&A (일반 룰) | 동적 DB 97건 | ✅ 완료 (1단계) |
| Q&A (카드 지정) | 동적 DB 610건 | ⏸ 2단계 (요청 시) |
| 플로어 룰(기본/응용) | PDF 2종 | ✅ 완료 (응용=2문서·10部) |
| 페널티 이력 | HTML 22건 | ✅ 완료 |

## 구조

```
GLOSSARY.md          JP→KR 용어 기준 (ws_auto 코퍼스 정렬)
sources/             일본판 원본 + 추출 텍스트
  WS_rule_1.111.pdf
  WS_rule_1.111.ja.txt   (pdftotext -enc UTF-8 -raw)
docs/
  rulebook/          종합 룰 한글판 (챕터별 01~11)
  errata/ deck-rule/ floor-rule/ penalty/ qa/general/
tools/
  check-sections.mjs 원문 대비 섹션 번호 완전성 검증
```

## 소스 추출

종합 룰 PDF는 임베디드 CJK 폰트라 **`-raw` 옵션**이 있어야 2단 조판이 올바른 읽기 순서로 추출된다:

```bash
pdftotext -enc UTF-8 -raw sources/WS_rule_1.111.pdf sources/WS_rule_1.111.ja.txt
```

카드 타입·카운터·클록·소울·트리거 등 **아이콘 심볼 글리프는 빠지므로**, 한글판에서 `[카운터 아이콘]` 형태로 보완한다.

## 검증

```bash
node tools/check-sections.mjs   # 원문의 모든 섹션 번호가 한글판에 존재하는지 확인
```

## 버전

- 종합 룰: **ver. 1.111** (2026-05-19)
- 원본 URL: `https://ws-tcg.com/wordpress/wp-content/uploads/2026/05/19125324/WS_rule_1.111.pdf`

## 면책

팬 제작 비공식 참고용(비영리). 룰·카드 데이터 출처 ⓒ BushiRoad / ws-tcg.com. BushiRoad와 제휴 관계 없음.
