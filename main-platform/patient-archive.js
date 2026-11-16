'use strict';

const healthArchiveTabs = [['overview','الملخص'],['visits','الزيارات'],['tests','النتائج والأشعة'],
  ['instructions','التعليمات والروشتات'],['files','ملفاتي'],['medications','أدويتي']].map(([id,label])=>[id,label,id==='overview'?'patient-attachments':'patient-attachments/'+id]);

function patientHealthResults(id, category='all', preview=false) {
  const filters = [['all','الكل','patient-attachments/tests'],['imaging','أشعة','patient-attachments/tests/imaging'],
    ['lab','تحاليل','patient-attachments/tests/lab'],['values','قيم رقمية','patient-attachments/tests/values']];
  const files = db.attachments.filter(row=>row.patient===id).slice().reverse();
  const results = patientApprovedResults(id);
  const reports = files.filter(row=>row.kind==='تقرير');
  if (!filters.some(([key])=>category===key) && category!=='reports') category='all';
  if (preview) {
    const available = files.some(row=>['أشعة','تحليل','تقرير'].includes(row.kind))||results.length;
    const previewFilters = [...filters.slice(0,3),['reports','تقارير','patient-attachments/tests/reports']];
    return patientScreenPanel('النتائج والأشعة',patientScreenPills(previewFilters,'all','أنواع النتائج')+
      (available?link('عرض النتائج والأشعة','patient-attachments/tests','secondary'):patientScreenEmpty('لا توجد نتائج بعد · ستظهر هنا فور إتاحتها')));
  }
  const attachments = kind=>files.filter(row=>row.kind===kind).map(healthArchiveFileRow).join('');
  const reviews = patientResultPanels(results.filter(row=>row.kind==='review'),'reports');
  const show = type=>category==='all'||category===type;
  return patientScreenPills(filters,category,'أنواع النتائج')+
    (show('imaging')?patientScreenPanel('صور وتقارير الأشعة',attachments('أشعة')||patientScreenEmpty('لا توجد نتائج بعد')):'')+
    (show('lab')?patientScreenPanel('ملفات التحاليل',attachments('تحليل')||patientScreenEmpty('لا توجد نتائج بعد')):'')+
    (show('values')?patientResultPanels(results.filter(row=>row.kind==='lab'),'values'):'')+
    (category==='reports'||(category==='all'&&(reports.length||reviews))?
      patientScreenPanel('التقارير',reports.map(healthArchiveFileRow).join('')+reviews||patientScreenEmpty('لا توجد تقارير بعد')):'');
}

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
  return date ? date.toLocaleDateString('ar-EG-u-nu-latn', options) : String(value || 'تاريخ غير محدد');
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
  const counts = kind=>kind==='all'?all.length:all.filter(row=>row.kind===kind).length;
  const filters = types.map(([kind,label])=>`<button type="button" class="patient-pill" data-action="attachment-filter"
    data-kind="${esc(kind)}" aria-pressed="${patientArchiveKind===kind}">${label}${kind==='all'||counts(kind)?' '+counts(kind):''}</button>`).join('');
  const sections = [...groups].map(([month,files]) => '<section class="patient-archive-group"><h3>' + esc(month) + '<span>' + healthArchiveCount(files.length,'ملف','ملفان','ملفات') + '</span></h3><div class="patient-archive-list">' + files.map(a => {
    const uploader = a.uploader === 'radiologist' ? 'طبيب الأشعة' : a.uploader === 'patient' ? 'أنت' : 'الطبيب';
    const open = a.id ? button('عرض الملف','attachment-open','secondary small','data-id="' + esc(a.id) + '"') : '<span class="attachment-legacy">بيانات وصفية فقط</span>';
    return '<article class="patient-archive-item"><span class="patient-archive-icon">' + icon(a.kind === 'أشعة' ? 'scan' : 'file') + '</span><div class="patient-archive-info"><strong>' + esc(a.title) + '</strong><p>' + esc(a.kind || 'مستند') + ' · أضافه ' + esc(uploader) + '</p><small title="' + esc(a.filename) + '">' + esc(a.filename) + '</small></div><time datetime="' + esc(a.date || '') + '">' + esc(healthArchiveDateLabel(a.date)) + '</time>' + open + '</article>';
  }).join('') + '</div></section>').join('');
  const empty = all.length?patientScreenEmpty('لا توجد ملفات مطابقة'):
    '<div class="patient-screen-empty patient-file-drop" data-patient-file-drop><p>لا توجد ملفات بعد · اسحب ملفًا هنا أو اضغط «إضافة مرفق»</p></div>';
  const toolbar = `<div class="patient-screen-pills patient-file-toolbar"><input id="patient-archive-search" type="search" class="input"
    aria-label="ابحث في مرفقاتي" placeholder="ابحث عن ملف" value="${esc(patientArchiveQuery)}">${filters}</div>`;
  return patientScreenPanel('ملفاتي المحفوظة · '+(all.length?healthArchiveCount(all.length,'مرفق','مرفقان','مرفقات'):'0 مرفقات'),
    toolbar+`<div class="patient-archive-results">${sections||empty}</div>`,button('إضافة مرفق','attachment-upload','primary'));
}

function healthArchiveFileRow(a) {
  return '<article class="health-archive-detail"><div><strong>' + esc(a.title) + '</strong><time>' +
    esc(healthArchiveDateLabel(a.date)) + '</time></div><p>' + esc(a.kind) + ' · ' + esc(a.filename) + '</p>' +
    (a.id ? button(isAttachmentImage(a.filename) ? 'عرض الصورة' : 'عرض الملف', 'attachment-open', 'secondary small',
      'data-id="' + esc(a.id) + '"') : '') + '</article>';
}

function patientHealthArchivePage(tab='overview',category) {
  if (!healthArchiveTabs.some(([id])=>id===tab)) tab='overview';
  const p = patient();
  const visits = db.visits.filter(v => v.patient === p.id && v.approved).slice().reverse();
  const orders = db.orders.filter(o => o.patient === p.id && visits.some(v => v.id === o.visit));
  const vitals = db.vitals[p.id];
  const past = patientAppointmentGroups().past.filter(row=>!['ملغي','لم يحضر'].includes(row.status));
  const events = [
    ...past.map(row=>({date:row.date,title:row.type+' · '+row.doctor,time:row.time})),
    ...visits.filter(row=>!past.some(a=>a.id===row.appointmentId)).map(row=>({date:row.date,title:'زيارة معتمدة · '+(row.doctor||p.doctor||'العيادة')}))
  ].sort((a,b)=>(healthArchiveDate(b.date)||0)-(healthArchiveDate(a.date)||0)).slice(0,5);
  const timeline = events.map(row=>`<article class="patient-timeline-row"><div><strong>${esc(row.title)}</strong>
    <p>${patientServiceDate(row.date)}${row.time?` · <bdi>${esc(row.time)}</bdi>`:''}</p></div></article>`).join('');
  const overview = `<div class="patient-screen-stack"><div class="patient-four">${[
    ['ضغط الدم',vitals?.pressure,'mmHg'],['النبض',vitals?.pulse,'نبضة/دقيقة'],
    ['الحرارة',vitals?.temp,'°C'],['تشبع الأكسجين',vitals?.spo2,'%']
  ].map(([label,value,unit])=>patientScreenPanel('',`<p>${label}</p><div><strong><bdi>${esc(value||'—')}</bdi></strong>
    ${value?` <span><bdi>${unit}</bdi></span>`:''}</div>`,'','patient-vital-card')).join('')}</div>
  <div class="patient-two patient-health-summary">${patientHealthResults(p.id,'all',true)}
    ${patientScreenPanel('الخط الزمني',timeline||patientScreenEmpty('لا توجد زيارات مسجلة بعد'),'','patient-timeline-panel')}</div></div>`;
  const directory = bookingDirectory();
  const rows = [
    ...past,
    ...visits.filter(v=>!past.some(row=>row.id===v.appointmentId)).map(v=>({...v,clinical:true,status:'مكتمل'}))
  ].sort((a,b)=>(healthArchiveDate(b.date)||0)-(healthArchiveDate(a.date)||0));
  const visitBody = rows.map(row=>{
    const doctor = directory[row.doctor];
    const details = 'patient-journey/'+encodeURIComponent(row.id)+(row.clinical?'/clinical':'');
    return `<article class="patient-archive-visit">
      <div class="patient-screen-record"><time class="patient-date-badge" datetime="${esc(row.date)}">
        <strong>${esc(healthArchiveDateLabel(row.date,{day:'numeric'}))}</strong><span>${esc(healthArchiveDateLabel(row.date,{month:'long'}))}</span></time>
      <div><strong>${esc([row.type||'زيارة سريرية',doctor?.specialty,row.doctor].filter(Boolean).join(' · '))}</strong>
        <p>${patientVisitDate(row.date,row.time)}${doctor?.clinic?' · '+esc(doctor.clinic):''}</p></div></div>
      <div class="patient-screen-actions">${badge(row.status==='مكتمل'?'تمت الزيارة':esc(row.status),'teal')}
        ${link('التفاصيل',details,'secondary')}
        ${doctor?.active!==false&&doctor?link('حجز متابعة','appointments/book/'+encodeURIComponent(row.doctor),'primary'):''}</div></article>`;
  }).join('');
  const visitsTab = patientScreenPanel('الزيارات السابقة',visitBody||patientScreenEmpty('لا توجد زيارات سابقة'));
  const orderBody = orders.map(o=>`<article class="health-archive-detail"><div><strong>${esc(o.type)}</strong>
    <time>${patientServiceDate(o.date)}</time></div></article>`).join('');
  const testsTab = '<div class="patient-screen-stack patient-health-results">'+patientHealthResults(p.id,category)+
    (orderBody?patientScreenPanel('طلبات الفحوصات',orderBody):'')+'</div>';
  const content = tab==='visits'?visitsTab:tab==='tests'?testsTab:tab==='files'?healthArchiveFiles(p.id):
    tab==='instructions'?patientReports():overview;
  const actions = '<div class="patient-screen-actions">'+(tab==='overview'?button('رفع ملف','attachment-upload','secondary'):'')+
    '<button class="button primary" data-patient-command="diagnostic">اطلب فحص</button></div>';
  return '<section class="patient-screen patient-health-screen">'+patientScreenHeading('صحتي',actions)+
    (tab==='overview'?patientAllergyNotice(p):'')+patientScreenPills(healthArchiveTabs,tab,'أقسام صحتي')+content+'</section>';
}
