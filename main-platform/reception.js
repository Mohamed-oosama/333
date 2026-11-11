const receptionTitles = {
  dashboard: 'لوحة الاستقبال', patients: 'إدارة المرضى', appointments: 'إدارة الحجوزات',
  'reception-checkin': 'تسجيل الوصول', queue: 'قائمة الانتظار',
  'reception-schedule': 'جداول العيادات', 'reception-reports': 'تقارير الاستقبال'
};
const receptionQueueStates = {
  waiting: {label: 'في الانتظار', next: 'called', action: 'نداء المريض'},
  called: {label: 'تم النداء', next: 'in-consultation', action: 'بدء الكشف'},
  'in-consultation': {label: 'قيد الكشف'},
  completed: {label: 'اكتمل الكشف'}
};
let receptionScheduleDate = '';
let receptionReportDate = '';
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

function receptionDashboard() {
  const {metrics} = receptionStats(receptionToday());
  return receptionPageHead('dashboard', esc(receptionDate(receptionToday())),
    button(icon('plus') + ' تسجيل مريض', 'new-patient', 'primary') + link('تسجيل الوصول', 'reception-checkin', 'secondary')) +
    receptionMetrics(metrics) +
    '<div class="reception-grid">' + receptionCard('إجراءات الاستقبال',
      '<div class="reception-actions">' + button('حجز موعد', 'book', 'primary') +
      link('إدارة المرضى', 'patients', 'secondary') + link('قائمة الانتظار', 'queue', 'secondary') +
      link('جداول العيادات', 'reception-schedule', 'secondary') + '</div>') +
    receptionCard('التنبيهات', receptionNotices()) + '</div>';
}

function receptionPatientsPage() {
  const people = db.patients.filter(p => receptionMatches(p, query));
  return receptionPageHead('patients', 'ابحث عن الملف الإداري للمريض، أو سجّل مريضًا جديدًا.',
    button(icon('plus') + ' تسجيل مريض', 'new-patient', 'primary')) +
    receptionCard('سجل المرضى', '<label class="field reception-search"><span>البحث عن مريض</span>' +
      '<input class="input" id="patient-search" type="search" placeholder="الاسم، رقم الملف، الهاتف أو رقم الحجز" value="' + esc(query) + '"></label>' +
      receptionRows(people.map(p => receptionRow(esc(p.name), '<bdi>' + esc(p.id) + '</bdi> · ' + esc(p.status || 'مسجل'),
        button('عرض الملف الإداري', 'reception-person', 'secondary small', receptionIdAttr(p))))));
}

function receptionBookingsPage(checkin = false) {
  const bookings = db.appointments.filter(a => (!checkin || a.date === receptionToday() &&
    ['بانتظار التأكيد','مؤكد','تم تسجيل الوصول'].includes(a.status)) &&
    (receptionSearchText(a.id) === receptionSearchText(receptionBookingQuery) ||
      receptionMatches(receptionPerson(a.patient) || {id:a.patient}, receptionBookingQuery, false))).sort(receptionBookingOrder);
  return receptionPageHead(checkin ? 'reception-checkin' : 'appointments',
    checkin ? 'راجع هوية المريض عند حضوره، ثم سجّل الوصول لإصدار رقم الانتظار.' : 'تابع الحجوزات وأكّدها أو عدّل المواعيد المتاحة.',
    checkin ? link('قائمة الانتظار', 'queue', 'secondary') : button(icon('plus') + ' حجز موعد', 'book', 'primary')) +
    receptionCard(checkin ? 'حجوزات اليوم' : 'المواعيد المسجلة',
      '<label class="field reception-search"><span>البحث عن حجز</span><input class="input" id="reception-booking-search" type="search" ' +
      'placeholder="رقم الحجز، اسم المريض، رقم الملف أو الهاتف" value="' + esc(receptionBookingQuery) + '"></label>' +
      receptionRows(bookings.map(a => {
        const attrs = receptionIdAttr(a);
        const canChange = !checkin && canEditBooking(a);
        const actions = badge(a.status, a.status === 'ملغي' ? 'gray' : 'teal') +
          (a.status === 'بانتظار التأكيد' && a.date >= receptionToday() ? button('تأكيد الحجز', 'confirm-appointment', 'primary small', attrs) : '') +
          (a.status === 'مؤكد' && a.date === receptionToday() ? button('تسجيل الوصول', 'reception-verify', 'primary small', attrs) : '') +
          (canChange ? button('تعديل', 'edit-booking', 'secondary small', attrs) + button('إلغاء', 'cancel-booking', 'danger small', attrs) : '');
        const detail = [a.id, a.patient, a.doctor, receptionClinic(a), receptionDate(a.date), a.time].map(v => '<bdi>' + esc(v) + '</bdi>').join(' · ');
        return receptionRow(esc(receptionPerson(a.patient)?.name || a.patient), detail, actions);
      })));
}

function receptionQueuePage() {
  const queue = db.appointments.filter(a => a.queueDate === receptionToday() ||
    (!a.queueDate && a.date === receptionToday() && a.status === 'تم تسجيل الوصول'))
    .sort((a,b) => (a.queueNumber || 0) - (b.queueNumber || 0));
  return receptionPageHead('queue', 'الدور اليوم حسب تسجيل الوصول.', link('تسجيل وصول', 'reception-checkin', 'primary')) +
    receptionCard('دور العيادات', receptionRows(queue.map(a => {
      const state = receptionQueueStates[a.queueState] || receptionQueueStates.waiting;
      const arrived = Date.parse(a.arrivalAt);
      const elapsed = (Date.parse(a.calledAt) || Date.now()) - arrived;
      const wait = Number.isFinite(elapsed) ? ' · انتظار ' + Math.max(0, Math.floor(elapsed / 60000)) + ' د' : '';
      const time = Number.isFinite(arrived) ? new Date(arrived).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) : '—';
      const action = a.status === 'تم تسجيل الوصول' && state.next
        ? button(state.action, 'reception-queue-next', 'secondary small', receptionIdAttr(a)) : '';
      return receptionRow('<bdi>' + esc(a.queueNumber || '—') + '</bdi> · ' + esc(receptionPerson(a.patient)?.name || a.patient),
        esc(a.doctor + ' · ' + receptionClinic(a) + ' · الوصول ' + time + wait), badge(state.label, 'teal') + action);
    })));
}

function receptionSchedulePage() {
  const date = receptionScheduleDate || receptionToday();
  return receptionPageHead('reception-schedule', 'مواعيد عمل الأطباء والعيادات والأوقات المتاحة للحجز.') +
    receptionCard('جدول الأطباء', '<div class="reception-search">' + field('تاريخ الجدول','reception-schedule-date',date,'date','id="reception-schedule-date"') + '</div>' +
      receptionRows(Object.entries(bookingDirectory()).map(([name,d]) => {
        const count = db.appointments.filter(a => a.doctor === name && a.date === date && a.status !== 'ملغي').length;
        const hours = availableBookingTimes(name,null,date);
        const schedule = d.days.map(day => bookingDayNames[day]).join('، ');
        const detail = esc([d.department, d.clinic, d.location, schedule].join(' · ')) +
          ' · <bdi>' + esc(d.hours.length ? d.hours[0] + '–' + d.hours.at(-1) : '—') + '</bdi>';
        const availability = d.active === false ? 'الحجز موقوف' :
          hours.length ? 'متاح: ' + hours.join('، ') : 'لا توجد أوقات متاحة';
        return receptionRow(esc(name), detail + '<small><bdi>' + esc(availability) + '</bdi></small>',
          badge(count + ' حجز', count ? 'teal' : 'gray'));
      })));
}

function receptionReportsPage() {
  const date = receptionReportDate || receptionToday();
  const {metrics, appointments} = receptionStats(date);
  const clinics = new Map();
  for (const a of appointments) {
    const clinic = receptionClinic(a);
    if (!clinics.has(clinic)) clinics.set(clinic,{total:0,completed:0,cancelled:0});
    const stats = clinics.get(clinic);
    stats.total++;
    if (a.status === 'مكتمل') stats.completed++;
    if (a.status === 'ملغي') stats.cancelled++;
  }
  return receptionPageHead('reception-reports', 'ملخص الحجوزات والانتظار حسب التاريخ والعيادة.') +
    '<div class="reception-search">' + field('تاريخ التقرير','reception-report-date',date,'date','id="reception-report-date"') + '</div>' +
    receptionMetrics(metrics) + receptionCard('الحجوزات حسب العيادة', receptionRows([...clinics].map(([name,stats]) =>
      receptionRow(esc(name), stats.completed + ' كشف مكتمل · ' + stats.cancelled + ' ملغى', badge(stats.total + ' حجز','teal')))));
}

function receptionPatientDetails(id) {
  const p = receptionPerson(id);
  if (!p) return;
  const appointments = db.appointments.filter(a => a.patient === id).sort(receptionBookingOrder);
  const visits = db.visits.filter(v => v.patient === id && v.approved).sort((a,b) => healthArchiveDate(b.date) - healthArchiveDate(a.date));
  const completed = appointments.filter(a => a.status === 'مكتمل').reverse();
  const rows = [['رقم الملف', p.id], ['الهاتف', p.phone], ['تاريخ الميلاد', receptionDate(p.birthDate)],
    ['حالة الملف', p.status], ['الطبيب', p.doctor], ['آخر زيارة', receptionDate(visits[0]?.date || completed[0]?.date)]];
  modal('الملف الإداري · ' + esc(p.name),
    '<dl class="reception-details">' + rows.map(([label,value]) => '<div><dt>' + label + '</dt><dd><bdi>' + esc(value || '—') + '</bdi></dd></div>').join('') +
    '</dl><h3>سجل المواعيد والزيارات</h3>' + receptionRows([...appointments].reverse().map(a =>
      receptionRow(esc(a.doctor), esc(receptionDate(a.date) + ' · ' + a.time + ' · ' + receptionClinic(a)), badge(a.status,'teal')))
      .concat(visits.filter(v => !appointments.some(a => a.id === v.appointmentId)).map(v =>
        receptionRow('زيارة معتمدة', esc(receptionDate(v.date)))))),
    button('حجز موعد للمريض', 'reception-book-person', 'primary', receptionIdAttr(p)) +
    button('بطاقة المريض', 'reception-card', 'secondary', receptionIdAttr(p)) + button('إغلاق', 'close', 'secondary'));
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
  log(state.action,a.id);
  render();
}

function bindReceptionPage() {
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
  $('#reception-report-date')?.addEventListener('change',event => {
    receptionReportDate = event.target.value;
    render();
    $('#reception-report-date')?.focus();
  });
}
