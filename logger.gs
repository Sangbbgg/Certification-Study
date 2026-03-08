/**
 * sheetLogger 모듈
 * 에러 발생 시 sheetLogger.error(statusCode, errorMessage) 형태로 사용합니다.
 */
const sheetLogger = {
  error: function(statusCode, errorMessage) {
    try {
      // 환경변수 로드
      const sheetId = getEnv('SHEET_ID');
      if (!sheetId) return;

      const spreadsheet = SpreadsheetApp.openById(sheetId);
      const sheet = spreadsheet.getSheets()[0]; // 1번째 시트(Sheet1) 사용
      
      // 타임스탬프 (가독성 좋은 포맷 생성)
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      
      // 행 삽입
      sheet.appendRow([timestamp, statusCode, errorMessage]);
    } catch (e) {
      // 에러 로깅 기능 자체가 실패하더라도 묵음(Silent fail) 처리하여 전체 프로세스 중단을 방지
    }
  }
};
