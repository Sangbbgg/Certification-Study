/**
 * 구글 드라이브에 이미지를 업로드하고 공개 URL을 반환하는 함수
 * @param {string} base64Data - Base64로 인코딩된 이미지 데이터
 * @param {string} filename - 업로드할 파일명
 * @returns {string} - 누구나 접근 가능한 구글 드라이브 파일 URL
 */
function uploadImageToDrive(base64Data, filename) {
  try {
    const folderId = getEnv('IMAGE_FOLDER_ID');
    if (!folderId) {
      throw new Error("IMAGE_FOLDER_ID 환경변수가 설정되지 않았습니다.");
    }
    
    const folder = DriveApp.getFolderById(folderId);
    
    // Base64 디코딩
    // 클라이언트에서 'data:image/png;base64,...' 형태로 줬을 경우를 대비해 본문만 추출
    let dataToDecode = base64Data;
    if (base64Data.indexOf("base64,") !== -1) {
      dataToDecode = base64Data.split("base64,")[1];
    }
    
    const decodedBlob = Utilities.base64Decode(dataToDecode);
    
    // 파일명 확장자를 통해 MimeType 유추 (기본 PNG)
    let mimeType = MimeType.PNG;
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      mimeType = MimeType.JPEG;
    }
    
    const blob = Utilities.newBlob(decodedBlob, mimeType, filename);
    const file = folder.createFile(blob);
    
    // 누구나 읽을 수 있도록 권한 설정 (마크다운 렌더링에 필요)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 파일 URL 반환 (직접 링크 형식)
    return `https://drive.google.com/uc?id=${file.getId()}`;
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('uploadImageToDrive', error.message, error.stack);
    } else {
      console.error('uploadImageToDrive', error);
    }
    throw new Error('드라이브 이미지 업로드 실패: ' + error.message);
  }
}

/**
 * 문제를 생성하여 Supabase DB에 저장
 * @param {Object} payload 
 */
function createQuestion(payload) {
  try {
    const {
      major_subject,
      minor_subject,
      question_title,
      content,
      hint_explanation,
      question_type,
      options,
      answer,
      base64_image,
      image_filename
    } = payload;
    
    // 필수 데이터 검증
    if (!major_subject || !minor_subject || !question_title || !content || !question_type || !answer) {
      throw new Error("필수 입력 항목이 누락되었습니다.");
    }
    
    // 새로운 문제의 고유 번호 할당
    const newQuestionId = Utilities.getUuid();
    
    let finalContent = content;
    
    // 이미지 파일이 전송된 경우 드라이브에 업로드 후 마크다운에 이미지 태그 추가
    if (base64_image && image_filename) {
      const extension = image_filename.split('.').pop() || 'png';
      const uniqueFilename = `${newQuestionId}.${extension}`; // UUID.확장자 형태로 저장
      const imageUrl = uploadImageToDrive(base64_image, uniqueFilename);
      finalContent += `\n\n![${uniqueFilename}](${imageUrl})`;
    }
    
    // DB 저장용 객체 생성
    const questionObj = {
      id: newQuestionId,
      major_subject,
      minor_subject,
      question_title,
      content: finalContent,
      hint_explanation: hint_explanation || null,
      question_type,
      options: options || null, // 보기 항목이 없으면 null
      answer // 다중 정답 등을 수용하기 위해 객체/배열 형태로 넘어옴
    };
    
    // DB INSERT 호출 (REST API)
    const response = supabaseFetch('/rest/v1/questions', 'POST', questionObj);
    
    if (!response.success) {
      throw new Error('Supabase 저장 오류: ' + response.error);
    }
    
    return response.data;
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('createQuestion', error.message, error.stack);
    }
    throw error;
  }
}

/**
 * 분석 데이터를 포함한 문제 목록 조회
 */
function getQuestionsWithAnalytics() {
  try {
    // 1. 모든 문제 조회
    const questionsResponse = supabaseFetch('/rest/v1/questions?select=*&order=created_at.desc', 'GET');
    if (!questionsResponse.success) throw new Error('문제 조회 실패: ' + questionsResponse.error);
    const questions = questionsResponse.data;

    // 2. 풀이 통계 조회 (정답률, 최종 풀이 시간)
    // rpc를 사용하거나 history 테이블을 직접 집계하는 대신, 
    // analyticsController.gs의 로직을 활용하거나 직접 history를 가져와 GAS에서 가공
    const historyResponse = supabaseFetch('/rest/v1/learning_history?select=question_id,is_correct,created_at', 'GET');
    if (!historyResponse.success) throw new Error('이력 조회 실패: ' + historyResponse.error);
    const history = historyResponse.data;

    const statsMap = {};
    history.forEach(h => {
      if (!statsMap[h.question_id]) {
        statsMap[h.question_id] = { total: 0, correct: 0, last_solved: h.created_at };
      }
      statsMap[h.question_id].total++;
      if (h.is_correct) statsMap[h.question_id].correct++;
      if (new Date(h.created_at) > new Date(statsMap[h.question_id].last_solved)) {
        statsMap[h.question_id].last_solved = h.created_at;
      }
    });

    // 3. 데이터 병합
    const result = questions.map(q => {
      const stats = statsMap[q.id] || { total: 0, correct: 0, last_solved: null };
      return {
        ...q,
        total_attempts: stats.total,
        accuracy_rate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        last_solved_at: stats.last_solved
      };
    });

    return { status: 'success', data: result };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('getQuestionsWithAnalytics', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}

/**
 * 문제 정보 업데이트 (이미지 교체 로직 포함)
 * @param {Object} payload 
 */
function updateQuestion(payload) {
  try {
    const { id, major_subject, minor_subject, question_title, content, hint_explanation, question_type, options, answer, base64_image, image_filename } = payload;
    
    if (!id) throw new Error("ID는 필수입니다.");

    // 0. 기존 문제 정보 조회 (이미지 삭제 여부 판단용)
    const oldQResp = supabaseFetch(`/rest/v1/questions?id=eq.${id}&select=content`, 'GET');
    const oldContent = (oldQResp.success && oldQResp.data.length > 0) ? oldQResp.data[0].content : "";
    const driveUrlRegex = /(?:id=|\/d\/)([a-zA-Z0-9_-]{25,})/;
    const oldMatch = oldContent.match(driveUrlRegex);
    const newMatch = content.match(driveUrlRegex);

    // 1. 이미지 교체 또는 삭제 상황 판단
    if (base64_image && image_filename) {
      // 새로운 이미지가 들어온 경우 기존 이미지 삭제 시도
      if (oldMatch && oldMatch[1]) {
        try { DriveApp.getFileById(oldMatch[1]).setTrashed(true); } catch (e) { console.warn('이전 이미지 삭제 실패:', e.message); }
      }

      // 새 이미지 업로드
      const extension = image_filename.split('.').pop() || 'png';
      const uniqueFilename = `${id}_${new Date().getTime()}.${extension}`;
      const imageUrl = uploadImageToDrive(base64_image, uniqueFilename);
      
      // 기존 지문에서 구형 이미지 태그 제거 후 새 이미지 태그 추가
      const cleanContent = content.replace(/!\[.*?\]\(.*?\)/g, "").trim();
      finalContent = cleanContent + `\n\n![${uniqueFilename}](${imageUrl})`;
    } 
    else if (oldMatch && !newMatch) {
      // 새 지문에 이미지가 없고 새 파일도 안 들어왔는데, 기존엔 이미지가 있었던 경우 (제거됨)
      try { DriveApp.getFileById(oldMatch[1]).setTrashed(true); } catch (e) { console.warn('이미지 제거 실패:', e.message); }
    }

    const updatedData = {
      major_subject,
      minor_subject,
      question_title,
      content: finalContent,
      hint_explanation,
      question_type,
      options,
      answer
    };

    const response = supabaseFetch(`/rest/v1/questions?id=eq.${id}`, 'PATCH', updatedData);
    if (!response.success) throw new Error('Supabase 업데이트 오류: ' + response.error);

    return { status: 'success', data: response.data };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('updateQuestion', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}

/**
 * 문제 삭제 (관련 이미지 및 이력 포함)
 * @param {string} id 
 */
function deleteQuestion(id) {
  try {
    // 1. 이미지 삭제를 위해 문제 정보 조회
    const qResp = supabaseFetch(`/rest/v1/questions?id=eq.${id}&select=content`, 'GET');
    if (qResp.success && qResp.data.length > 0) {
      const content = qResp.data[0].content;
      const driveUrlRegex = /(?:id=|\/d\/)([a-zA-Z0-9_-]{25,})/;
      const match = content.match(driveUrlRegex);
      if (match && match[1]) {
        try { DriveApp.getFileById(match[1]).setTrashed(true); } catch (e) {}
      }
    }

    // 2. 관련 이력 삭제 (Supabase에서 CASCADE 설정이 안되어 있을 경우 수동 삭제)
    supabaseFetch(`/rest/v1/learning_history?question_id=eq.${id}`, 'DELETE');

    // 3. 문제 삭제
    const response = supabaseFetch(`/rest/v1/questions?id=eq.${id}`, 'DELETE');
    if (!response.success) throw new Error('Supabase 삭제 오류: ' + response.error);

    return { status: 'success' };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('deleteQuestion', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}
