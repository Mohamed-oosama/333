const receptionTitles = {
  dashboard: 'لوحة الاستقبال', patients: 'المرضى', appointments: 'الحجوزات والجداول',
  'reception-checkin': 'مكتب الاستقبال', queue: 'مكتب الاستقبال', 'reception-file':'ملف المريض',
  'reception-schedule': 'الحجوزات والجداول', 'reception-reports': 'التقارير',
  'reception-billing':'الحسابات والمدفوعات', 'reception-admissions':'الإقامة: الدخول والخروج',
  'reception-services':'خدمات الاستقبال'
};
const receptionQueueStates = {
  waiting: {label: 'في الانتظار', next: 'called', action: 'نداء المريض'},
  called: {label: 'تم النداء', next: 'in-consultation', action: 'بدء الكشف'},
  'in-consultation': {label: 'داخل الكشف', next: 'completed', action: 'إنهاء الكشف'},
  completed: {label: 'اكتمل الكشف'}
};
let receptionScheduleDate = '';
let receptionBookingQuery = '';

const receptionToday = () => bookingDateKey(new Date());
const receptionPerson = id => db.patients.find(p => p.id === id);
const receptionClinic = a => bookingDirectory()[a.doctor]?.clinic || 'العيادة غير محددة';
const receptionSearchText = value => String(value ?? '')
  .replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10)).trim().toLowerCase();
const receptionPhone = value => receptionSearchText(value).replace(/[\s()+-]/g, '').replace(/^(?:0020|20)(?=1\d{9}$)/, '0');
const receptionDate = value => value ? healthArchiveDateLabel(value) : '—';
const receptionIdAttr = item => 'data-id="' + esc(item.id) + '"';
const receptionBookingOrder = (a,b) => (a.date + a.time).localeCompare(b.date + b.time);

function receptionPageHead(route, description, actions = '') {
  return pageHead(receptionTitles[route], description, actions, 'بوابة الاستقبال');
}

function receptionCard(title, body, actions = '') {
  return '<section class="card reception-card"><div class="card-header"><h2>' + title + '</h2>' + actions +
    '</div><div class="card-body">' + body + '</div></section>';
}

function receptionMatches(person, value, includeBookings = true) {
  const term = receptionSearchText(value);
  const phone = receptionPhone(term);
  return !term || [person.name, person.id].some(v => receptionSearchText(v).includes(term)) ||
    (/^\d+$/.test(phone) && receptionPhone(person.phone).includes(phone)) ||
    (includeBookings && db.appointments.some(a => a.patient === person.id && receptionSearchText(a.id) === term));
}

function receptionRows(items) {
  return items.length ? '<div class="reception-list">' + items.join('') + '</div>' :
    '<p class="reception-empty">لا توجد بيانات مطابقة.</p>';
}

function receptionRow(title, detail, actions = '') {
  return '<div class="reception-row"><div class="reception-row-copy"><strong>' + title +
    '</strong><small>' + detail + '</small></div><div class="reception-actions">' + actions + '</div></div>';
}

function receptionStats(date) {
  const appointments = db.appointments.filter(a => a.date === date);
  const arrivals = db.appointments.filter(a => a.queueDate === date ||
    (!a.queueDate && a.date === date && a.status === 'تم تسجيل الوصول'));
  const patients = new Set(appointments.filter(a => a.status !== 'ملغي').concat(arrivals).map(a => a.patient));
  const waitTimes = arrivals.filter(a => a.calledAt && a.arrivalAt)
    .map(a => (Date.parse(a.calledAt) - Date.parse(a.arrivalAt)) / 60000)
    .filter(minutes => Number.isFinite(minutes) && minutes >= 0);
  const newPatients = db.patients.filter(p => p.registeredDate === date).length;
  const present = arrivals.filter(a => a.status === 'تم تسجيل الوصول');
  const waiting = present.filter(a => !a.queueState || a.queueState === 'waiting').length;
  const completed = appointments.filter(a => a.status === 'مكتمل').length;
  const cancelled = appointments.filter(a => a.status === 'ملغي').length;
  const upcoming = appointments.filter(a => canEditBooking(a)).length;
  const average = waitTimes.length ? Math.round(waitTimes.reduce((sum,n) => sum+n,0) / waitTimes.length) + ' د' : '—';
  return {appointments, metrics: [['مرضى اليوم', patients.size], ['ملفات جديدة', newPatients],
    ['داخل العيادات', new Set(present.map(a => a.patient)).size], ['حجوزات قادمة', upcoming], ['في الانتظار', waiting],
    ['كشوف مكتملة', completed], ['مواعيد ملغاة', cancelled], ['متوسط الانتظار', average]]};
}

function receptionMetrics(metrics) {
  return '<div class="reception-metrics">' + metrics.map(([label, value]) =>
    '<div><span>' + label + '</span><strong>' + value + '</strong></div>').join('') + '</div>';
}

function receptionNotices() {
  const pending = db.appointments.filter(a => a.status === 'بانتظار التأكيد' && canEditBooking(a)).length;
  const cancelled = db.appointments.filter(a => a.status === 'ملغي' && a.date === receptionToday()).length;
  const delayed = db.appointments.filter(a => a.queueDate === receptionToday() &&
    a.queueState === 'waiting' && Date.now() - Date.parse(a.arrivalAt) >= 30 * 60000).length;
  const notices = [[pending, 'طلب حجز بانتظار التأكيد', 'appointments'], [cancelled, 'موعد ملغى اليوم', 'appointments'],
    [delayed, 'مريض ينتظر من 30 دقيقة أو أكثر', 'queue']];
  return notices.filter(([count]) => count).map(([count,label,route]) =>
    '<div class="activity-item">' + icon('bell') + '<div><a href="#' + route + '">' +
    count + ' · ' + label + '</a></div></div>').join('') || '<p class="quiet-empty">لا توجد تنبيهات تشغيلية.</p>';
}

function receptionPatientsPage() {
  const people = db.patients.filter(p => receptionMatches(p, query));
  return receptionPageHead('patients', 'ابحث عن الملف الإداري للمريض، أو سجّل مريضًا جديدًا.',
    button(icon('plus') + ' تسجيل مريض', 'new-patient', 'primary')) +
    receptionCard('سجل المرضى', '<label class="field reception-search"><span>البحث عن مريض</span>' +
      '<input class="input" id="patient-search" type="search" placeholder="الاسم، رقم الملف، الهاتف أو رقم الحجز" value="' + esc(query) + '"></label>' +
      receptionRows(people.map(p => receptionRow(esc(p.name), '<bdi>' + esc(p.id) + '</bdi> · ' + esc(p.status || 'مسجل'),
        link('فتح الملف','reception-file/'+encodeURIComponent(p.id),'secondary small')))));
}

function receptionPatientCard(id) {
  const p = receptionPerson(id);
  if (!p) return;
  modal('بطاقة المريض', '<article class="reception-print-card"><strong>' + esc(hospitalProfile().name) +
    '</strong><h2>' + esc(p.name) + '</h2><p>رقم الملف الطبي <bdi>' + esc(p.id) + '</bdi></p></article>',
    button('طباعة البطاقة', 'reception-print', 'primary') + button('إغلاق', 'close', 'secondary'));
}

function registerReceptionPatient() {
  modal('تسجيل مريض جديد', '<form id="reception-register" class="form-grid">' +
    field('الاسم الكامل *','name','','text','required maxlength="120"') +
    field('الهاتف *','phone','','tel','required maxlength="24"') +
    field('تاريخ الميلاد *','birthDate','','date','required min="1900-01-01" max="' + receptionToday() + '"') +
    '<label class="field"><span>النوع *</span><select name="gender" class="input" required><option value="">اختر</option><option>ذكر</option><option>أنثى</option></select></label>' +
    field('البريد الإلكتروني','email','','email','maxlength="120"') +
    field('الجنسية','nationality','','text','maxlength="80"') +
    field('العنوان','address','','text','maxlength="200"') +
    field('اسم شخص للطوارئ','emergencyName','','text','maxlength="120"') +
    field('هاتف الطوارئ','emergencyPhone','','tel','maxlength="24"') +
    field('صلة القرابة','emergencyRelation','','text','maxlength="80"') +
    field('شركة التأمين','insurer','','text','maxlength="120"') +
    '<p class="full reception-empty">استخدم بيانات افتراضية في المعاينة المحلية.</p><p id="reception-register-error" class="full" role="alert"></p>' +
    '<div class="full reception-actions"><button class="button primary" type="submit">إنشاء الملف</button>' +
    '<button class="button secondary" type="button" data-action="close">إلغاء</button></div></form>');
  $('#reception-register').addEventListener('submit', event => {
    event.preventDefault();
    if (!allowAction('new-patient',event.target)) return;
    db = readLocalDatabase() || db;
    const values = Object.fromEntries([...new FormData(event.target)].map(([key,value]) => [key,value.trim()]));
    const error = $('#reception-register-error');
    values.phone = receptionPhone(values.phone);
    values.emergencyPhone = receptionPhone(values.emergencyPhone);
    if (values.name.split(/\s+/).filter(Boolean).length < 2 ||
      !/^\d{8,15}$/.test(values.phone) || (values.emergencyPhone && !/^\d{8,15}$/.test(values.emergencyPhone))) {
      error.textContent = 'أدخل الاسم الكامل وأرقام هواتف صالحة.'; return;
    }
    const duplicate = db.patients.find(p => receptionPhone(p.phone) === values.phone);
    if (duplicate) { error.textContent = 'الهاتف مرتبط بملف موجود (' + duplicate.id + '). ابحث عنه أولًا.'; return; }
    const today = receptionToday();
    if (!healthArchiveDate(values.birthDate) || values.birthDate < '1900-01-01' || values.birthDate > today) {
      error.textContent = 'أدخل تاريخ ميلاد صالحًا.'; return;
    }
    const age = Number(today.slice(0,4)) - Number(values.birthDate.slice(0,4)) -
      (today.slice(5) < values.birthDate.slice(5) ? 1 : 0);
    const last = Math.max(1000,...db.patients.map(p => /^CL-\d+$/.test(p.id) ? Number(p.id.slice(3)) : 0));
    const id = 'CL-' + (last + 1);
    db.patients.push({...values,id,age,registeredDate:today,status:'لم يصل',priority:'لم يُراجع',
      doctor:'لم يحدد بعد',allergy:'لم تُسجّل بيانات الحساسية',visit:'—',time:'—'});
    selected = id;
    query = id;
    log('تسجيل مريض جديد',id);
    closeModal();
    if (role === 'admin') {
      location.hash = 'admin-patient/' + id;
      toast('تم إنشاء الملف ' + id + '.');
      return;
    }
    if (location.hash === '#patients') render();
    else location.hash = 'patients';
    receptionPatientCard(id);
    toast('تم إنشاء الملف ' + id + '.');
  });
}

function verifyReceptionArrival(id) {
  if (!receptionRefreshRecords()) return;
  const a = db.appointments.find(item => item.id === id);
  if (a?.status !== 'مؤكد' || a.date !== receptionToday()) return;
  modal('تأكيد وصول المريض', '<p>تحقق من هوية ' + esc(receptionPerson(a.patient)?.name || a.patient) +
    ' ورقم الملف <bdi>' + esc(a.patient) + '</bdi> قبل إصدار الدور.</p>',
    button('تم التحقق، سجّل الوصول','arrive-appointment','primary',receptionIdAttr(a)) + button('إلغاء','close','secondary'));
}

const receptionClinicOpenToday = schedule => schedule.active !== false &&
  schedule.days.includes(new Date().getDay()) && schedule.hours.length > 0;
const receptionActiveArrival = patientId => db.appointments.find(a => a.patient === patientId &&
  (a.queueDate || a.date) === receptionToday() && a.status === 'تم تسجيل الوصول');

const receptionCanTransfer = visit => visit?.status==='تم تسجيل الوصول' &&
  (visit.queueDate||visit.date)===receptionToday() && ['waiting','called'].includes(visit.queueState||'waiting') &&
  !db.visits.some(record=>record.appointmentId===visit.id);

const receptionCanMarkNoShow = visit => visit?.status==='مؤكد' && !visit.arrivalAt &&
  Number.isFinite(Date.parse(visit.date+'T'+visit.time)) && Date.parse(visit.date+'T'+visit.time)<Date.now();

function receptionMarkNoShow(id) {
  if (!receptionRefreshRecords()) return;
  const visit=db.appointments.find(a=>a.id===id);
  if (!receptionCanMarkNoShow(visit)) { toast('الحجز غير متاح لتسجيل عدم الحضور.');return; }
  modal('تسجيل عدم الحضور',`<p>${esc(receptionPerson(visit.patient)?.name||visit.patient)} ·
    ${esc(receptionDate(visit.date))} · <bdi>${esc(visit.time)}</bdi></p>
    <form id="reception-no-show-form"><button class="button primary" type="submit">تأكيد عدم الحضور</button></form>`);
  $('#reception-no-show-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const current=db.appointments.find(a=>a.id===id);
    if (!receptionCanMarkNoShow(current)) { closeModal();render();toast('اتحدّثت حالة الحجز.');return; }
    Object.assign(current,{status:'لم يحضر',noShowAt:new Date().toISOString()});
    log('تسجيل عدم الحضور',id);closeModal();render();toast('تم تسجيل عدم الحضور.');
  });
}

function receptionTransfer(id) {
  if (!receptionRefreshRecords()) return;
  const visit=db.appointments.find(a=>a.id===id);
  if (!receptionCanTransfer(visit)) { toast('التحويل متاح قبل بدء الكشف.');return; }
  const choices=Object.entries(bookingDirectory()).filter(([name,schedule])=>name!==visit.doctor&&receptionClinicOpenToday(schedule));
  if (!choices.length) { toast('لا توجد عيادة بديلة مجدولة اليوم.');return; }
  const source=visit.doctor;
  modal('تحويل إداري لعيادة أخرى',`<form id="reception-transfer" class="patient-service-form">
    <p>${esc(receptionPerson(visit.patient)?.name||visit.patient)} · ${esc(receptionClinic(visit))}</p>
    ${adminSelect('العيادة المستقبلة','doctor',choices.map(([name,d])=>[name,d.clinic+' · '+name]),choices[0][0],'required')}
    ${field('سبب التحويل الإداري','reason','','text','required maxlength="200"')}
    <label><input type="checkbox" name="received" required> العيادة المستقبلة أكدت قبول التحويل.</label>
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">تأكيد التحويل</button></form>`);
  $('#reception-transfer').addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const form=event.currentTarget;
    const {doctor,reason,received}=Object.fromEntries(new FormData(form));
    const current=db.appointments.find(a=>a.id===id);
    const target=bookingDirectory()[doctor];
    if (!receptionCanTransfer(current)||current.doctor!==source||doctor===source||!target||
      !receptionClinicOpenToday(target)||!received||!reason?.trim()||reason.length>200) {
      form.querySelector('[role=alert]').textContent='راجع حالة الزيارة وتوافر العيادة وتأكيد الاستلام.';return;
    }
    const now=new Date().toISOString();
    const patient=receptionPerson(current.patient);
    (current.transfers ||= []).push({from:source,to:doctor,reason:reason.trim(),at:now,
      receivedAt:now,actor:demoSession.staffId||'reception-demo'});
    if (current.source!=='walk-in') current.scheduledDoctor ||= source;
    Object.assign(current,{doctor,queueState:'waiting',calledAt:null});
    if (patient?.doctor===source) patient.doctor=doctor;
    log('تحويل إداري إلى عيادة',id);
    closeModal();render();receptionArrivalTicket(id);toast('تم التحويل وتحديث قائمة الانتظار.');
  });
}

function receptionArrivalTicket(id) {
  if (!receptionRefreshRecords()) return;
  const visit = db.appointments.find(a => a.id === id && a.queueNumber);
  if (!visit) return;
  const person = receptionPerson(visit.patient);
  modal('تذكرة الوصول', `<article class="reception-print-card"><strong>${esc(hospitalProfile().name)}</strong>
    <h2>رقم الانتظار <bdi>A${esc(visit.queueNumber)}</bdi></h2>
    <p>${esc(person?.name || visit.patient)} · <bdi>${esc(visit.patient)}</bdi></p>
    <p>${esc(receptionClinic(visit))} · ${esc(visit.doctor)}</p>
    <p>${esc(receptionDate(visit.queueDate || visit.date))} · <bdi>${esc(new Date(visit.arrivalAt).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}))}</bdi></p>
    <p>${visit.source==='walk-in'?'زيارة بدون حجز':'وصول لموعد محجوز'}</p></article>`,
    button('طباعة التذكرة','reception-print','primary')+button('إغلاق','close','secondary'));
}

function receptionWalkIn(id) {
  if (!receptionRefreshRecords()) return;
  const person = receptionPerson(id);
  if (!person) return;
  const doctors = Object.entries(bookingDirectory()).filter(([,schedule]) => receptionClinicOpenToday(schedule));
  if (!doctors.length) { toast('لا توجد عيادات مجدولة اليوم.'); return; }
  const departments = [...new Set(doctors.map(([,schedule]) => schedule.department))];
  modal('تسجيل وصول بدون حجز', `<form id="reception-walk-in-form" class="patient-service-form">
    <p>${esc(person.name)} · <bdi>${esc(id)}</bdi></p>
    ${adminSelect('التخصص','department',departments.map(name=>[name,name]),departments[0])}
    ${adminSelect('الطبيب والعيادة','doctor',[],'','required')}
    <label><input type="checkbox" name="verified" required> تحققت من هوية المريض ورقم الملف.</label>
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">تسجيل الوصول وإصدار الدور</button></form>`);
  const form = $('#reception-walk-in-form');
  const {department,doctor} = form.elements;
  const updateDoctors = () => {
    doctor.replaceChildren(...doctors.filter(([,schedule])=>schedule.department===department.value)
      .map(([name,schedule])=>new Option(name+' · '+schedule.clinic,name)));
  };
  department.addEventListener('change',updateDoctors);
  updateDoctors();
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const error = form.querySelector('[role=alert]');
    const patient = receptionPerson(id);
    const schedule = bookingDirectory()[doctor.value];
    if (!form.elements.verified.checked || !patient || !schedule || schedule.department !== department.value || !receptionClinicOpenToday(schedule)) {
      error.textContent='راجع هوية المريض وتوافر العيادة.'; return;
    }
    if (receptionActiveArrival(id)) { error.textContent='المريض موجود بالفعل في قائمة اليوم.'; return; }
    const booked = db.appointments.some(a=>a.patient===id && a.doctor===doctor.value && a.date===receptionToday() &&
      ['مؤكد','بانتظار التأكيد'].includes(a.status));
    if (booked) { error.textContent='للمريض موعد اليوم مع الطبيب. سجّل وصوله من الحجوزات القائمة.'; return; }
    const now = new Date();
    const visit = {id:'W-'+crypto.randomUUID(),patient:id,doctor:doctor.value,date:bookingDateKey(now),
      time:now.toTimeString().slice(0,5),type:'زيارة بدون حجز',source:'walk-in',
      status:'تم تسجيل الوصول',createdAt:now.toISOString()};
    recordReceptionArrival(visit);
    db.appointments.push(visit);
    Object.assign(patient,{status:'بانتظار الطبيب',doctor:visit.doctor});
    log('تسجيل وصول بدون حجز',visit.id);
    closeModal();
    if (location.hash === '#reception-checkin/'+id) render();
    else location.hash='reception-checkin/'+id;
    receptionArrivalTicket(visit.id);
    toast('تم تسجيل الوصول وإصدار رقم الانتظار.');
  });
}

function recordReceptionArrival(a) {
  const now = new Date();
  const queueDate = bookingDateKey(now);
  const highest = Math.max(0,...db.appointments.filter(item => item.queueDate === queueDate).map(item => item.queueNumber || 0));
  Object.assign(a,{arrivalAt:now.toISOString(),queueDate,queueNumber:highest+1,queueState:'waiting'});
  if (a.kioskToken) a.kioskToken=null;
}

function advanceReceptionQueue(id) {
  if (!receptionRefreshRecords()) return;
  const a = db.appointments.find(item => item.id === id);
  if (a?.status !== 'تم تسجيل الوصول' || (a.queueDate || a.date) !== receptionToday()) return;
  const state = receptionQueueStates[a.queueState] || receptionQueueStates.waiting;
  if (!state.next) return;
  a.queueState = state.next;
  if (state.next === 'called') {
    if (!a.queueDate) a.queueDate = receptionToday();
    a.calledAt = new Date().toISOString();
  }
  if (state.next === 'in-consultation') {
    a.consultationAt = new Date().toISOString();
    const p = receptionPerson(a.patient);
    if (p) p.status = 'قيد الزيارة';
  }
  if (state.next === 'completed') {
    a.status = 'مكتمل';
    a.completedAt = new Date().toISOString();
    const p = receptionPerson(a.patient);
    if (p) p.status = 'مكتملة';
  }
  log(state.action,a.id);
  render();
}

function bindReceptionPage() {
  bindReceptionScreens();
  $('#reception-booking-search')?.addEventListener('input',event => {
    const position = event.target.selectionStart;
    receptionBookingQuery = event.target.value;
    render();
    const input = $('#reception-booking-search');
    input.focus();
    input.setSelectionRange(position,position);
  });
  $('#reception-schedule-date')?.addEventListener('change',event => {
    receptionScheduleDate = event.target.value;
    render();
    $('#reception-schedule-date')?.focus();
  });
}
