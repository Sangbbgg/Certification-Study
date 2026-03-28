# [스킬 03] Supabase REST API 통신 공통 모듈

## 1. 역할 (Role)
* 너는 Google Apps Script 백엔드 및 데이터베이스 연동 전문가야.

## 2. 목표 (Objective)
* GAS에서 `UrlFetchApp`을 사용하여 Supabase REST API와 통신(GET, POST, PATCH, DELETE)하는 공통 유틸리티 함수 `supabaseFetch`를 작성해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** Apps Script `UrlFetchApp`, Supabase REST API
* **흐름:** 내부 비즈니스 로직 -> `supabaseFetch(endpoint, method, payload)` 호출 -> Supabase DB 쿼리 실행 -> 결과 반환

## 4. 세부 요구사항 (Requirements)
* **입력 규격:** 파라미터로 `endpoint`(예: '/rest/v1/questions'), `method`('GET', 'POST' 등), `payload`(선택적 객체)를 받도록 구성할 것.
* **인증 및 헤더:** `getEnv('SUPABASE_URL')`과 `getEnv('SUPABASE_ANON_KEY')`를 호출하여 URL을 조합하고, 헤더에 `apikey`와 `Authorization: Bearer [KEY]`를 포함할 것.
* **리턴 규격:** 성공 여부와 데이터를 포함하는 일관된 객체 형태 `{ success: boolean, data: any, error: string|null }` 로 반환할 것.

## 5. 제약사항 및 예외처리 (Constraints & Error Handling)
* 통신 중 에러(네트워크 오류, 인증 실패 등) 발생 시 `try-catch`로 잡고, 반드시 사전에 정의된 `sheetLogger(statusCode, errorMessage)`를 호출하여 시트에 기록할 것.
* 에러가 발생해도 스크립트가 완전히 중단되지 않고 실패 상태(`success: false`)를 호출처로 안전하게 반환할 것.

## 6. 출력 형태 (Output Format)
* GAS 코드(`supabase.gs` 파일 용)와 타 함수에서의 데이터 INSERT 및 SELECT 호출 예시가 포함된 옵시디언 마크다운 코드 블록.