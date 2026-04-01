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
    
    let dataToDecode = base64Data;
    if (base64Data.indexOf("base64,") !== -1) {
      dataToDecode = base64Data.split("base64,")[1];
    }
    
    const decodedBlob = Utilities.base64Decode(dataToDecode);
    
    let mimeType = MimeType.PNG;
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      mimeType = MimeType.JPEG;
    }
    
    const blob = Utilities.newBlob(decodedBlob, mimeType, filename);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
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
 * 과목 목록 조회 (대분류 → 소분류 트리)
 */
function getSubjects() {
  try {
    // subjects 테이블 우선 조회, 없으면 questions 테이블에서 distinct 추출
    let endpoint = '/rest/v1/subjects?select=major,minor&order=major,minor';
    let response = supabaseFetch(endpoint, 'GET');

    let rows = [];
    if (response.success && response.data && response.data.length > 0) {
      rows = response.data;
    } else {
      // fallback: questions 테이블에서 직접 추출
      const qResp = supabaseFetch(
        '/rest/v1/questions?select=major_subject,minor_subject&order=major_subject,minor_subject',
        'GET'
      );
      if (!qResp.success) throw new Error('과목 목록 조회 실패');
      const seen = new Set();
      (qResp.data || []).forEach(q => {
        const key = q.major_subject + '|||' + q.minor_subject;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({ major: q.major_subject, minor: q.minor_subject });
        }
      });
    }

    // major → [minors] 그룹핑
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.major]) grouped[r.major] = [];
      grouped[r.major].push(r.minor);
    });

    return { status: 'success', data: grouped };
  } catch (error) {
    Logger.log('[ERROR] getSubjects: ' + error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * 과목별 통계 조회 (subject_stats 뷰 활용)
 */
function getSubjectStats() {
  try {
    let response = supabaseFetch('/rest/v1/subject_stats?select=*', 'GET');

    if (!response.success || !response.data || response.data.length === 0) {
      // fallback: questions 테이블에서 집계
      const qResp = supabaseFetch(
        '/rest/v1/questions?select=major_subject,minor_subject,question_type,total_attempts,accuracy_rate',
        'GET'
      );
      if (!qResp.success) throw new Error('통계 조회 실패');

      const statsMap = {};
      (qResp.data || []).forEach(q => {
        const key = q.major_subject + '|||' + q.minor_subject;
        if (!statsMap[key]) {
          statsMap[key] = {
            major_subject: q.major_subject,
            minor_subject: q.minor_subject,
            total_questions: 0,
            total_attempts: 0,
            avg_accuracy: 0,
            accuracy_sum: 0,
            accuracy_count: 0
          };
        }
        statsMap[key].total_questions++;
        statsMap[key].total_attempts += (q.total_attempts || 0);
        if (q.accuracy_rate !== null) {
          statsMap[key].accuracy_sum += q.accuracy_rate;
          statsMap[key].accuracy_count++;
        }
      });

      const stats = Object.values(statsMap).map(s => ({
        ...s,
        avg_accuracy: s.accuracy_count > 0 ? Math.round(s.accuracy_sum / s.accuracy_count) : null
      }));

      return { status: 'success', data: stats };
    }

    return { status: 'success', data: response.data };
  } catch (error) {
    Logger.log('[ERROR] getSubjectStats: ' + error.message);
    return { status: 'error', message: error.message };
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
    
    if (!major_subject || !minor_subject || !question_title || !content || !question_type || !answer) {
      throw new Error("필수 입력 항목이 누락되었습니다.");
    }
    
    const newQuestionId = Utilities.getUuid();
    
    let finalContent = content;
    let imageUrl = null;
    let imagePosition = payload.image_position || 'BOTTOM';
    
    if (base64_image && image_filename) {
      const extension = image_filename.split('.').pop() || 'png';
      const uniqueFilename = `${newQuestionId}.${extension}`;
      imageUrl = uploadImageToDrive(base64_image, uniqueFilename);
    }
    
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
    
    Logger.log(`[DEBUG] createQuestion Payload: ID=${newQuestionId}, Title=${question_title}, Position=${imagePosition}`);
    
    const response = supabaseFetch('/rest/v1/questions', 'POST', questionObj);
    
    Logger.log('[DEBUG] Supabase Response: ' + JSON.stringify(response));
    
    if (!response.success) {
      Logger.log('[ERROR] Create Failed: ' + response.message);
      throw new Error('Supabase 저장 오류: ' + response.error);
    }
    
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
 * 분석 데이터를 포함한 문제 목록 조회 (필터 지원 추가)
 * @param {boolean|object} syncOrFilters - true면 통계 동기화, object면 필터 객체
 */
function getQuestionsWithAnalytics(syncOrFilters) {
  try {
    let sync = false;
    let filters = {};

    if (syncOrFilters === true) {
      sync = true;
    } else if (typeof syncOrFilters === 'object' && syncOrFilters !== null) {
      sync    = syncOrFilters.sync    || false;
      filters = syncOrFilters;
    }

    if (sync === true) {
      syncAllStats();
    }

    let endpoint = '/rest/v1/questions?select=*&order=minor_subject,question_title';

    if (filters.major_subject) endpoint += `&major_subject=eq.${encodeURIComponent(filters.major_subject)}`;
    if (filters.minor_subject) endpoint += `&minor_subject=eq.${encodeURIComponent(filters.minor_subject)}`;
    if (filters.question_type) endpoint += `&question_type=eq.${encodeURIComponent(filters.question_type)}`;

    const limit  = filters.limit  || 200;
    const offset = filters.offset || 0;
    endpoint += `&limit=${limit}&offset=${offset}`;

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
 * 모든 문제의 풀이 이력을 기반으로 통계를 일괄 업데이트
 */
function syncAllStats() {
  try {
    Logger.log('[DEBUG] syncAllStats Start');
    
    const hResp = supabaseFetch('/rest/v1/learning_history?select=question_id,is_correct,created_at', 'GET');
    if (!hResp.success) return;
    
    const history = hResp.data;
    const statsMap = {};
    
    history.forEach(h => {
      if (!statsMap[h.question_id]) {
        statsMap[h.question_id] = { total: 0, correct: 0, last_solved: null };
      }
      statsMap[h.question_id].total++;
      if (h.is_correct) statsMap[h.question_id].correct++;
      
      const solveTime = new Date(h.created_at).getTime();
      if (!statsMap[h.question_id].last_solved || solveTime > new Date(statsMap[h.question_id].last_solved).getTime()) {
        statsMap[h.question_id].last_solved = h.created_at;
      }
    });
    
    for (const qId in statsMap) {
      const s = statsMap[qId];
      const accuracy = Math.round((s.correct / s.total) * 100);
      
      const payload = {
        total_attempts: s.total,
        correct_attempts: s.correct,
        accuracy_rate: accuracy,
        last_solved_at: s.last_solved
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
      finalImagePosition = 'TOP';
    }

    Logger.log(`[DEBUG] updateQuestion Start - ID: ${id}, Position: ${finalImagePosition}`);

    const oldQResp = supabaseFetch(`/rest/v1/questions?id=eq.${id}&select=content,image_url`, 'GET');
    const oldData = (oldQResp.success && oldQResp.data.length > 0) ? oldQResp.data[0] : null;

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

    Logger.log('[DEBUG] Update Payload: ' + JSON.stringify(updatedData));

    const response = supabaseFetch(`/rest/v1/questions?id=eq.${id}`, 'PATCH', updatedData);
    
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

    supabaseFetch(`/rest/v1/learning_history?question_id=eq.${id}`, 'DELETE');

    const response = supabaseFetch(`/rest/v1/questions?id=eq.${id}`, 'DELETE');
    if (!response.success) throw new Error('Supabase 삭제 오류: ' + response.error);

    return { status: 'success' };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('deleteQuestion', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}

/**
 * 문제풀이용 문제 추출 (과목 필터 + 학습 모드 지원)
 * @param {Object} filters - { major_subject, minor_subject, question_type, count, mode }
 *   mode: 'random'(기본) | 'weak'(약점집중) | 'order'(순서대로)
 */
function getQuestionsForSolve(filters) {
  filters = filters || {};
  try {
    const count = filters.count || 10;
    const mode  = filters.mode  || 'random';

    let endpoint = '/rest/v1/questions?select=*';
    if (filters.major_subject) endpoint += `&major_subject=eq.${encodeURIComponent(filters.major_subject)}`;
    if (filters.minor_subject) endpoint += `&minor_subject=eq.${encodeURIComponent(filters.minor_subject)}`;
    if (filters.question_type) endpoint += `&question_type=eq.${encodeURIComponent(filters.question_type)}`;

    if (mode === 'weak') {
      // 약점 모드: 풀어본 문제 중 정답률 낮은 순
      endpoint += `&total_attempts=gt.0&order=accuracy_rate.asc&limit=${count * 3}`;
    } else if (mode === 'order') {
      endpoint += `&order=minor_subject.asc,question_title.asc&limit=${count}`;
    } else {
      // random: 넉넉하게 가져와서 셔플
      endpoint += `&limit=${count * 5}`;
    }

    const response = supabaseFetch(endpoint, 'GET');
    if (!response.success) throw new Error('문제 로드 실패: ' + response.error);

    let questions = response.data || [];

    if (mode !== 'order') {
      questions.sort(() => Math.random() - 0.5);
    }

    return { status: 'success', data: questions.slice(0, count) };
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error('getQuestionsForSolve', error.message, error.stack);
    return { status: 'error', message: error.message };
  }
}
