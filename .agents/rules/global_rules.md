# 전역 개발 규칙 (Global Development Rules)

이 프로젝트는 자격증 공부를 위한 문제 작성, 분석, 학습 보조(연습, 모의시험) 시스템 구축을 목적으로 하며, Google Apps Script(GAS)와 Supabase를 결합하여 구현됩니다.

## 1. 프로젝트 개요 (Project Overview)
- **목적:** 효율적인 자격증 학습을 위한 통합 관리 및 풀이 시스템 구축.
- **기술 스택:**
  - **프론트엔드:** GAS Web App (HTML/JS/Tailwind CSS)
  - **백엔드:** Google Apps Script (GAS)
  - **데이터베이스:** Supabase (PostgreSQL)
  - **로깅:** Google Sheet

## 2. 보안 지침 (Security Guidelines)
- **민감 정보 보호:** Supabase URL, API Key, Google Sheet ID 등은 절대 코드에 하드코딩하지 않습니다.
- **환경 변수 활용:** 모든 설정값은 GAS의 `PropertiesService.getScriptProperties()`를 통해 관리합니다.

## 3. 에러 처리 및 로깅 (Error Handling & Logging)
- **Try-Catch 적용:** 모든 외부 통신(Supabase, Drive API 등) 및 핵심 로직은 반드시 `try-catch` 블록으로 보호합니다.
- **공통 로깅:** 에러 발생 시 공통 로깅 모듈(`sheetLogger`)을 호출하여 발생 시간, 상태 코드, 메시지를 기록합니다.

## 4. 응답 및 통신 규격 (Communication Standards)
- **일관된 응답:** 백엔드와 클라이언트 간의 데이터 통신은 항상 `{ success: boolean, data: any, error: string }` 형식의 JSON 객체를 사용합니다.
- **비동기 처리:** `google.script.run`을 사용하여 클라이언트와 비동기적으로 통신합니다.

## 5. GAS 코딩 및 구조 규칙 (GAS Coding Rules)
- **전역 변수 관리:** `JS.html` 최상단에서 상태값을 집중 관리하며, 변수 중복 선언을 방지합니다.
- **함수 명칭:** 기능/페이지별 접두어(예: `initSolvePage`, `renderAnalyzeList`)를 사용하여 충돌을 방지합니다.
- **파일 모듈화:** `Index`, `CSS`, `JS`, `Page_XXX` 단위로 파일을 분리하여 유지보수성을 높입니다.
- **캐시 우선:** 데이터 조회 시 전역 메모리 캐시(`allQuestions`)를 먼저 참조하고 필요한 경우에만 서버와 동기화합니다.
