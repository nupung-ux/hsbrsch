// 연습용 페이지 설정 — timetable.html?test 로 열면 이 파일을 읽습니다.
// 실제 운영(config.js)과 Firebase 프로젝트는 같지만 데이터가 저장되는 공간(이름표)이 달라서 서로 섞이지 않습니다.
window.SCHOOL_CONFIG = {
  schoolName: "화성바른초 (연습용)",
  schoolFullName: "화성바른초등학교",
  domain: "goedu.kr",
  showCalendarTab: false,          // 연습용에서는 월간운영계획 탭 숨김 (실제 일정표를 건드리지 않도록)
  logoUrl: "logo.png",
  sandbox: true,                   // 연습용 표시
  sandboxSource: "hwaseong-barun-timetable-test",   // "실제 데이터 복사해 오기"가 읽어 올 실제 운영 공간
  firebase: {
    apiKey: "AIzaSyDeV51pP4BQqxReIfBmXPEST9zeok5aAOs",
    authDomain: "school-calendar-6789a.firebaseapp.com",
    projectId: "school-calendar-6789a",
    storageBucket: "school-calendar-6789a.firebasestorage.app",
    messagingSenderId: "697249862283",
    appId: "1:697249862283:web:4b75b2deb2693d771b7a8e"
  },
  timetableAppId: "hwaseong-barun-timetable-sandbox",
  calendarAppId: "hwaseong-barun-calendar-sandbox"
};
