'use strict';

// File bytes stay in this browser's IndexedDB; only descriptive metadata enters the preview dataset.
const FILE_STORE_NAME = 'mnu333-local-attachments-v1';
let attachmentPreviewUrl = null;
let patientArchiveKind = 'all';
let patientArchiveQuery = '';

function openFileStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_STORE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAttachmentBytes(id, file) {
  const store = await openFileStore();
  try {
    await new Promise((resolve, reject) => {
      const transaction = store.transaction('files', 'readwrite');
      transaction.objectStore('files').put(file, id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { store.close(); }
}

async function loadAttachmentBytes(id) {
  const store = await openFileStore();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = store.transaction('files', 'readonly');
      const request = transaction.objectStore('files').get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally { store.close(); }
}

function attachmentRows(patientId) {
  const list = db.attachments.filter(a => a.patient === patientId).slice().reverse();
  return list.length ? list.map(a => `<article class="attachment-row">
    <span class="attachment-file-icon">${icon(a.kind === 'أشعة' ? 'scan' : 'file')}</span>
    <div><strong>${esc(a.title)}</strong><small>${esc(a.kind || 'مستند')} · ${esc(a.filename)} · ${esc(a.date || '')}</small><small>أضافه: ${esc(a.uploader === 'patient' ? 'المريض' : a.uploader === 'radiologist' ? 'طبيب الأشعة' : 'الطبيب')}</small></div>
    ${a.id ? button('عرض الملف', 'attachment-open', 'secondary small', `data-id="${esc(a.id)}"`) : '<span class="attachment-legacy">بيانات وصفية فقط</span>'}
  </article>`).join('') : '<div class="attachment-empty">لا توجد مرفقات حتى الآن. أضف صورة أو تقريرًا ليظهر هنا.</div>';
}

function patientAttachmentsPage() {
  return patientHealthArchivePage();
}

function attachmentsPage() {
  const p = patient();
  const radiology = role === 'radiologist';
  if (!p && role === 'doctor') return doctorNoPatients();
  return `<section class="attachment-page clinician-attachments"><div class="attachment-head"><div><span class="section-kicker">${radiology?'مساحة الأشعة':'ملف المريض'}</span><h1>${radiology?'الأشعة والمرفقات':'الفحوصات والمستندات'}</h1><p>أضف ملف الفحص وراجعه داخل ملف المريض في هذه المعاينة المحلية.</p></div>${button(icon('upload')+(radiology?' إضافة أشعة':' إضافة مرفق'),'attachment-upload','primary')}</div>
    <label class="attachment-patient-select">المريض <select id="attachment-patient" class="input">${(role === 'doctor' ? doctorPatients() : db.patients).map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?'selected':''}>${esc(x.name)} · ${esc(x.id)}</option>`).join('')}</select></label>
    <div class="attachment-panel"><div class="attachment-panel-title"><h2>مرفقات ${esc(p.name)}</h2><span>${db.attachments.filter(a=>a.patient===p.id).length} مرفقات</span></div>${attachmentRows(p.id)}</div>
    <p class="attachment-disclaimer">الملفات محفوظة في هذا المتصفح للتجربة فقط، ولا تُرسل إلى خادم المستشفى.</p></section>`;
}

function consultationsPage() {
  const list = db.appointments.filter(a => ['مؤكد','تم تسجيل الوصول'].includes(a.status) && a.doctor === demoDoctor && doctorCanAccess(a.patient)).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `<section class="attachment-page"><div class="attachment-head"><div><span class="section-kicker">مساحة الطبيب</span><h1>الكشف والزيارات</h1><p>مواعيد الكشف المسجلة وملفات المرضى الجاهزة للفحص السريري.</p></div></div>
    <div class="attachment-panel"><div class="attachment-panel-title"><h2>قائمة الكشف</h2><span>${list.length} مواعيد</span></div>${list.length ? list.map(a=>{return doctorAppointmentRow(a)}).join('') : '<div class="attachment-empty">لا توجد مواعيد كشف مسجلة للطبيبة.</div>'}</div></section>`;
}

function isAttachmentImage(filename) {
  return /\.(png|jpe?g|webp)$/i.test(filename || '');
}

function openAttachmentForm(initialKind) {
  if (!['patient','doctor','radiologist'].includes(role)) return;
  const patientId = role === 'patient' ? demoSession.patientId : selected;
  const uploader = role;
  if (uploader === 'doctor' && !doctorCanAccess(patientId)) return;
  const labImage = uploader === 'patient' && initialKind === 'تحليل';
  const visits = db.visits.filter(v => v.patient === patientId && v.approved && v.id);
  modal(role === 'radiologist' ? 'إضافة ملف أشعة' : labImage ? 'إضافة صورة نتيجة المختبر' : 'إضافة مرفق', `<form id="attachment-form" class="attachment-form">
    <p>الملف مرتبط بالمريض: <strong>${esc(db.patients.find(p=>p.id===patientId)?.name || patientId)}</strong></p>
    <label class="field"><span>عنوان المرفق</span><input class="input" name="title" maxlength="80" required placeholder="مثال: أشعة صدر أو تقرير فحص"></label>
    <label class="field"><span>نوع المرفق</span><select class="input" name="kind" ${role==='radiologist'||labImage?'disabled':''}><option ${role==='radiologist'?'selected':''}>أشعة</option><option ${labImage?'selected':''}>تحليل</option><option>تقرير</option><option>مستند آخر</option></select></label>
    <label class="field"><span>تاريخ الفحص</span><input class="input" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
    ${visits.length ? `<label class="field"><span>ربط بزيارة (اختياري)</span><select class="input" name="visit"><option value="">بدون ربط</option>${visits.map(v =>
      `<option value="${esc(v.id)}">${esc(v.date)} · ${esc(v.id)}</option>`).join('')}</select></label>` : ''}
    <label class="field"><span>الملف</span><input class="input" name="file" type="file" accept="${labImage ? 'image/png,image/jpeg,image/webp' : '.pdf,.png,.jpg,.jpeg,.webp,.dcm,application/pdf,image/png,image/jpeg,image/webp'}" required></label>
    <small>${labImage ? 'صورة JPG أو PNG أو WebP، حتى 10 MB.' : 'PDF أو صورة أو DICOM، حتى 10 MB. يمكن عرض الصور وPDF هنا، وتنزيل DICOM.'}</small><p id="attachment-error" class="form-error" role="alert"></p>
    <div class="attachment-form-actions"><button type="button" class="button secondary" data-action="close">إلغاء</button><button type="submit" class="button primary">حفظ المرفق</button></div>
  </form>`);
  $('#attachment-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (demoSession?.role !== uploader || (uploader === 'doctor' && !doctorCanAccess(patientId))) return;
    const file = form.elements.file.files[0];
    const title = form.elements.title.value.trim();
    const kind = uploader === 'radiologist' ? 'أشعة' : form.elements.kind.value;
    const visit = visits.find(v => v.id === form.elements.visit?.value)?.id;
    const date = form.elements.date.value;
    const error = $('#attachment-error');
    if (!title || !file || !date || !['أشعة','تحليل','تقرير','مستند آخر'].includes(kind)) { error.textContent='أكمل عنوان المرفق ونوعه وتاريخه والملف.'; return; }
    if (file.size > 10*1024*1024 || !/\.(pdf|png|jpe?g|webp|dcm)$/i.test(file.name)) { error.textContent='اختر PDF أو صورة أو DICOM بحجم لا يتجاوز 10 MB.'; return; }
    if (uploader === 'patient' && kind === 'تحليل' && !isAttachmentImage(file.name)) { error.textContent='أضف نتيجة المختبر كصورة JPG أو PNG أو WebP.'; return; }
    if (form.dataset.saving) return;
    form.dataset.saving = 'true';
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    const id = 'F' + crypto.randomUUID();
    try {
      await saveAttachmentBytes(id, file);
      db.attachments.push({id,patient:patientId,title,kind,date,filename:file.name,mime:file.type,size:file.size,uploader,visit});
      log('إضافة مرفق ' + kind, patientId);
      if (form.isConnected) { closeModal();render();toast('تم حفظ المرفق ويمكن عرضه الآن.'); }
    } catch {
      error.textContent='تعذر حفظ الملف في هذا المتصفح. جرّب ملفًا أصغر أو مساحة تخزين متاحة.';
      delete form.dataset.saving;
      if (submit) submit.disabled = false;
    }
  });
}

async function showAttachment(id) {
  const meta = db.attachments.find(a => a.id === id && (role !== 'patient' || a.patient === demoSession.patientId) && (role === 'patient' || a.patient === selected));
  if (!meta || (role === 'doctor' && !doctorCanAccess(meta.patient))) return;
  const session = demoSession;
  let file;
  try { file = await loadAttachmentBytes(id); } catch { toast('تعذر فتح الملف المحفوظ.'); return; }
  if (session !== demoSession || (role === 'doctor' && !doctorCanAccess(meta.patient))) return;
  if (role === 'doctor' && file) log('عرض مرفق طبي',meta.id);
  if (!file) { toast('هذا المرفق قديم أو غير متاح في هذا المتصفح.'); return; }
  if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
  attachmentPreviewUrl = URL.createObjectURL(file);
  const image = /\.(png|jpe?g|webp)$/i.test(meta.filename);
  const pdf = /\.pdf$/i.test(meta.filename);
  const preview = image ? `<img class="attachment-preview-image" src="${attachmentPreviewUrl}" alt="${esc(meta.title)}">` : pdf ? `<iframe class="attachment-preview-pdf" src="${attachmentPreviewUrl}" title="${esc(meta.title)}"></iframe>` : '<p>لا يمكن عرض DICOM داخل هذه المعاينة. يمكنك تنزيله وفتحه بعارض طبي مناسب.</p>';
  modal(esc(meta.title), `<div class="attachment-preview">${preview}<p>${esc(meta.filename)} · ${esc(meta.date)}</p><a class="button primary" href="${attachmentPreviewUrl}" download="${esc(meta.filename)}">تنزيل الملف</a></div>`);
}

document.addEventListener('change', event => {
  if (event.target.id === 'attachment-patient' && (role === 'radiologist' || role === 'doctor' && doctorCanAccess(event.target.value)) && db.patients.some(p=>p.id===event.target.value)) { selected=event.target.value; render(); }
});
document.addEventListener('click', event => {
  const element = event.target.closest('[data-action]');
  if (!element || !demoSession || !allowAction(element.dataset.action,element)) return;
  if (element.dataset.action === 'attachment-upload') openAttachmentForm(element.dataset.kind);
  if (element.dataset.action === 'attachment-open') showAttachment(element.dataset.id);
  if (element.dataset.action === 'attachment-filter' && role === 'patient' && ['all','أشعة','تقرير','تحليل','مستند آخر'].includes(element.dataset.kind)) { patientArchiveKind=element.dataset.kind; render(); }
  if (element.dataset.action === 'close' && attachmentPreviewUrl) { URL.revokeObjectURL(attachmentPreviewUrl); attachmentPreviewUrl=null; }
});
document.addEventListener('input', event => {
  if (event.target.id !== 'patient-archive-search' || role !== 'patient') return;
  const position=event.target.selectionStart;
  patientArchiveQuery=event.target.value;
  render();
  const input=$('#patient-archive-search');
  input?.focus();
  input?.setSelectionRange(position,position);
});
