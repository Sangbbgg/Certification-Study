---
description: Google Sheet 에러 로깅 모듈 설정
---
# Google Sheet 에러 로깅 모듈 설정

시스템 에러 발생 시 지정된 Google Sheet에 로그를 기록하는 공통 모듈 `sheetLogger` 함수를 구축합니다.

## 1. 개요
- **기술:** Apps Script, Google Sheet API, PropertiesService
- **흐름:** 에러 발생 -> `sheetLogger(statusCode, errorMessage)` 호출 -> Sheet 행 추가

## 2. 코드 구현 (logger.gs)
```javascript
/**
 * 에러 로깅 함수
 * @param {number|string} statusCode HTTP 상태 코드 또는 에러 유형
 * @param {string} errorMessage 상세 에러 메시지
 */
function sheetLogger(statusCode, errorMessage) {
  try {
    const sheetId = getEnv('SHEET_ID');
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheets()[0] || ss.insertSheet('Sheet1');
    
    const timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timestamp, statusCode, errorMessage]);
  } catch (e) {
    // 로깅 함수 자체 에러는 묵음 처리하여 메인 로직 방해 금지
    console.error('Logger failed:', e.toString());
  }
}

// 호출 예시
// try { ... } catch (e) { sheetLogger(500, e.toString()); }
```

## 3. 제약사항
- Google Sheet ID는 반드시 `getEnv('SHEET_ID')`를 통해 동적으로 불러와야 합니다.
- 로깅 함수 자체에서 에러가 발생하더라도 메인 비즈니스 프로세스가 중단되지 않도록 `try-catch`로 감쌉니다.
- 시트에는 `[Timestamp, statusCode, errorMessage]` 순서로 기록됩니다.
