---
description: Supabase REST API 통신 공통 모듈 설정
---
# Supabase REST API 통신 공통 모듈 설정

GAS에서 `UrlFetchApp`을 사용하여 Supabase REST API와 통신(GET, POST, PATCH, DELETE)하는 공통 유틸리티 함수 `supabaseFetch`를 구축합니다.

## 1. 개요
- **기술:** Apps Script `UrlFetchApp`, Supabase REST API
- **흐름:** 내부 로직 -> `supabaseFetch` 호출 -> Supabase DB 쿼리 실행 -> 결과 반환

## 2. 코드 구현 (supabase.gs)
```javascript
/**
 * Supabase API 호출 공통 유틸리티
 * @param {string} endpoint API 엔드포인트 (예: '/rest/v1/questions')
 * @param {string} method HTTP 메서드 (GET, POST, PATCH, DELETE)
 * @param {Object} [payload] 전송할 데이터 객체
 * @returns {Object} { success: boolean, data: any, error: string|null }
 */
function supabaseFetch(endpoint, method = 'GET', payload = null) {
  const url = `${getEnv('SUPABASE_URL')}${endpoint}`;
  const options = {
    method: method,
    headers: {
      'apikey': getEnv('SUPABASE_ANON_KEY'),
      'Authorization': `Bearer ${getEnv('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const content = response.getContentText();
    const data = JSON.parse(content);

    if (statusCode >= 200 && statusCode < 300) {
      return { success: true, data: data, error: null };
    } else {
      const errorMsg = `Supabase Error (${statusCode}): ${content}`;
      sheetLogger(statusCode, errorMsg);
      return { success: false, data: null, error: errorMsg };
    }
  } catch (e) {
    const errorMsg = `Network Error: ${e.toString()}`;
    sheetLogger(500, errorMsg);
    return { success: false, data: null, error: errorMsg };
  }
}
```

## 3. 제약사항
- 인증 및 헤더 정보는 반드시 환경변수(`getEnv`)에서 동적으로 불러옵니다.
- 에러 발생 시 `sheetLogger`를 호출하여 시트에 기록합니다.
- 네트워크 오류나 인증 실패 시에도 실패 상태(`success: false`)를 안전하게 반환합니다.
