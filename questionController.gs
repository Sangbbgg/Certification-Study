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
    
    // 파일 URL 반환 (가장 안정적인 직접 링크 형식)
    return `https://lh3.googleusercontent.com/d/${file.getId()}`;
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
    let imageUrl = null;
    let imagePosition = payload.image_position || 'BOTTOM';
    
    // 이미지 파일이 전송된 경우 드라이브에 업로드
    if (base64_image && image_filename) {
      const extension = image_filename.split('.').pop() || 'png';
      const uniqueFilename = `${newQuestionId}.${extension}`;
      imageUrl = uploadImageToDrive(base64_image, uniqueFilename);
    }
    
    // DB 저장용 객체 생성 (이미지 컬럼 분리)
    const questionObj = {
      id: newQuestionId,
      major_subject,
      minor_subject,
      question_title,
      content: finalContent,
      image_url: imageUrl,
      image_position: imagePosition,
      hint_explanation: hint_explanation || null,
      question_type,
      options: options || null,
      answer
    };
    
    // [LOG] 문제 생성 요청 페이로드 확인 (이미지 데이터 제외하고 로그 기록)
    Logger.log(`[DEBUG] createQuestion Payload: ID=${newQuestionId}, Title=${question_title}, Position=${imagePosition}`);
    
    // DB INSERT 호출 (REST API)
    const response = supabaseFetch('/rest/v1/questions', 'POST', questionObj);
    
    // [LOG] 서버 응답 확인
    Logger.log('[DEBUG] Supabase Response: ' + JSON.stringify(response));
    
    if (!response.success) {
      Logger.log('[ERROR] Create Failed: ' + response.message);
      throw new Error('Supabase 저장 오류: ' + response.error);
    }
    
    // 캐시 무효화
    clearSupabaseCache();
    Logger.log('[DEBUG] Server cache invalidated for list');
    
    return { status: 'success', data: questionObj };
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('createQuestion', error.message, error.stack);
    }
    return { status: 'error', message: error.message };
  }
}

/**
 * 분석 데이터를 포함한 문제 목록 조회
 * @param {boolean} sync - true일 경우 전체 통계를 재계산하여 DB를 최신화함 (v58)
 */
function getQuestionsWithAnalytics(sync = false) {
  try {
    // 0. 상세 동기화가 필요한 경우 실행 (분석 페이지 진입 시)
    if (sync === true) {
      syncAllStats();
    }

    // 1. 필요한 모든 컬럼을 단일 쿼리로 조회
    const endpoint = `/rest/v1/questions?select=*&order=created_at.desc`;
    const response = supabaseFetch(endpoint, 'GET');
    if (!response.success) throw new Error('데이터 조회 실패: ' + response.error);

    return { 
      status: 'success', 
      data: response.data 
    };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('getQuestionsWithAnalytics', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}

/**
 * 모든 문제의 풀이 이력을 기반으로 통계(정답률 등)를 일괄 업데이트 (v58)
 */
function syncAllStats() {
  try {
    Logger.log('[DEBUG] syncAllStats Start');
    
    // 1. 모든 풀이 이력 가져오기
    const hResp = supabaseFetch('/rest/v1/learning_history?select=question_id,is_correct', 'GET');
    if (!hResp.success) return;
    
    const history = hResp.data;
    const statsMap = {};
    
    history.forEach(h => {
      if (!statsMap[h.question_id]) statsMap[h.question_id] = { total: 0, correct: 0 };
      statsMap[h.question_id].total++;
      if (h.is_correct) statsMap[h.question_id].correct++;
    });
    
    // 2. 각 문제별로 통계 업데이트 (성능을 위해 개별 PATCH 수행 - 추후 RPC 고려 가능)
    // 현재는 문항 수가 아주 많지 않으므로 반복문으로 처리
    for (const qId in statsMap) {
      const s = statsMap[qId];
      const accuracy = Math.round((s.correct / s.total) * 100);
      
      const payload = {
        total_attempts: s.total,
        correct_attempts: s.correct,
        accuracy_rate: accuracy
      };
      
      supabaseFetch(`/rest/v1/questions?id=eq.${qId}`, 'PATCH', payload);
    }
    
    Logger.log('[DEBUG] syncAllStats Completed');
    clearSupabaseCache();
  } catch (e) {
    Logger.log('[ERROR] syncAllStats Error: ' + e.message);
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

    let finalContent = content.replace(/!\[.*?\]\(.*?\)/g, "").trim(); 
    let finalImageUrl = payload.image_url; 
    let finalImagePosition = payload.image_position || 'TOP';

    if (payload.remove_image === true) {
      finalImagePosition = 'TOP'; // 이미지 삭제 시 포지션도 기본값으로 리셋
    }

    // [LOG] 수정 요청 시작
    Logger.log(`[DEBUG] updateQuestion Start - ID: ${id}, Position: ${finalImagePosition}`);

    // 0. 기존 문제 정보 조회 (이미지 삭제 및 유지를 위함)
    const oldQResp = supabaseFetch(`/rest/v1/questions?id=eq.${id}&select=content,image_url`, 'GET');
    const oldData = (oldQResp.success && oldQResp.data.length > 0) ? oldQResp.data[0] : null;

    // 1. 이미지 처리
    if (base64_image && image_filename) {
      if (oldData && oldData.image_url) {
        const oldIdMatch = oldData.image_url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
        if (oldIdMatch) {
          try { DriveApp.getFileById(oldIdMatch[1]).setTrashed(true); } catch (e) { console.warn('이전 이미지 삭제 실패:', e.message); }
        }
      }
      const extension = image_filename.split('.').pop() || 'png';
      const uniqueFilename = `${id}_${new Date().getTime()}.${extension}`;
      finalImageUrl = uploadImageToDrive(base64_image, uniqueFilename);
      Logger.log(`[DEBUG] New Image Uploaded: ${finalImageUrl}`);
    } 
    else if (payload.remove_image === true) {
      if (oldData && oldData.image_url) {
        const oldIdMatch = oldData.image_url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
        if (oldIdMatch) {
          try { DriveApp.getFileById(oldIdMatch[1]).setTrashed(true); } catch (e) { console.warn('이미지 제거 실패:', e.message); }
        }
      }
      finalImageUrl = null;
      Logger.log('[DEBUG] Image Removed');
    }

    const updatedData = {
      major_subject,
      minor_subject,
      question_title,
      content: finalContent,
      image_url: finalImageUrl,
      image_position: finalImagePosition,
      hint_explanation,
      question_type,
      options,
      answer
    };

    // [LOG] Supabase PATCH 요청 데이터
    Logger.log('[DEBUG] Update Payload: ' + JSON.stringify(updatedData));

    const response = supabaseFetch(`/rest/v1/questions?id=eq.${id}`, 'PATCH', updatedData);
    
    // [LOG] 서버 응답 확인
    Logger.log('[DEBUG] Update Supabase Response: ' + JSON.stringify(response));

    if (!response.success) throw new Error('Supabase 업데이트 오류: ' + response.error);

    return { status: 'success', data: updatedData };
  } catch (error) {
    Logger.log('[ERROR] updateQuestion Error: ' + error.message);
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
    const qResp = supabaseFetch(`/rest/v1/questions?id=eq.${id}&select=image_url`, 'GET');
    if (qResp.success && qResp.data.length > 0) {
      const imageUrl = qResp.data[0].image_url;
      if (imageUrl) {
        const idMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
        if (idMatch) {
          try { DriveApp.getFileById(idMatch[1]).setTrashed(true); } catch (e) {}
        }
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

/**
 * 문제풀이용 문제 추출 (최대 10개 랜덤)
 */
function getQuestionsForSolve(filters = {}) {
  try {
    let endpoint = '/rest/v1/questions?select=*';
    if (filters.major_subject) endpoint += `&major_subject=eq.${encodeURIComponent(filters.major_subject)}`;
    if (filters.minor_subject) endpoint += `&minor_subject=eq.${encodeURIComponent(filters.minor_subject)}`;
    
    const response = supabaseFetch(endpoint, 'GET');
    if (!response.success) throw new Error('문제 로드 실패: ' + response.error);

    let questions = response.data;
    // 단순 랜덤 셔플
    questions.sort(() => Math.random() - 0.5);
    // 최대 10개만 반환
    return { status: 'success', data: questions.slice(0, 10) };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('getQuestionsForSolve', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}
