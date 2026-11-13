const receptionTitles = {
  dashboard: 'لوحة الاستقبال', patients: 'المرضى', appointments: 'الحجوزات والجداول',
  'reception-checkin': 'مكتب الاستقبال', queue: 'مكتب الاستقبال', 'reception-file':'ملف المريض',
  'reception-schedule': 'الحجوزات والجداول', 'reception-reports': 'التقارير',
  'reception-billing':'الحسابات والمدفوعات', 'reception-admissions':'الإقامة: الدخول والخروج'
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
  const a = db.appointments.find(item => item.id === id);
  if (a?.status !== 'مؤكد' || a.date !== receptionToday()) return;
  modal('تأكيد وصول المريض', '<p>تحقق من هوية ' + esc(receptionPerson(a.patient)?.name || a.patient) +
    ' ورقم الملف <bdi>' + esc(a.patient) + '</bdi> قبل إصدار الدور.</p>',
    button('تم التحقق، سجّل الوصول','arrive-appointment','primary',receptionIdAttr(a)) + button('إلغاء','close','secondary'));
}

function recordReceptionArrival(a) {
  const now = new Date();
  const queueDate = bookingDateKey(now);
  const highest = Math.max(0,...db.appointments.filter(item => item.queueDate === queueDate).map(item => item.queueNumber || 0));
  Object.assign(a,{arrivalAt:now.toISOString(),queueDate,queueNumber:highest+1,queueState:'waiting'});
}

function advanceReceptionQueue(id) {
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
