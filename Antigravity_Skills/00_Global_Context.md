## 1. 프로젝트 개요 (Project Overview)
* **목적:** 자격증 공부를 위한 문제 작성, 분석, 학습 보조(연습, 모의시험) 시스템 구축.
* **환경:** Antigravity AI를 활용한 단계별 기능 구현 및 점검.

## 2. 기술 스택 (Tech Stack)
* **프론트엔드 (클라이언트):** Google Apps Script (GAS) Web App 기반 (HTML/JS)
* **백엔드 (API 라우터):** Google Apps Script (GAS)
* **데이터베이스:** Supabase
* **로깅 시스템:** Google Sheet
* **버전 관리 및 배포:** Git, Google `clasp` (URL 유지 배포)

## 3. 데이터 흐름 (Data Flow)
1. **요청:** 클라이언트(GAS Web App)에서 GAS 백엔드(API)로 데이터 요청.
2. **처리:** GAS 라우터가 요청을 분류하고 비즈니스 로직(문제 작성, 채점 등) 수행.
3. **저장/조회:** GAS에서 Supabase의 REST API를 호출하여 데이터 CRUD 수행.
4. **로깅:** 에러 발생 또는 특정 기능 확인 필요 시, GAS에서 Google Sheet로 로그 데이터(Timestamp, HTTP 상태 코드, 오류 메시지) 전송.

## 4. 전역 개발 규칙 (Global Rules)
모든 하위 스킬(기능) 구현 시 다음 규칙을 절대적으로 준수할 것.
* **보안 (Security):** Supabase URL, API Key, Google Sheet ID 등 민감한 정보는 코드 내에 하드코딩하지 않는다. 반드시 GAS의 `PropertiesService.getScriptProperties()`를 통해 호출한다.
* **에러 처리 (Error Handling):** 모든 외부 통신(Supabase) 및 핵심 로직은 `try-catch` 블록으로 감싼다. 에러 발생 시 반드시 공통 로깅 모듈(`sheetLogger`)을 호출하여 시트에 기록한다.
* **응답 규격 (Response Format):** 클라이언트와 GAS 백엔드 간의 데이터 통신 결과는 성공/실패 여부와 메시지, 데이터를 포함한 일관된 JSON 객체 형태로 반환한다.

## 5. GAS 코딩 및 구조 규칙 (GAS Coding Rules)
v60 변수 중복 선언 에러 재발 방지를 위해 다음 수칙을 반드시 준수할 것.
* **전역 변수 관리 (JS.html):** 
  * 모든 전역 변수(상태값)는 `JS.html` 최상단에 집중 배치한다.
  * 중복 선언 방지를 위해 `let/const` 대신 `var`를 사용하는 것을 권장하며(GAS 통합 시 충돌 완화), 가능한 한 단일 초기화 블록에서 관리한다.
* **함수 명칭 중복 방지:** 페이지별 모듈(`Page_XXX.html`) 내 함수명은 `initSolvePage`, `renderAnalyzeList`와 같이 기능/페이지를 유추할 수 있는 접두어를 사용하여 전역 공간에서의 충돌을 피한다.
* **단일 스크립트 태그:** `Index.html`에서 여러 파일을 include할 때 스크립트 태그가 중첩되거나 변수가 사방에 흩어지지 않도록 구조를 정돈한다.
* **캐시 우선순위:** 데이터 조회 시 항상 글로벌 메모리 캐시(`allQuestions`)를 먼저 참조하고, 필요한 경우에만 서버 동기화를 트리거한다.