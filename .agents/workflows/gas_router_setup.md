---
description: GAS 백엔드 라우터(Base Router) 설정
---
# GAS 백엔드 라우터(Base Router) 설정

프론트엔드에서 전달되는 다양한 요청(액션)을 구분하여 해당 기능을 실행하는 중앙 제어 장치(Router)를 구축합니다.

## 1. 개요
- **기술:** GAS `doPost(e)`, `JSON.parse()`
- **흐름:** 프론트엔드 `google.script.run` 호출 -> `doPost` 또는 `router` 진입 -> `action` 파라미터 확인 -> 해당 컨트롤러 함수 실행 -> JSON 응답 반환

## 2. 코드 구현 (router.gs)
```javascript
/**
 * GAS 백엔드 메인 핸들러 (doPost - Web API 용)
 */
function doPost(e) {
  return router(JSON.parse(e.postData.contents));
}

/**
 * GAS 백엔드 중앙 라우터 (google.script.run 용 및 공용)
 * @param {Object} request { action: string, payload: Object }
 */
function router(request) {
  const { action, payload } = request;
  
  try {
    let result;
    switch (action) {
      case 'getQuestions':
        result = getQuestions(payload);
        break;
      case 'createQuestion':
        result = createQuestion(payload);
        break;
      case 'updateQuestion':
        result = updateQuestion(payload);
        break;
      case 'deleteQuestion':
        result = deleteQuestion(payload);
        break;
      default:
        throw new Error(`정의되지 않은 액션입니다: ${action}`);
    }
    
    return JSON.stringify({ status: 'success', data: result });
  } catch (e) {
    const errorMsg = `Router Error [${action}]: ${e.toString()}`;
    sheetLogger(500, errorMsg);
    return JSON.stringify({ status: 'error', message: errorMsg });
  }
}
```

## 3. 제약사항
- 라우터 최상단에 `try-catch`를 배치하여 모든 에러를 가로채고 `sheetLogger`에 기록합니다.
- 응답 규격은 항상 성공 시 `status: 'success'`, 실패 시 `status: 'error'` 형식을 따릅니다.
- `switch` 문을 사용하여 액션별 분기를 명확히 관리합니다.
