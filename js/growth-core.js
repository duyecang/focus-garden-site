/* Shared, side-effect-free rules. Browser and Node tests use the same implementation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GardenCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function dateKey(value) {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function validDate(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const d = new Date(key + 'T12:00:00');
    return Number.isFinite(+d) && dateKey(d) === key;
  }
  function shiftDate(key, days) {
    const d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return dateKey(d);
  }
  function completedDates(task) {
    if (task.repeat && task.repeat !== 'none') return [...new Set(task.doneDates || [])].filter(validDate);
    return task.completedAt ? [dateKey(task.completedAt)] : [];
  }
  function dailyStats(data, key) {
    const completed = new Set();
    (data.tasks || []).forEach(t => {
      if (completedDates(t).includes(key)) completed.add(t.id);
    });
    const sessions = [...new Map((data.focus || []).filter(s => s.date === key && s.completed).map(s => [s.id,s])).values()];
    const focusMs = sessions.reduce((n,s) => n + s.durationMs, 0);
    const mood = (data.mood || []).find(m => m.date === key && Number.isInteger(m.mood));
    // Only completed tasks and focus sessions grow the garden; records stay deduplicated.
    const energy = Math.min(10,completed.size)*5 + Math.min(4,sessions.length)*10;
    return {completed:completed.size, sessions:sessions.length, focusMs, energy, mood:mood?.mood ?? null};
  }
  function history(data, endKey) {
    const dates = new Set();
    (data.tasks || []).forEach(t => completedDates(t).forEach(k => dates.add(k)));
    ['focus','mood','dayline'].forEach(name => (data[name] || []).forEach(x => { if(validDate(x.date)) dates.add(x.date); }));
    return [...dates].filter(k=>k<=endKey).sort().map(date=>({date,...dailyStats(data,date)}));
  }
  function garden(data, endKey) {
    const days = history(data,endKey);
    const energy = days.reduce((n,d)=>n+d.energy,0);
    const thresholds = [0,20,60,120,220];
    let stage = 0;
    thresholds.forEach((v,i)=>{ if(energy>=v) stage=i; });
    return {energy, stage, next:thresholds[stage+1] || null, activeDays:days.filter(d=>d.energy>0).length};
  }
  // Candidates are unfinished occurrences for today, supplied by the existing scheduler.
  // Unknown effort is never guessed from task text. This only ranks suggestions.
  function moodPlan(mood, candidates) {
    if (!Number.isInteger(mood) || mood<0 || mood>4) return {kind:'unrecorded',minutes:10,ids:[]};
    const kind=mood>=3?'gentle':mood===2?'steady':'open';
    const rank=kind==='open'?['deep','medium',null,'light']:['medium','light',null,'deep'];
    const eligible=candidates.filter(t=>kind!=='gentle'||t.effort==='light');
    const ids=eligible.slice().sort((a,b)=>{
      if(kind!=='gentle') {
        const score=t=>rank.indexOf(['light','medium','deep'].includes(t.effort)?t.effort:null);
        const difference=score(a)-score(b);if(difference)return difference;
      }
      return (a.time||'99:99').localeCompare(b.time||'99:99')||(a.createdAt||0)-(b.createdAt||0);
    }).map(t=>t.id);
    return {kind,minutes:kind==='gentle'?5:kind==='steady'?15:25,ids};
  }
  function normalizeBackup(data) {
    const fail = message => { throw new Error(message); };
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!object(data) || ![1,2,3,4].includes(data.version)) fail('不支持的备份版本');
    if (!Array.isArray(data.tasks)) fail('备份缺少任务列表');
    const out = {version:4};
    const arrays = ['tasks','todos','notes','goals','mood','events','jar','dayline','templates','photos','focus'];
    for (const name of arrays) {
      if (data[name] !== undefined && !Array.isArray(data[name])) fail(`${name} 必须是列表`);
      out[name] = data[name] || [];
      const ids = new Set();
      for (const row of out[name]) {
        if (!object(row)) fail(`${name} 中存在无效记录`);
        if (!['mood','dayline'].includes(name)) {
          if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) fail(`${name} 中存在无效或重复 ID`);
          ids.add(row.id);
        }
        for (const field of ['date','planDate','deadline','startDate']) {
          if (row[field] != null && row[field] !== '' && !validDate(row[field])) fail(`${name} 的日期无效`);
        }
        for (const field of ['text','title','note','goalId']) {
          if (row[field] != null && typeof row[field] !== 'string') fail(`${name} 的 ${field} 无效`);
        }
        const requiredText = ['tasks','todos','notes','jar','dayline','templates'].includes(name) ? 'text' : ['goals','events'].includes(name) ? 'title' : null;
        if (requiredText && typeof row[requiredText] !== 'string') fail(`${name} 缺少文字内容`);
        if (['mood','events','jar','dayline','photos'].includes(name) && !validDate(row.date)) fail(`${name} 缺少日期`);
        for (const field of ['createdAt','completedAt','firstCompletedAt','updatedAt','lastMovedAt','sealedAt','remindAt']) {
          if (row[field] != null && (!Number.isFinite(row[field]) || row[field] < 0)) fail(`${name} 的时间戳无效`);
        }
        if (row.tags != null && (!Array.isArray(row.tags) || row.tags.some(t=>typeof t!=='string'))) fail('标签格式无效');
        if (row.doneDates != null && (!Array.isArray(row.doneDates) || row.doneDates.some(d=>!validDate(d)))) fail('重复任务完成日期无效');
        if (row.repeat != null && !['none','daily','weekly','monthly'].includes(row.repeat)) fail('重复规则无效');
        if (name==='tasks' && row.effort!=null && !['light','medium','deep'].includes(row.effort)) fail('任务精力标记无效');
        if (name==='mood' && row.mood != null && (!Number.isInteger(row.mood)||row.mood<0||row.mood>4)) fail('心情记录无效');
        if (name==='photos' && (typeof row.img!=='string'||!/^data:image\/(jpeg|png|webp|gif);base64,/.test(row.img))) fail('照片数据无效');
        if (name==='focus' && (!validDate(row.date)||!Number.isFinite(row.durationMs)||row.durationMs<60000||row.durationMs>7200000||row.completed!==true)) fail('专注记录无效');
      }
    }
    out.quadrant = data.quadrant || {};
    if (!object(out.quadrant) || Object.values(out.quadrant).some(v=>!Number.isInteger(v)||v<0||v>3)) fail('四象限格式无效');
    for (const name of ['bg','petImg']) {
      out[name] = data[name] || null;
      if (out[name] && (typeof out[name]!=='string'||!/^data:image\/(jpeg|png|webp|gif);base64,/.test(out[name]))) fail('背景或桌宠图片无效');
    }
    if(data.preferences!=null) {
      if(!object(data.preferences)||!['auto','almond','mist','lavender','sage'].includes(data.preferences.palette)) fail('配色偏好无效');
      out.preferences={palette:data.preferences.palette};
    }
    return JSON.parse(JSON.stringify(out));
  }
  return {dateKey,validDate,shiftDate,dailyStats,history,garden,moodPlan,normalizeBackup};
});
