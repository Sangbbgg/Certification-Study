# [스킬 00] 환경변수(PropertiesService) 관리 모듈

## 1. 역할 (Role)
* 너는 Google Apps Script 보안 및 환경설정 전문가야.

## 2. 목표 (Objective)
* 프로젝트 전체에서 사용할 민감한 정보(Sheet ID, Folder ID, Supabase URL, API Key 등)를 `PropertiesService`를 이용해 안전하게 저장하고 불러오는 공통 유틸리티 모듈을 작성해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** Apps Script `PropertiesService`
* **흐름:** 초기 1회 세팅 함수 실행(환경변수 저장) -> 타 모듈에서 환경변수 호출 함수 사용(값 로드)

## 4. 세부 요구사항 (Requirements)
* **환경변수 세팅 함수:** `setEnvironmentVariables()`를 작성하여 하단에 제공된 [7. 실제 키 값 데이터]를 GAS의 Script Properties에 한 번에 등록하는 코드를 작성할 것. (이 함수는 1회 실행 후 코드에서 삭제하거나 주석 처리할 용도임)
* **환경변수 호출 함수:** `getEnv(key)`라는 공통 함수를 작성하여, 특정 키를 입력하면 저장된 값을 반환하도록 할 것.

## 5. 제약사항 및 예외처리 (Constraints & Error Handling)
* `getEnv(key)` 호출 시 해당 키에 대한 값이 존재하지 않을 경우, 즉시 명확한 에러(예: "환경변수 [KEY]가 설정되지 않았습니다.")를 발생(`throw new Error`)시켜 원인을 빠르게 파악할 수 있도록 예외 처리를 반드시 포함할 것.
* 출력하는 코드 내의 `setEnvironmentVariables()` 함수 안에 하단의 [7. 실제 키 값 데이터]를 정확히 매핑하여 작성할 것.

## 6. 출력 형태 (Output Format)
* GAS 코드(`env.gs` 파일 용)와 초기 세팅 실행 방법이 포함된 옵시디언 마크다운 코드 블록.

## 7. 실제 키 값 데이터 (User Input)
* **SHEET_ID:** 1V8ZtedtdRgXU_iuvWGB1nGUW1E2nkL_-DThdhPG6qwk
* **IMAGE_FOLDER_ID:** 1U3AB-dZeUGcsjyoFV61yJD_whs5toWaE
* **SUPABASE_URL:** https://gpckpydodsyxilljycnk.supabase.co
* **SUPABASE_ANON_KEY:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY2tweWRvZHN5eGlsbGp5Y25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzEzOTcsImV4cCI6MjA4ODU0NzM5N30.tLe4Af4NDc9FtFQNjGj9R9EE1JLQojGuazyad2y2nOY