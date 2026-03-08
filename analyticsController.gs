/**
 * 사용자의 답안과 실제 정답을 채점하고, 그 이력을 저장
 * @param {Object} payload 
 */
function submitAnswer(payload) {
  try {
    const { question_id, user_answer, is_correct: client_is_correct } = payload;
    
    if (!question_id || user_answer === undefined) {
      throw new Error("문제 ID와 제출한 답안이 필요합니다.");
    }

    // 1. 이미 클라이언트에서 채점된 값을 사용하거나, 서버에서 다시 검증
    let is_correct = client_is_correct;
    if (is_correct === undefined) {
        // 클라이언트에서 결과를 안 주면 서버에서 직접 확인 (하위 호환)
        const qResp = supabaseFetch(`/rest/v1/questions?id=eq.${question_id}&select=answer`, 'GET');
        const correctAnswer = qResp.data[0].answer;
        if (Array.isArray(correctAnswer)) {
          const u = (user_answer || []).map(s => String(s).trim());
          const c = correctAnswer.map(s => String(s).trim());
          is_correct = (u.length === c.length && u.every((v, i) => v === c[i]));
        } else {
          is_correct = (String(user_answer).trim() === String(correctAnswer).trim());
        }
    }
    
    // 2. 풀이 이력 DB에 저장
    const historyObj = {
      question_id: question_id,
      user_answer: user_answer,
      is_correct: is_correct
    };
    
    const response = supabaseFetch('/rest/v1/learning_history', 'POST', historyObj);
    
    if (!response.success) {
      Logger.log('[ERROR] Learning history save failed: ' + response.error);
      throw new Error("풀이 이력 저장에 실패했습니다: " + response.error);
    }

    // 3. 문항 테이블(questions)의 통계 컬럼 업데이트 생략 (v58 지연 업데이트 아키텍처)
    // 분석 페이지 진입 시 syncAllStats()를 통해 일괄 업데이트될 예정입니다.
    
    clearSupabaseCache();
    return { status: 'success', is_correct: is_correct, data: response.data };
    
  } catch (error) {
    Logger.log('[CRITICAL] submitAnswer Error: ' + error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * 대과목/소과목별 전체 학습 정답률을 계산하여 반환
 */
function getAnalytics() {
  try {
    // 1. 모든 문제 기본 정보 조회
    const questionsResponse = supabaseFetch('/rest/v1/questions?select=id,major_subject,minor_subject', 'GET');
    if (!questionsResponse.success) throw new Error('문제 조회 실패');
    const questions = questionsResponse.data;

    // 2. 모든 문제 풀이 이력 조회
    const historyResponse = supabaseFetch('/rest/v1/learning_history?select=question_id,is_correct', 'GET');
    if (!historyResponse.success) throw new Error('이력 조회 실패');
    const history = historyResponse.data;
    
    // 과목 조합별 통계 데이터 매핑
    const stats = {};
    const questionMap = {};
    
    questions.forEach(q => {
      questionMap[q.id] = q;
    });
    
    history.forEach(h => {
      const q = questionMap[h.question_id];
      if (!q) return; // 지워진 문제의 이력인 경우 예외처리
      
      const key = `${q.major_subject} > ${q.minor_subject}`;
      if (!stats[key]) {
        stats[key] = { total: 0, correct: 0 };
      }
      stats[key].total += 1;
      if (h.is_correct) {
        stats[key].correct += 1;
      }
    });
    
    const result = [];
    for (const [subject, data] of Object.entries(stats)) {
      result.push({
        subject,
        total_attempts: data.total,
        correct_attempts: data.correct,
        accuracy_rate: Math.round((data.correct / data.total) * 100)
      });
    }
    
    return {
      status: 'success',
      data: result
    };
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('getAnalytics', error.message, error.stack);
    }
    throw error;
  }
}

/**
 * 정답률이 지정된 기준치 이하인 자주 틀리는 문제(오답) 목록 조회
 * @param {number} threshold - 정답률 기준 퍼센트 (기본값: 50)
 */
function getWeakQuestions(threshold = 50) {
  try {
     // 1. 모든 풀이 이력 조회
    const historyResponse = supabaseFetch('/rest/v1/learning_history?select=question_id,is_correct', 'GET');
    if (!historyResponse.success) throw new Error('이력 조회 실패');
    const history = historyResponse.data;
    
    // 문항별 풀이 횟수 및 정답 횟수 합계 기록
    const qStats = {};
    history.forEach(h => {
      if (!qStats[h.question_id]) {
        qStats[h.question_id] = { total: 0, correct: 0 };
      }
      qStats[h.question_id].total += 1;
      if (h.is_correct) {
        qStats[h.question_id].correct += 1;
      }
    });
    
    const weakQuestionIds = [];
    const accRates = {};
    
    // 각 문항의 정답률 계산
    for (const [qId, data] of Object.entries(qStats)) {
      if (data.total > 0) {
        const acc = (data.correct / data.total) * 100;
        accRates[qId] = acc;
        if (acc <= threshold) {
          weakQuestionIds.push(qId);
        }
      }
    }
    
    if (weakQuestionIds.length === 0) {
      return {
        status: 'success',
        data: []
      };
    }
    
    // 2. 기준치 이하의 문제들만 DB에서 상세 정보 가져오기 (OR 조건 활용)
    const idsString = weakQuestionIds.join(',');
    const endpoint = `/rest/v1/questions?id=in.(${idsString})`;
    const weakQuestionsResponse = supabaseFetch(endpoint, 'GET');
    if (!weakQuestionsResponse.success) throw new Error('오답 목록 상세 조회 실패');
    const weakQuestions = weakQuestionsResponse.data;
    
    // 가져온 문제 데이터에 계산한 정답률을 붙인 뒤 오름차순(가장 많이 틀린 순) 정렬
    const result = weakQuestions.map(q => ({
      ...q,
      accuracy_rate: Math.round(accRates[q.id])
    })).sort((a, b) => a.accuracy_rate - b.accuracy_rate);
    
    return {
      status: 'success',
      data: result
    };
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') {
      sheetLogger.error('getWeakQuestions', error.message, error.stack);
    }
    throw error;
  }
}
