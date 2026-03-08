/**
 * 초기 환경변수 세팅 (1회 실행 후 주석 처리 또는 삭제 권장)
 */
function setEnvironmentVariables() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'SHEET_ID': '1V8ZtedtdRgXU_iuvWGB1nGUW1E2nkL_-DThdhPG6qwk',
    'IMAGE_FOLDER_ID': '1U3AB-dZeUGcsjyoFV61yJD_whs5toWaE',
    'SUPABASE_URL': 'https://gpckpydodsyxilljycnk.supabase.co',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY2tweWRvZHN5eGlsbGp5Y25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzEzOTcsImV4cCI6MjA4ODU0NzM5N30.tLe4Af4NDc9FtFQNjGj9R9EE1JLQojGuazyad2y2nOY'
  });
}

/**
 * 환경변수 호출 함수
 * @param {string} key - 가져올 환경변수의 키
 * @returns {string} 환경변수 값
 */
function getEnv(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`환경변수 [${key}]가 설정되지 않았습니다.`);
  }
  return value;
}
