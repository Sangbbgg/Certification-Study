# [스킬 02] Google Sheet 에러 로깅 모듈

## 1. 역할 (Role)
* 너는 Google Apps Script 백엔드 개발자야.

## 2. 목표 (Objective)
* 시스템 에러 발생 시 지정된 Google Sheet에 로그를 기록하는 공통 모듈 `sheetLogger` 함수를 작성해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** Apps Script, Google Sheet API, PropertiesService
* **흐름:** 내부 로직 에러 발생 -> `sheetLogger(statusCode, errorMessage)` 호출 -> Sheet 최하단에 행 추가

## 4. 세부 요구사항 (Requirements)
* **입/출력 규격:** 파라미터 `(statusCode, errorMessage)` 수신.
* **데이터 스키마:** 시트에 추가될 배열 구성은 `[Timestamp(가독성 좋은 날짜/시간 포맷 자동생성), statusCode, errorMessage]` 순서로 할 것.
* **핵심 로직:** `SpreadsheetApp.openById()`를 사용하여 시트를 열고 1번째 시트(Sheet1)에 `appendRow()`로 데이터를 삽입할 것.

## 5. 제약사항 및 예외처리 (Constraints & Error Handling)
* **보안:** Google Sheet ID는 절대 코드에 하드코딩하지 말고 `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`를 통해 동적으로 불러올 것.
* **예외처리:** 시트 ID 오류나 할당량 초과 등으로 로깅 함수 자체에서 에러가 발생하더라도 메인 비즈니스 프로세스가 중단되지 않도록 로깅 로직 전체를 `try-catch`로 감싸고 묵음(Silent fail) 처리할 것.

## 6. 출력 형태 (Output Format)
* GAS 코드(`logger.gs` 파일 용)와 타 함수에서의 호출 예시가 포함된 옵시디언 마크다운 코드 블록.