// ====== 학교 통합 시간 관리 · AI 중계 (Gemini) ======
// 이 파일 전체를 구글 앱스스크립트 새 프로젝트의 Code.gs에 붙여 넣고,
// 프로젝트 설정 > 스크립트 속성에 GEMINI_KEY 를 추가한 뒤, 배포 > 새 배포 > 웹 앱 (액세스: 모든 사용자) 으로 배포합니다.
// 선택 속성: MODEL (비우면 사용 가능한 최신 flash 모델을 자동으로 고름), DAILY_LIMIT (기본 300, 하루 요청 상한)

var PROPS = PropertiesService.getScriptProperties();

function doGet() { return out({ ok: true, service: 'school-time-ai', model: model(), used: used(), limit: limit() }); }

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var key = PROPS.getProperty('GEMINI_KEY');
    if (!key) return out({ error: '스크립트 속성에 GEMINI_KEY가 없습니다.' });
    if (body.ping) return out({ ok: true, model: model(), used: used(), limit: limit(), models: altModels(key, '').slice(0, 8) });
    if (used() >= limit()) return out({ error: '오늘 AI 사용 한도(' + limit() + '회)에 도달했습니다. 내일 다시 쓸 수 있습니다.' });
    var req = {
      contents: [{ role: 'user', parts: [{ text: String(body.user || '') }] }],
      generationConfig: { temperature: 0.2, responseMimeType: body.json ? 'application/json' : 'text/plain' }
    };
    if (body.system) req.systemInstruction = { parts: [{ text: String(body.system) }] };
    var m = model();
    var res = callGemini(m, key, req);
    if (res.code === 404 && !PROPS.getProperty('MODEL')) { // 모델이 없어졌으면 목록에서 새로 골라 다시 시도
      m = pickModel(key, true) || m;
      res = callGemini(m, key, req);
    }
    // 혼잡(503) 또는 잠시 제한(429)이면 한 번 더 시도하고, 그래도 안 되면 다른 flash 모델들(lite, 이전 세대)로 차례로 넘어간다
    var tried = [m];
    if (res.code === 503 || res.code === 429) { Utilities.sleep(1200); res = callGemini(m, key, req); }
    if (res.code === 503 || res.code === 429) {
      var alts = altModels(key, m);
      for (var i = 0; i < alts.length && i < 4 && (res.code === 503 || res.code === 429); i++) { tried.push(alts[i]); res = callGemini(alts[i], key, req); if (res.code === 200) PROPS.setProperty('LAST_OK', alts[i]); }
    }
    var code = res.code, data = res.data;
    if (code === 503 || code === 429) return out({ error: 'AI 서버가 지금 혼잡합니다 (시도한 모델: ' + tried.join(', ') + '). 잠시 후 다시 보내 주세요.' });
    if (code !== 200) return out({ error: 'Gemini 오류 ' + code + ': ' + ((data.error && data.error.message) || '') });
    bump();
    var cand = (data.candidates || [])[0] || {};
    var parts = (cand.content && cand.content.parts) || [];
    var text = parts.map(function (p) { return p.text || ''; }).join('');
    if (!text) return out({ error: '응답이 비어 있습니다' + (cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '.' });
    return out({ text: text, used: used(), limit: limit() });
  } catch (err) { return out({ error: String(err) }); }
}

function callGemini(m, key, req) {
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + key,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(req), muteHttpExceptions: true });
  var data = {}; try { data = JSON.parse(res.getContentText() || '{}'); } catch (err) {}
  return { code: res.getResponseCode(), data: data };
}
// 모델 이름: 스크립트 속성 MODEL이 있으면 그것, 없으면 구글 모델 목록에서 가장 최신 flash 모델을 골라 기억해 둔다
function model() { return PROPS.getProperty('MODEL') || PROPS.getProperty('MODEL_AUTO') || pickModel(PROPS.getProperty('GEMINI_KEY'), true) || 'gemini-2.5-flash'; }
function pickModel(key, force) {
  if (!key) return null;
  try {
    var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key + '&pageSize=200', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var list = (JSON.parse(res.getContentText()).models || []).filter(function (m) {
      var n = m.name.replace('models/', '');
      return /^gemini-\d/.test(n) && /flash/.test(n) && !/lite|preview|exp|image|tts|audio|live|thinking|8b/.test(n) && (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0;
    }).map(function (m) { return m.name.replace('models/', ''); });
    if (!list.length) return null;
    list.sort(function (a, b) { return ver(b) - ver(a) || a.length - b.length; }); // 버전 높은 것, 그다음 짧은 이름(= 기본 모델)
    PROPS.setProperty('MODEL_AUTO', list[0]);
    return list[0];
  } catch (err) { return null; }
}
// 예비 모델들: 현재 모델을 뺀 flash 계열을 lite 우선, 최신 세대 우선으로
function altModels(key, cur) {
  try {
    var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key + '&pageSize=200', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return [];
    var names = (JSON.parse(res.getContentText()).models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
      .map(function (m) { return m.name.replace('models/', ''); })
      .filter(function (n) { return n !== cur && /^gemini-\d/.test(n) && /flash/.test(n) && !/preview|exp|image|tts|audio|live|thinking/.test(n); });
    var last = PROPS.getProperty('LAST_OK');
    names.sort(function (a, b) { return ((b === last) - (a === last)) || (ver(b) - ver(a)) || ((/lite/.test(b) ? 1 : 0) - (/lite/.test(a) ? 1 : 0)) || (a.length - b.length); });
    return names;
  } catch (err) { return []; }
}
function ver(n) { var m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; }
function limit() { return Number(PROPS.getProperty('DAILY_LIMIT') || 300); }
function todayKey() { return 'USED_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function used() { return Number(PROPS.getProperty(todayKey()) || 0); }
function bump() {
  var k = todayKey(); var all = PROPS.getProperties();
  for (var p in all) if (p.indexOf('USED_') === 0 && p !== k) PROPS.deleteProperty(p);
  PROPS.setProperty(k, String(used() + 1));
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
