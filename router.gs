/**
 * 외부 HTTP POST 요청 핸들러 (REST API용)
 */
function doPost(e) {
  try {
    let request;
    if (e && e.postData && e.postData.contents) {
      request = JSON.parse(e.postData.contents);
    } else {
      throw new Error('유효하지 않은 요청(request format)입니다.');
    }
    
    // 중앙 라우터로 전달 (router 함수가 예외처리 및 응답 포맷을 담당)
    const result = router(request);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    sheetLogger.error(500, error.message);
    const errorResponse = { status: 'error', message: error.message };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 프론트엔드 통신 및 중앙 제어 라우터 기능
 * 외부 google.script.run.router(request) 형태로 호출됩니다.
 * @param {object} request - {action: "...", payload: {...}} 형태의 요청 객체
 */
function router(request) {
  try {
    if (!request || !request.action) {
      throw new Error('액션(action) 값이 누락되었습니다.');
    }
    
    const action = request.action;
    let data = null;
    
    switch(action) {
      // 프론트엔드에서 전달되는 action 값에 따라 각 모듈의 함수 호출 분기 처리
      //
      // case 'exampleAction':
      //   data = exampleController(request.payload);
      //   break;
        
      default:
        throw new Error('알 수 없는 액션입니다: ' + action);
    }
    
    return { status: 'success', data: data };
  } catch (error) {
    sheetLogger.error(500, error.message);
    return { status: 'error', message: error.message };
  }
}
