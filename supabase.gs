/**
 * Supabase 통신 유틸리티 (캐싱 기능 포함)
 */
function supabaseFetch(endpoint, method, payload) {
  const cache = CacheService.getScriptCache();
  // 캐시 버전 관리 (데이터 변경 시 버전 UP)
  const currentVersion = cache.get('SUPABASE_CACHE_VERSION') || '1';
  const cacheKey = 'SUPABASE_V' + currentVersion + '_' + Utilities.base64EncodeWebSafe(endpoint).substring(0, 100);

  // 1. GET 요청 시 캐시 확인
  if (method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return { success: true, data: JSON.parse(cached), error: null, fromCache: true };
      } catch (e) {
        cache.remove(cacheKey);
      }
    }
  }

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
      // 2. GET 요청 성공 시 결과 캐싱 (최대 10분)
      if (method === 'GET' && data) {
        try {
          // CacheService는 값의 크기 제한(100KB)이 있음
          const dataStr = JSON.stringify(data);
          if (dataStr.length < 100000) {
            cache.put(cacheKey, dataStr, 600); 
          }
        } catch (e) { console.warn('캐시 저장 실패:', e.message); }
      }
      
      // 3. CUD 작업 시 캐시 무효화 (안전을 위해 전체 관련 캐시는 불가능하므로 특정 버전 관리 필요하나, 여기서는 단순 처리)
      // 실제로는 특정 태그 기반 무효화가 좋으나 GAS 제약상 수동 관리 권장
      
      return { success: true, data: data, error: null };
    } else {
      const errorMsg = data && data.message ? data.message : 'Supabase request failed: ' + responseText;
      if (typeof sheetLogger !== 'undefined') sheetLogger.error(responseCode, errorMsg);
      return { success: false, data: null, error: errorMsg };
    }
    
  } catch (error) {
    if (typeof sheetLogger !== 'undefined') sheetLogger.error(500, error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * 캐시 강제 무효화 (데이터 변경 시 호출)
 * 버전을 올려 기존 모든 캐시를 무효화 처리
 */
function clearSupabaseCache() {
  const cache = CacheService.getScriptCache();
  const currentVersion = parseInt(cache.get('SUPABASE_CACHE_VERSION') || '1');
  const nextVersion = currentVersion + 1;
  cache.put('SUPABASE_CACHE_VERSION', nextVersion.toString(), 21600); // 6시간 유지
  Logger.log('[CACHE] Version bumped to: ' + nextVersion);
}
