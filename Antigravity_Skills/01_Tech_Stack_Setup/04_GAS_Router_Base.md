# [스킬 04] GAS 백엔드 라우터 (Base Router)

## 1. 역할 (Role)
* 너는 백엔드 시스템 아키텍트야.

## 2. 목표 (Objective)
* 프론트엔드에서 전달되는 다양한 요청(액션)을 구분하여 해당 기능을 실행하는 중앙 제어 장치(Router)를 구축해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** GAS `doPost(e)`, `JSON.parse()`
* **흐름:** 프론트엔드 `google.script.run` 호출 -> `doPost` 진입 -> `action` 파라미터 확인 -> 해당 컨트롤러 함수 실행 -> JSON 응답 반환

## 4. 세부 요구사항 (Requirements)
* **메인 핸들러:** `doPost(e)` 함수를 기본으로 하되, 보안 및 관리 편의를 위해 프론트엔드와 `google.script.run.router(request)` 형태로 통신할 `router(request)` 함수를 작성할 것.
* **액션 분기 로직:** `switch` 문을 사용하여 `action` 값에 따라 타 모듈(문제관리, 학습분석 등)의 함수를 호출하도록 설계할 것.
* **응답 규격화:** 성공 시 `{status: 'success', data: ...}`, 실패 시 `{status: 'error', message: ...}` 형식의 JSON을 반환하도록 표준화할 것.

## 5. 제약사항 및 예외처리 (Constraints)
* 라우터 최상단에 `try-catch`를 배치하여, 실행 중 발생하는 모든 예기치 못한 에러를 잡아 `sheetLogger`에 기록하고 사용자에게는 정제된 에러 메시지를 전달할 것.

## 6. 출력 형태 (Output Format)
* GAS 백엔드 중앙 제어용 `router.gs` 파일 코드가 포함된 옵시디언 마크다운 코드 블록.