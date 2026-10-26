// 화성바른초 설정 — timetable.html(통합 시간표), index.html(월간운영계획)이 이 파일을 읽습니다.
window.SCHOOL_CONFIG = {
  schoolName: "화성바른초",
  schoolFullName: "화성바른초등학교",
  domain: "goedu.kr",
  showCalendarTab: true,
  logoUrl: "logo.png",   // 같은 폴더의 학교 마크 파일 (학년도 설정에서 올린 마크가 있으면 그것이 우선)
  firebase: {
    apiKey: "AIzaSyDeV51pP4BQqxReIfBmXPEST9zeok5aAOs",
    authDomain: "school-calendar-6789a.firebaseapp.com",
    projectId: "school-calendar-6789a",
    storageBucket: "school-calendar-6789a.firebasestorage.app",
    messagingSenderId: "697249862283",
    appId: "1:697249862283:web:4b75b2deb2693d771b7a8e"
  },
  timetableAppId: "hwaseong-barun-timetable-test",
  calendarAppId: "hwaseong-barun-calendar"
};
