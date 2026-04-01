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
 * GET 요청 핸들러 (웹앱 URL 직접 호출용)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (!action) {
      // 기본: 메인 페이지 반환
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('정보처리기사 실기')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const params = e.parameter;
    let result;

    switch (action) {
      case 'getSubjects':
        result = getSubjects();
        break;
      case 'getSubjectStats':
        result = getSubjectStats();
        break;
      case 'getQuestionsForSolve':
        result = getQuestionsForSolve({
          major_subject:  params.major_subject,
          minor_subject:  params.minor_subject,
          question_type:  params.question_type,
          count:  params.count  ? parseInt(params.count) : 10,
          mode:   params.mode   || 'random'
        });
        break;
      case 'getQuestionsWithAnalytics':
        result = getQuestionsWithAnalytics({
          major_subject:  params.major_subject,
          minor_subject:  params.minor_subject,
          question_type:  params.question_type,
          limit:  params.limit  ? parseInt(params.limit)  : 200,
          offset: params.offset ? parseInt(params.offset) : 0
        });
        break;
      default:
        result = { status: 'error', message: '알 수 없는 액션: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 프론트엔드 통신 및 중앙 제어 라우터
 * google.script.run.router(request) 형태로 호출됩니다.
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
      // ── 문제 관리
      case 'createQuestion':
        data = createQuestion(request.payload);
        break;
      case 'updateQuestion':
        data = updateQuestion(request.payload);
        break;
      case 'deleteQuestion':
        data = deleteQuestion(request.payload && request.payload.id);
        break;
      case 'getQuestionsWithAnalytics':
        data = getQuestionsWithAnalytics(request.payload || false);
        break;

      // ── 문제 풀기
      case 'getQuestionsForSolve':
        data = getQuestionsForSolve(request.payload || {});
        break;
      case 'submitAnswer':
        data = submitAnswer(request.payload);
        break;

      // ── 과목 정보
      case 'getSubjects':
        data = getSubjects();
        break;
      case 'getSubjectStats':
        data = getSubjectStats();
        break;

      // ── 동기화
      case 'syncAllStats':
        syncAllStats();
        data = { message: '통계 동기화 완료' };
        break;
        
      default:
        throw new Error('알 수 없는 액션입니다: ' + action);
    }
    
    return { status: 'success', data: data };
  } catch (error) {
    sheetLogger.error(500, error.message);
    return { status: 'error', message: error.message };
  }
}
