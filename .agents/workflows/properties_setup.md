---
description: Google Apps Script 환경변수(PropertiesService) 초기 설정
---
# 환경변수(PropertiesService) 관리 모듈 설정

현 프로젝트에서 사용할 민감한 정보(Sheet ID, Folder ID, Supabase URL, API Key 등)를 `PropertiesService`를 이용해 안전하게 저장하고 불러오는 공통 유틸리티 모듈을 구축합니다.

## 1. 개요
- **기술:** Apps Script `PropertiesService`
- **목표:** 보안을 위한 환경변수 추상화 및 중앙 관리

## 2. 구현 단계
1. **환경변수 세팅 함수 작성:** `setEnvironmentVariables()`를 작성하여 아래 실제 키 값을 Script Properties에 등록합니다.
2. **실행:** 해당 함수를 1회 실행한 후 코드에서 삭제하거나 주석 처리합니다.
3. **호출 함수 작성:** `getEnv(key)` 공통 함수를 통해 안전하게 값을 불러옵니다.

## 3. 코드 구현 (env.gs)
```javascript
/**
 * [초 초기 1회성 실행] 환경변수 등록 함수
 */
function setEnvironmentVariables() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'SHEET_ID': '1V8ZtedtdRgXU_iuvWGB1nGUW1E2nkL_-DThdhPG6qwk',
    'IMAGE_FOLDER_ID': '1U3AB-dZeUGcsjyoFV61yJD_whs5toWaE',
    'SUPABASE_URL': 'https://gpckpydodsyxilljycnk.supabase.co',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY2tweWRvZHN5eGlsbGp5Y25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzEzOTcsImV4cCI6MjA4ODU0NzM5N30.tLe4Af4NDc9FtFQNjGj9R9EE1JLQojGuazyad2y2nOY'
  });
  console.log('환경변수 설정 완료!');
}

/**
 * 전역 환경변수 호출 함수
 * @param {string} key 환경변수 키
 * @returns {string} 환경변수 값
 */
function getEnv(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`환경변수 [${key}]가 설정되지 않았습니다. Script Properties를 확인하세요.`);
  }
  return value;
}
```

## 4. 제약사항
- 실행 중 값이 존재하지 않을 경우 즉시 에러를 발생시켜 디버깅을 용이하게 합니다.
- 민감한 데이터는 절대 소스 코드에 직접 노출하지 않도록 주의합니다.
