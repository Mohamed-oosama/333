'use strict';

let patientHealthTab = 'overview';
const healthArchiveTabs = [['overview','الملخص'],['visits','الزيارات'],['tests','الفحوصات والطلبات'],['files','الملفات المرفقة']];

function healthArchiveDate(value) {
  const normalized = String(value || '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[\u200e\u200f]/g, '');
  let date = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) date = new Date(normalized.slice(0, 10) + 'T12:00:00');
  else {
    const parts = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) date = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), 12);
  }
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function healthArchiveDateLabel(value, options = {day:'numeric',month:'long',year:'numeric'}) {
  const date = healthArchiveDate(value);
  return date ? date.toLocaleDateString('ar-EG', options) : String(value || 'تاريخ غير محدد');
}

function healthArchiveCount(count, noun, dual, plural) {
  return count === 1 ? noun + ' واحد' : count === 2 ? dual : count + ' ' + plural;
}

function healthArchivePanel(title, body, extra = '') {
  return '<section class="health-archive-panel"><div class="health-archive-panel-head"><h2>' + title + '</h2>' + extra + '</div><div class="health-archive-panel-body">' + body + '</div></section>';
}

function healthArchiveFiles(patientId) {
  const all = db.attachments.filter(a => a.patient === patientId).slice().reverse().sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  const types = [['all','كل الملفات'],['أشعة','الأشعة'],['تقرير','التقارير'],['تحليل','التحاليل'],['مستند آخر','أخرى']];
  const query = patientArchiveQuery.trim().toLocaleLowerCase('ar');
  const visible = all.filter(a => (patientArchiveKind === 'all' || a.kind === patientArchiveKind) && (!query || [a.title,a.filename,a.kind].some(v => String(v || '').toLocaleLowerCase('ar').includes(query))));
  const groups = new Map();
  visible.forEach(a => {
    const month = healthArchiveDateLabel(a.date, {month:'long',year:'numeric'});
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(a);
  });
  const filters = types.map(([kind,label]) => '<button type="button" data-action="attachment-filter" data-kind="' + esc(kind) + '" aria-pressed="' + (patientArchiveKind === kind) + '">' + label + '<span>' + (kind === 'all' ? all.length : all.filter(a => a.kind === kind).length) + '</span></button>').join('');
  const sections = [...groups].map(([month,files]) => '<section class="patient-archive-group"><h3>' + esc(month) + '<span>' + healthArchiveCount(files.length,'ملف','ملفان','ملفات') + '</span></h3><div class="patient-archive-list">' + files.map(a => {
    const uploader = a.uploader === 'radiologist' ? 'طبيب الأشعة' : a.uploader === 'patient' ? 'أنت' : 'الطبيب';
    const open = a.id ? button('عرض الملف','attachment-open','secondary small','data-id="' + esc(a.id) + '"') : '<span class="attachment-legacy">بيانات وصفية فقط</span>';
    return '<article class="patient-archive-item"><span class="patient-archive-icon">' + icon(a.kind === 'أشعة' ? 'scan' : 'file') + '</span><div class="patient-archive-info"><strong>' + esc(a.title) + '</strong><p>' + esc(a.kind || 'مستند') + ' · أضافه ' + esc(uploader) + '</p><small title="' + esc(a.filename) + '">' + esc(a.filename) + '</small></div><time datetime="' + esc(a.date || '') + '">' + esc(healthArchiveDateLabel(a.date)) + '</time>' + open + '</article>';
  }).join('') + '</div></section>').join('');
  return '<div class="health-archive-files-intro"><div><h2>ملفاتي المحفوظة</h2><p>صور الأشعة والتقارير والمستندات حسب تاريخ الفحص.</p></div><strong>' + healthArchiveCount(all.length,'مرفق','مرفقان','مرفقات') + '</strong></div>' +
    '<div class="patient-archive-toolbar"><div class="patient-archive-filters" aria-label="تصنيف المرفقات">' + filters + '</div><label class="patient-archive-search">' + icon('search') + '<input id="patient-archive-search" type="search" aria-label="ابحث في مرفقاتي" placeholder="ابحث عن ملف" value="' + esc(patientArchiveQuery) + '"></label></div>' +
    '<div class="patient-archive-results">' + (sections || '<div class="attachment-empty">لا توجد ملفات مطابقة. جرّب تصنيفًا آخر أو أضف مرفقًا جديدًا.</div>') + '</div>';
}

function patientHealthArchivePage() {
  const p = patient();
  const attachments = db.attachments.filter(a => a.patient === p.id);
  const visits = db.visits.filter(v => v.patient === p.id && v.approved).slice().reverse();
  const sharedPlans = db.sharedReports.filter(r => r.patient === p.id).slice().reverse();
  const orders = db.orders.filter(o => o.patient === p.id && visits.some(v => v.id === o.visit));
  const appointments = db.appointments.filter(a => a.patient === p.id && a.status !== 'ملغي').slice().sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = appointments.find(a => a.date >= DEMO_TODAY);
  const vitals = db.vitals[p.id];
  const tabs = healthArchiveTabs.map(([id,label]) => '<button type="button" role="tab" data-action="health-archive-tab" data-tab="' + id + '" aria-selected="' + (patientHealthTab === id) + '">' + label + '</button>').join('');
  const identity = '<div class="health-archive-identity">' + personAvatar(p,true) + '<div class="health-archive-person"><h2>' + esc(p.name) + '</h2><p>رقم الملف: <bdi>' + esc(p.id) + '</bdi> · ' + esc(p.age) + ' سنة · ' + esc(p.gender) + '</p><p>الطبيب المتابع: ' + esc(p.doctor || 'غير محدد') + '</p></div>' + (p.allergy && !p.allergy.startsWith('لم ') ? '<span class="health-archive-allergy">' + icon('info') + esc(p.allergy) + '</span>' : '') + '</div>';

  const summary = '<div class="health-archive-facts">' +
    '<div><span>الموعد القادم</span><strong>' + (next ? esc(healthArchiveDateLabel(next.date,{day:'numeric',month:'long'})) : 'لا يوجد') + '</strong><small>' + (next ? esc(next.time + ' · ' + next.doctor) : 'يمكنك حجز موعد جديد') + '</small></div>' +
    '<div><span>الزيارات المعتمدة</span><strong>' + visits.length + '</strong><small>زيارات مسجلة في ملفك</small></div>' +
    '<div><span>المرفقات</span><strong>' + attachments.length + '</strong><small>أشعة وتقارير ومستندات</small></div></div>';
  const events = [
    ...appointments.map(a => ({date:a.date,title:'موعد كشف',detail:a.doctor + ' · ' + a.type + ' · ' + a.time,icon:'calendar'})),
    ...visits.map(v => ({date:v.date,title:'زيارة سريرية معتمدة',detail:'زيارة مسجلة في ملفك',icon:'doctor'})),
    ...attachments.map(a => ({date:a.date,title:'مرفق في الملف',detail:a.title,icon:a.kind === 'أشعة' ? 'scan' : 'file'}))
  ].sort((a,b) => (healthArchiveDate(b.date)?.getTime() || 0) - (healthArchiveDate(a.date)?.getTime() || 0)).slice(0,6);
  const timeline = events.length ? '<div class="health-archive-timeline">' + events.map(e => '<div class="health-archive-event"><span>' + icon(e.icon) + '</span><div><strong>' + esc(e.title) + '</strong><p>' + esc(e.detail) + '</p></div><time>' + esc(healthArchiveDateLabel(e.date)) + '</time></div>').join('') + '</div>' : '<p class="health-archive-empty">لا توجد أحداث مسجلة في الملف بعد.</p>';
  const vitalRows = vitals ? [['النبض',vitals.pulse,'نبضة/دقيقة'],['ضغط الدم',vitals.pressure,'mmHg'],['الحرارة',vitals.temp,'°C'],['تشبع الأكسجين',vitals.spo2,'%']].map(([label,value,unit]) => '<div class="health-archive-vital"><span>' + label + '</span><strong><bdi>' + esc(value || '—') + ' ' + unit + '</bdi></strong></div>').join('') + '<p class="health-archive-footnote">آخر قراءات مسجلة؛ تاريخ القياس غير متاح في المعاينة.</p>' : '<p class="health-archive-empty">لا توجد قراءات مسجلة.</p>';
  const appointmentRows = appointments.slice(0,3).map(a => '<div class="health-archive-appointment"><div><strong>' + esc(healthArchiveDateLabel(a.date)) + '</strong><small>' + esc(a.doctor + ' · ' + a.type) + '</small></div><bdi>' + esc(a.time) + '</bdi></div>').join('') || '<p class="health-archive-empty">لا يوجد موعد قادم.</p>';
  const overview = '<div class="health-archive-grid"><div class="health-archive-main-column">' +
    healthArchivePanel('ملخص ملفك',summary) +
    healthArchivePanel('التسلسل الزمني للرعاية',timeline,'<span>الأحدث أولًا</span>') +
    '</div><aside class="health-archive-side-column">' +
    healthArchivePanel('العلامات الحيوية المسجلة',vitalRows) +
    healthArchivePanel('مواعيدك القادمة',appointmentRows,'<a href="#appointments">عرض الكل</a>') +
    '</aside></div>';
  const visitBody = visits.length ? visits.map(v => '<article class="health-archive-detail"><div><strong>زيارة سريرية معتمدة</strong><time>' + esc(healthArchiveDateLabel(v.date)) + '</time></div><p>تم اعتماد الزيارة في ملفك الطبي.</p></article>').join('') : '<p class="health-archive-empty">لا توجد زيارات معتمدة في الملف بعد.</p>';
  const sharedBody = sharedPlans.length ? sharedPlans.map(r => '<article class="health-archive-detail"><div><strong>تعليمات مشاركة من الطبيب</strong><time>' + esc(healthArchiveDateLabel(r.date)) + '</time></div><p>' + esc(r.plan) + '</p></article>').join('') : '<p class="health-archive-empty">لم يشارك الطبيب تعليمات متابعة بعد.</p>';
  const visitsTab = '<div class="health-archive-stack">' + healthArchivePanel('الزيارات السابقة',visitBody) + healthArchivePanel('تعليمات الطبيب المتاحة لك',sharedBody) + '</div>';
  const orderBody = orders.length ? orders.map(o => '<article class="health-archive-detail"><div><strong>' + esc(o.type) + '</strong><time>' + esc(healthArchiveDateLabel(o.date)) + '</time></div><p>طلب فحص مسجل؛ راجع المرفقات للاطلاع على أي ملف مضاف.</p></article>').join('') : '<p class="health-archive-empty">لا توجد طلبات فحوصات معتمدة في الملف.</p>';
  const testFiles = attachments.filter(a => ['أشعة','تحليل','تقرير'].includes(a.kind));
  const testBody = testFiles.length ? testFiles.slice().reverse().map(a => '<article class="health-archive-detail"><div><strong>' + esc(a.title) + '</strong><time>' + esc(healthArchiveDateLabel(a.date)) + '</time></div><p>' + esc(a.kind) + ' · ' + esc(a.filename) + '</p>' + (a.id ? button('عرض الملف','attachment-open','secondary small','data-id="' + esc(a.id) + '"') : '') + '</article>').join('') : '<p class="health-archive-empty">لا توجد ملفات فحوصات مضافة بعد.</p>';
  const testsTab = '<div class="health-archive-stack">' + healthArchivePanel('طلبات الفحوصات',orderBody) + healthArchivePanel('ملفات الأشعة والتحاليل والتقارير',testBody) + '</div>';
  const content = patientHealthTab === 'visits' ? visitsTab : patientHealthTab === 'tests' ? testsTab : patientHealthTab === 'files' ? healthArchiveFiles(p.id) : overview;
  return '<section class="health-archive-page"><header class="health-archive-title"><div><span>بوابة المريض / مرفقاتي</span><h1>أرشيفي الصحي</h1><p>مواعيدك وزياراتك وفحوصاتك وملفاتك في مكان واحد.</p></div><div class="health-archive-actions">' + button(icon('calendar') + ' حجز موعد','book','secondary') + button(icon('plus') + ' إضافة مرفق','attachment-upload','primary') + '</div></header>' +
    identity + '<nav class="health-archive-tabs" role="tablist" aria-label="أقسام الأرشيف الصحي">' + tabs + '</nav><div class="health-archive-content" role="tabpanel">' + content + '</div><p class="attachment-disclaimer">بيانات عرض محلية في هذا المتصفح. لا تُدخل بيانات طبية حقيقية.</p></section>';
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action="health-archive-tab"]');
  if (!control || role !== 'patient' || !demoSession) return;
  if (!healthArchiveTabs.some(([id]) => id === control.dataset.tab)) return;
  patientHealthTab = control.dataset.tab;
  render();
});
