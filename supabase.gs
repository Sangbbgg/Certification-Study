/**
 * Supabase 통신 유틸리티
 * @param {string} endpoint - 예: '/rest/v1/questions'
 * @param {string} method - 'GET', 'POST', 'PATCH', 'DELETE' 등
 * @param {object} payload - (선택적) 전송할 데이터 객체
 * @returns {object} { success: boolean, data: any, error: string|null }
 */
function supabaseFetch(endpoint, method, payload) {
  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL 또는 Key 환경변수가 설정되지 않았습니다.');
    }
    
    const url = supabaseUrl + endpoint;
    const options = {
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    if (payload) {
      options.payload = JSON.stringify(payload);
    }
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = responseText;
      }
    }
    
    if (responseCode >= 200 && responseCode < 300) {
      return { success: true, data: data, error: null };
    } else {
      const errorMsg = data && data.message ? data.message : 'Supabase request failed: ' + responseText;
      sheetLogger.error(responseCode, errorMsg);
      return { success: false, data: null, error: errorMsg };
    }
    
  } catch (error) {
    sheetLogger.error(500, error.message);
    return { success: false, data: null, error: error.message };
  }
}
