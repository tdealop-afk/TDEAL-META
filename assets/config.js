// ---------------------------------------------------------------------------
// 설정: 데이터 주소를 csvUrl 에 넣으세요. 두 가지 중 하나입니다.
//  (A) 실시간 — Apps Script 웹앱 URL (.../exec) : 지연 없음, 권장
//  (B) 게시 CSV URL : 약 5분 캐시
//  웹앱을 배포한 뒤 나오는 .../exec 주소로 아래 값을 교체하면 실시간이 됩니다.
// ---------------------------------------------------------------------------
window.DASHBOARD_CONFIG = {
  csvUrl: "https://script.google.com/macros/s/AKfycbzozIkrlLNALf0HCF5JNLzJhUs9B3G_KfSYQusp3Fopqvqb0cM5Um2rhwyE1Ny0iSN71Q/exec",

  // 자동 새로고침 간격(밀리초). 실시간 화면이라 1분마다 갱신.
  refreshMs: 60000
};
