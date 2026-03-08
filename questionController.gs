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
    
    // 파일 URL 반환
    return file.getUrl();
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
    
    let finalContent = content;
    
    // 이미지 파일이 전송된 경우 드라이브에 업로드 후 마크다운에 이미지 태그 추가
    if (base64_image && image_filename) {
      const imageUrl = uploadImageToDrive(base64_image, image_filename);
      finalContent += `\n\n![${image_filename}](${imageUrl})`;
    }
    
    // DB 저장용 객체 생성
    const questionObj = {
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
    const response = supabaseFetch('/rest/v1/questions', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation'
      },
      payload: questionObj
    });
    
    return {
      status: 'success',
      data: response
    };
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('createQuestion', error.message, error.stack);
    }
    throw error;
  }
}

/**
 * 문제 목록 조회
 * @param {Object} filters - 과목 등의 필터
 */
function getQuestions(filters = {}) {
  try {
    let endpoint = '/rest/v1/questions?select=*';
    
    // 전달받은 필터가 있으면 쿼리스트링에 추가
    if (filters.major_subject) {
      endpoint += `&major_subject=eq.${encodeURIComponent(filters.major_subject)}`;
    }
    if (filters.minor_subject) {
      endpoint += `&minor_subject=eq.${encodeURIComponent(filters.minor_subject)}`;
    }
    
    // 최신 등록순으로 정렬
    endpoint += '&order=created_at.desc';
    
    const response = supabaseFetch(endpoint, {
      method: 'GET'
    });
    
    return {
      status: 'success',
      data: response
    };
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('getQuestions', error.message, error.stack);
    }
    throw error;
  }
}
