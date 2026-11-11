'use strict';

const demoDoctor = 'د. سارة أحمد';
const doctorTitles = {
  patients:'مرضاي', appointments:'جدولي', 'doctor-reports':'تقارير الزيارات', documents:'الفحوصات والمرفقات'
};
const doctorAppointments = () => db.appointments.filter(a => a.doctor === demoDoctor);
const doctorCanAccess = id => Boolean(id && (db.patients.some(p => p.id === id && p.doctor === demoDoctor) ||
  doctorAppointments().some(a => a.patient === id && ['مؤكد','تم تسجيل الوصول','مكتمل'].includes(a.status)) ||
  db.visits.some(v => v.patient === id && v.doctor === demoDoctor && v.approved)));
const doctorPatients = () => db.patients.filter(p => doctorCanAccess(p.id));
const doctorVisits = id => db.visits.filter(v => v.patient === id && (v.approved || !v.doctor || v.doctor === demoDoctor)).slice().reverse();
const doctorToday = () => bookingDateKey(new Date());
const doctorDate = value => value ? healthArchiveDateLabel(value) : '—';
const doctorNoPatients = () => empty('الملف غير متاح','اختر مريضًا من قائمة مرضاي.',link('مرضاي','patients','primary'));
let doctorVisitDate = '';
let doctorScheduleDate = '';
let doctorScheduleDay = '';
let lastDoctorRecord = '';

function doctorCard(title, body, action = '') {
  return `<section class="workspace-panel doctor-section"><div class="panel-title"><h2>${title}</h2>${action}</div><div class="doctor-section-body">${body}</div></section>`;
}

function doctorRows(rows, fallback = 'لا توجد بيانات مسجلة.') {
  return rows.length ? rows.join('') : `<p class="quiet-empty">${fallback}</p>`;
}

function doctorRow(title, description, actions = '') {
  return `<article class="doctor-row"><div><strong>${esc(title)}</strong><small>${description}</small></div><div class="doctor-actions">${actions}</div></article>`;
}

function doctorAppointmentRow(a) {
  const p = db.patients.find(x => x.id === a.patient);
  if (!p || !doctorCanAccess(p.id)) return '';
  const arrived = a.status === 'تم تسجيل الوصول';
  const status = arrived && a.queueState === 'in-consultation' ? 'قيد الكشف' : a.status;
  return doctorRow(p.name, `<bdi>${esc(p.id)} · ${esc(a.time)}</bdi> · ${esc(doctorDate(a.date))}`,
    badge(status,'teal') + (arrived ? link('فتح الكشف','encounter/' + p.id + '/' + a.id,'primary small') :
      link('الملف الطبي','record/' + p.id,'secondary small')));
}

function doctorNotices() {
  const arrived = doctorAppointments().filter(a => a.status === 'تم تسجيل الوصول' && a.queueState !== 'in-consultation');
  const results = db.attachments.filter(a => doctorCanAccess(a.patient) && ['أشعة','تحليل','تقرير'].includes(a.kind));
  return doctorRows(arrived.slice(-3).reverse().map(a => doctorAppointmentRow(a)).concat(
    results.slice(-3).reverse().map(a => doctorRow(a.title,esc(a.kind + ' · ' + doctorDate(a.date)),
      link('ملف المريض','record/' + a.patient,'secondary small')))), 'لا توجد إشعارات جديدة.');
}

function doctorDashboard() {
  const today = doctorToday();
  const all = doctorAppointments().filter(a => a.status !== 'ملغي');
  const daily = all.filter(a => a.date === today);
  const active = all.filter(a => a.status === 'تم تسجيل الوصول');
  const waiting = active.filter(a => a.queueState !== 'in-consultation').length;
  const future = all.filter(a => canEditBooking(a)).length;
  const followups = doctorPatients().map(p => [p,doctorVisits(p.id).find(v => v.approved)])
    .filter(([,v]) => v?.followup && v.followup >= today).sort((a,b) => a[1].followup.localeCompare(b[1].followup));
  const urgent = active.filter(a => doctorVisits(a.patient).some(v => !v.approved && v.appointmentId === a.id && v.severity === 'عاجلة'));
  const visible = [...new Set([...active,...daily])].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  return `${pageHead('لوحة الطبيب',esc(doctorDate(today)),link('جدولي','appointments','secondary')+link('مرضاي','patients','primary'),'بوابة الأطباء')}
    <div class="clinical-metrics">${metric('مرضى اليوم',new Set(daily.map(a=>a.patient)).size,'users','teal','حسب حجوزات اليوم')}
      ${metric('في الانتظار',waiting,'clock','amber','تم تسجيل وصولهم')}
      ${metric('قيد الكشف',active.length-waiting,'doctor','green','في قائمة الكشف')}
      ${metric('حجوزات قادمة',future,'calendar','blue','تشمل طلبات التأكيد')}</div>
    <div class="doctor-columns">${doctorCard('قائمة اليوم',doctorRows(visible.map(doctorAppointmentRow).filter(Boolean),'لا توجد حجوزات أو حالات وصلت اليوم.'))}
      <div>${urgent.length ? doctorCard('حالات عاجلة سجّلها الطبيب',doctorRows(urgent.map(doctorAppointmentRow))) : ''}${doctorCard('الوصول ونتائج الفحوصات',doctorNotices())}
      ${doctorCard('المتابعات القادمة',doctorRows(followups.slice(0,5).map(([p,v])=>doctorRow(p.name,esc(doctorDate(v.followup)),link('فتح الملف','record/'+p.id,'secondary small')))))}</div></div>`;
}

function doctorPatientPage() {
  const people = doctorPatients();
  const statuses = [...new Set(people.map(p => p.status))];
  const result = people.map(p => [p,doctorVisits(p.id).find(v => v.approved)]).filter(([p,v]) =>
    [p.name,p.id,p.phone].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())) &&
    (!patientFilter || p.status === patientFilter) &&
    (!doctorVisitDate || bookingDateFromVisit(v?.date) === doctorVisitDate));
  return pageHead('مرضاي','الملفات المرتبطة بالطبيب المتابع أو بحجز مؤكد أو زيارة معتمدة.', '', 'بوابة الأطباء') +
    doctorCard('ملفات المرضى', `<div class="doctor-filters">
      <label class="field"><span>البحث عن مريض</span><input class="input" id="patient-search" value="${esc(query)}" placeholder="الاسم أو رقم الملف أو الهاتف"></label>
      <label class="field"><span>الحالة</span><select class="input" id="patient-filter"><option value="">كل الحالات</option>${statuses.map(s=>`<option ${s===patientFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
      ${field('تاريخ آخر زيارة','doctor-visit-date',doctorVisitDate,'date','id="doctor-visit-date"')}
    </div>` + doctorRows(result.map(([p,v]) => doctorRow(p.name, `<bdi>${esc(p.id)}</bdi> · ${esc(p.age || '—')} سنة · ${esc(p.gender || '—')}
      <br>آخر زيارة ${esc(doctorDate(v?.date))} · <bdi>${esc(v?.id || '—')}</bdi>
      <br>التشخيص ${esc(v?.diagnoses?.find(d=>d.primary)?.label || '—')} · المتابعة ${esc(doctorDate(v?.followup))}`,
      badge(p.status,stateTone(p)) + link('فتح الملف','record/'+p.id,'primary small'))), 'لا توجد ملفات مطابقة.'));
}

function bookingDateFromVisit(value) {
  const date = healthArchiveDate(value);
  return date ? bookingDateKey(date) : '';
}

function doctorScheduleBooking(appointment) {
  const person=db.patients.find(p=>p.id===appointment.patient);
  const canOpen=person && doctorCanAccess(person.id);
  const arrived=appointment.status==='تم تسجيل الوصول';
  const status=arrived && appointment.queueState==='in-consultation' ? 'قيد الكشف' : appointment.status;
  const tone=arrived?'teal':appointment.status==='بانتظار التأكيد'?'amber':appointment.status==='مكتمل'?'gray':'blue';
  const title=canOpen?esc(person.name):'طلب حجز';
  const route=arrived?'encounter/'+person?.id+'/'+appointment.id:'record/'+person?.id;
  return `<div class="doctor-slot-booking ${tone}">
    ${canOpen?`<a href="#${esc(route)}" aria-label="${arrived?'فتح كشف':'فتح ملف'} ${title}">${title}</a>`:`<strong>${title}</strong>`}
    <small>${esc(status)}</small></div>`;
}

function doctorSchedulePage() {
  const today=doctorToday();
  const start=doctorScheduleDate || today;
  const startDate=new Date(start+'T12:00:00');
  const clinician=bookingDirectory()[demoDoctor];
  const days=Array.from({length:7},(_,index)=>{
    const date=new Date(startDate);
    date.setDate(date.getDate()+index);
    return {key:bookingDateKey(date),weekday:bookingDayNames[date.getDay()],working:!!clinician?.days.includes(date.getDay())};
  });
  const end=days.at(-1).key;
  const selectedDay=days.some(day=>day.key===doctorScheduleDay)?doctorScheduleDay:start;
  const appointments=doctorAppointments().filter(a=>a.date>=start && a.date<=end && a.status!=='ملغي');
  const hours=[...new Set([...(clinician?.hours||[]),...appointments.map(a=>a.time)])].filter(Boolean).sort();
  const slots=new Map();
  for (const appointment of appointments) {
    const key=appointment.date+'T'+appointment.time;
    const slot=slots.get(key)||[];
    slot.push(appointment);
    slots.set(key,slot);
  }
  const dayAttr=day=>`data-schedule-day class="${day.key===selectedDay?'is-selected ':''}${day.key===today?'is-today':''}"`;
  const heading=pageHead('جدولي',esc([demoDoctor,clinician?.specialty,clinician?.clinic,clinician?.location].filter(Boolean).join(' · ')),'','بوابة الأطباء');
  const toolbar=`<div class="doctor-calendar-toolbar">
    <div class="doctor-calendar-nav" aria-label="التنقل بين الأسابيع">
      <button type="button" class="button secondary small" data-schedule-shift="-7">${icon('arrowRight')} السابق</button>
      <button type="button" class="button secondary small" data-schedule-shift="today">اليوم</button>
      <button type="button" class="button secondary small" data-schedule-shift="7">التالي ${icon('arrow')}</button>
    </div>
    ${field('بداية الفترة','doctor-schedule-date',start,'date','id="doctor-schedule-date"')}
  </div>`;
  const mobileDay=`<label class="field doctor-calendar-day"><span>اليوم المعروض</span>
    <select class="input" id="doctor-schedule-day">${days.map(day=>
      `<option value="${esc(day.key)}" ${day.key===selectedDay?'selected':''}>${esc(day.weekday+' · '+doctorDate(day.key))}</option>`).join('')}
    </select></label>`;
  const table=hours.length?`<div class="doctor-calendar-scroll" role="region" aria-label="جدول المواعيد بالساعات" tabindex="0">
    <table class="doctor-calendar"><caption class="doctor-calendar-caption">المواعيد من ${esc(doctorDate(start))} إلى ${esc(doctorDate(end))}</caption>
    <thead><tr><th scope="col">الوقت</th>${days.map(day=>`<th scope="col" ${dayAttr(day)}>
      <strong>${esc(day.weekday)}</strong><small>${esc(doctorDate(day.key))}</small>
      ${day.key===today?'<span class="doctor-calendar-today">اليوم</span>':''}
      </th>`).join('')}</tr></thead>
    <tbody>${hours.map(hour=>`<tr><th scope="row"><bdi>${esc(hour)}</bdi></th>${days.map(day=>{
      const bookings=slots.get(day.key+'T'+hour);
      if (bookings?.length) return `<td ${dayAttr(day)}>${bookings.map(doctorScheduleBooking).join('')}</td>`;
      const inHours=day.working && clinician?.hours.includes(hour);
      const status=!inHours?'خارج الدوام':clinician.active===false?'الحجز موقوف':
        futureBookingSlot(day.key,hour)?'متاح':'وقت مضى';
      return `<td ${dayAttr(day)}><span class="doctor-slot-state ${status==='متاح'?'available':''}">${status}</span></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`:
    '<p class="quiet-empty">ساعات العمل والحجوزات غير مسجلة لهذه الفترة.</p>';
  return heading+doctorCard('جدول الأسبوع بالساعات',toolbar+mobileDay+table);
}

function doctorEncounterRoute(p) {
  const a = doctorAppointments().find(a => a.patient === p.id && a.status === 'تم تسجيل الوصول');
  return 'encounter/' + p.id + (a ? '/' + a.id : '');
}

function doctorRecordPage() {
  const p = patient();
  if (!p || !doctorCanAccess(p.id)) return doctorNoPatients();
  const visits = doctorVisits(p.id);
  const latest = visits.find(v => v.approved);
  const facts = [['التاريخ المرضي',p.medicalHistory],['الأمراض المزمنة',p.chronicConditions],['العمليات السابقة',p.surgeries],
    ['الحساسية',p.allergy],['أدوية آخر زيارة',latest?.medications]];
  const history = doctorRows(visits.map(v => doctorRow(v.reason || 'زيارة سريرية',
    `${esc(doctorDate(v.date))} · <bdi>${esc(v.id)}</bdi> · ${esc(v.doctor || 'الطبيب المعالج')}`,
    v.approved ? button('عرض التقرير','doctor-report','secondary small',`data-id="${esc(v.id)}"`) : badge('مسودة','amber'))));
  const orders = doctorRows(db.orders.filter(o => o.patient === p.id).slice().reverse().map(o =>
    doctorRow(o.type,`${esc(o.kind || 'فحص')} · ${esc(doctorDate(o.date))} · ${esc(o.priority || '—')} · <bdi>${esc(o.visit)}</bdi>`,badge(o.status || 'تم الطلب','teal'))));
  return pageHead('الملف الطبي الموحد',esc(p.name) + ' · <bdi>' + esc(p.id) + '</bdi>',
      link('فتح الكشف',doctorEncounterRoute(p),'primary'),'بوابة الأطباء') +
    patientBanner(p) +
    `<div class="doctor-columns">${doctorCard('السجل الزمني للزيارات',history)}${doctorCard('الملخص السريري',
      '<dl class="doctor-facts">'+facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v || 'غير مسجل')}</dd></div>`).join('')+'</dl>'+vitalSummary(p))}</div>` +
    doctorCard('طلبات الفحوصات',orders) +
    doctorCard('النتائج والمرفقات',attachmentRows(p.id),button('إضافة مرفق','attachment-upload','secondary small'));
}

function doctorReportsPage() {
  const rows = db.visits.filter(v => v.approved && doctorCanAccess(v.patient)).slice().reverse().map(v => {
    const p = db.patients.find(x=>x.id===v.patient);
    return doctorRow(p?.name || v.patient,`${esc(doctorDate(v.date))} · <bdi>${esc(v.id)}</bdi> · ${esc(v.doctor || 'اعتماد سابق')}`,
      button('عرض التقرير','doctor-report','secondary small',`data-id="${esc(v.id)}"`));
  });
  return pageHead('تقارير الزيارات','التقارير المعتمدة للملفات المتاحة.', '', 'بوابة الأطباء') +
    doctorCard('تقارير الكشف',doctorRows(rows));
}

function showDoctorReport(id) {
  const v = db.visits.find(item => item.id === id && item.approved && doctorCanAccess(item.patient));
  if (!v) return;
  const p = db.patients.find(x => x.id === v.patient);
  log('عرض تقرير زيارة',v.id);
  const facts = [['الشكوى الرئيسية',v.reason],['تاريخ المرض الحالي',v.history],['الفحص السريري',v.notes],
    ['التقييم',v.assessment],['التشخيص',v.diagnoses?.map(d=>[d.primary?'أساسي':'ثانوي',d.label,d.code].filter(Boolean).join(' · ')).join('\n')],
    ['الخطورة المسجلة',v.severity],['خطة العلاج',v.plan],['الروشتة',v.medications],
    ['تعليمات المتابعة',v.instructions],['تاريخ المتابعة',v.followup ? doctorDate(v.followup) : '']];
  const vitals = Object.entries(v.vitalSigns || {}).filter(([,value])=>value);
  const approved = v.approvedAt ? new Date(v.approvedAt).toLocaleString('ar-EG') : doctorDate(v.date);
  modal('تقرير الكشف المعتمد',`<article class="doctor-print-report"><h2>${esc(hospitalProfile().name)} · تقرير الكشف</h2>
    <p>${esc(p?.name || v.patient)} · <bdi>${esc(v.patient)} · ${esc(v.id)}</bdi></p>
    <dl class="doctor-facts">${facts.filter(([,value])=>value).concat(vitals).map(([key,value])=>
      `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
    <p>الاعتماد داخل المعاينة · ${esc(v.doctor || 'اعتماد سابق')} · ${esc(approved)}</p></article>`,
    button('طباعة / حفظ PDF','doctor-print','primary')+button('إغلاق','close','secondary'));
}

function doctorEncounterContext() {
  const [,id,appointmentId] = location.hash.slice(1).split('/');
  if (role !== 'doctor' || demoSession?.role !== 'doctor' || !doctorCanAccess(id)) return null;
  const person = db.patients.find(p => p.id === id);
  if (!person) return null;
  const appointment = appointmentId && doctorAppointments().find(a => a.id === appointmentId &&
    a.patient === id && a.status === 'تم تسجيل الوصول');
  if (appointmentId && !appointment) return null;
  return {person, appointment:appointment || null};
}

const doctorOrderKinds = ['مختبر','أشعة','فحص آخر'];
const doctorPriorities = ['عادي','عاجل'];
const doctorSelect = (label,name,choices,value) => `<label class="field"><span>${label}</span><select class="input" name="${name}">
  ${choices.map(choice=>`<option ${choice===value?'selected':''}>${choice}</option>`).join('')}</select></label>`;
const doctorTextArea = (label,name,value,attrs='') => `<label class="field"><span>${label}</span><textarea class="input" rows="3" name="${name}" maxlength="4000" ${attrs}>${esc(value)}</textarea></label>`;

function doctorFormRow(kind, row = {}, index = 0) {
  const fields = kind === 'diagnoses' ? field('التشخيص','label',row.label,'text','maxlength="180"') +
    field('رمز ICD-10 (اختياري)','code',row.code,'text','maxlength="15"') : kind === 'prescriptions' ?
    [['اسم الدواء','label'],['الجرعة','dose'],['التكرار','frequency'],['المدة','duration'],['طريقة الاستخدام','route'],['تعليمات وتحذيرات','instructions']]
      .map(([label,name])=>field(label,name,row[name],'text','maxlength="180"')).join('') :
    field('اسم الفحص','label',row.label,'text','maxlength="180"') +
      doctorSelect('نوع الطلب','kind',doctorOrderKinds,row.kind) + doctorSelect('الأولوية','priority',doctorPriorities,row.priority) +
      field('ملاحظات للقسم','notes',row.notes,'text','maxlength="240"');
  return `<div class="doctor-form-row" data-doctor-row="${kind}">${fields}
    ${kind==='diagnoses' ? '<small data-diagnosis-position>' + (index===0?'تشخيص أساسي':'تشخيص ثانوي') + '</small>' : ''}
    <button type="button" class="button secondary small" data-remove-row>حذف البند</button></div>`;
}

function doctorFormGroup(title, kind, rows, addLabel) {
  return `<fieldset class="doctor-form-group"><legend>${title}</legend><div data-doctor-group="${kind}">
    ${(rows || []).map((row,index)=>doctorFormRow(kind,row,index)).join('')}</div>
    <button class="button secondary small" type="button" data-add-row="${kind}">${addLabel}</button></fieldset>`;
}

function doctorEncounterPage() {
  const context = doctorEncounterContext();
  if (!context) return doctorNoPatients();
  const {person:p,appointment} = context;
  const visit = doctorVisits(p.id).find(v=>!v.approved && (v.appointmentId || '') === (appointment?.id || '')) || {};
  const vitals = [['ضغط الدم','pressure'],['النبض','pulse'],['الحرارة','temp'],['تشبع الأكسجين','spo2']];
  const readings = visit.vitalSigns || Object.fromEntries(vitals.map(([label,key])=>[label,db.vitals[p.id]?.[key]]));
  const orders = visit.requests || (visit.order ? [{label:visit.order,kind:/أشعة/.test(visit.order)?'أشعة':'فحص آخر'}] : []);
  return pageHead('فحص الزيارة السريرية',esc(p.name) + (appointment ? ' · حجز <bdi>'+esc(appointment.id)+'</bdi>' : ''),
    link('الملف الطبي','record/'+p.id,'secondary'),'بوابة الأطباء') + patientBanner(p) +
    `<form id="doctor-encounter"><div class="doctor-columns">
    <div>${doctorCard('S · الشكوى وتاريخ المرض', field('الشكوى الرئيسية *','reason',visit.reason,'text','required maxlength="180"')+
      doctorTextArea('تاريخ المرض الحالي','history',visit.history))}
    ${doctorCard('O · الفحص والقياسات', '<div class="doctor-filters">' + vitals.map(([label,key])=>
      field(label,key,readings[label],'text','maxlength="30"')).join('') + '</div>' + doctorTextArea('الفحص السريري','notes',visit.notes))}</div>
    <div>${doctorCard('A · التقييم والتشخيص',doctorTextArea('التقييم السريري','assessment',visit.assessment)+
      doctorSelect('درجة الخطورة','severity',['غير محددة','عادية','عاجلة'],visit.severity)+
      doctorFormGroup('التشخيصات','diagnoses',visit.diagnoses,'إضافة تشخيص'))}
    ${doctorCard('P · العلاج والمتابعة',doctorTextArea('خطة العلاج *','plan',visit.plan,'required')+
      doctorTextArea('تعليمات المتابعة','instructions',visit.instructions)+field('موعد المتابعة','followup',visit.followup,'date')+
      (visit.legacyMedication || (visit.medications && !visit.prescriptions?.length) ? doctorTextArea('الأدوية المسجلة سابقًا','legacyMedication',visit.legacyMedication || visit.medications) : '')+
      doctorFormGroup('الروشتة','prescriptions',visit.prescriptions,'إضافة دواء')+
      doctorFormGroup('طلبات الفحوصات','requests',orders,'إضافة طلب فحص'))}</div></div>
    <p class="doctor-error" role="alert"></p>
    <div class="doctor-actions doctor-save"><button class="button secondary" type="submit" value="draft" formnovalidate>حفظ مسودة</button>
      <button class="button primary" type="submit" value="approve">مراجعة واعتماد الزيارة</button></div></form>`;
}

function collectDoctorDraft(form, approving) {
  const read = name => form.elements.namedItem(name)?.value?.trim() || '';
  const scalarNames = ['reason','history','notes','assessment','severity','plan','instructions','followup'];
  const data = Object.fromEntries(scalarNames.map(name => [name,read(name)]));
  data.vitalSigns = Object.fromEntries([['ضغط الدم','pressure'],['النبض','pulse'],['الحرارة','temp'],['تشبع الأكسجين','spo2']]
    .map(([label,key]) => [label,read(key)]));
  const rows = kind => [...form.querySelectorAll('[data-doctor-row="'+kind+'"]')].map(node =>
    Object.fromEntries([...node.querySelectorAll('input,select')].map(el=>[el.name,el.value.trim()]))).filter(row =>
      Object.entries(row).some(([key,value])=>!['kind','priority'].includes(key) && value));
  data.diagnoses = rows('diagnoses').map((row,index)=>({...row,primary:index===0}));
  data.prescriptions = rows('prescriptions');
  data.requests = rows('requests');
  if (approving && (!data.reason || !data.plan || data.diagnoses.some(row=>!row.label) ||
    data.prescriptions.some(row=>!row.label || !row.dose || !row.frequency || !row.duration) || data.requests.some(row=>!row.label))) {
    throw new Error('أكمل الشكوى وخطة العلاج، واسم كل تشخيص وفحص، واسم الدواء وجرعته وتكراره ومدته.');
  }
  data.legacyMedication = read('legacyMedication');
  data.medications = [data.legacyMedication,...data.prescriptions.filter(row=>row.label).map(row=>
    [row.label,row.dose,row.frequency,row.duration,row.route,row.instructions].filter(Boolean).join(' · '))].filter(Boolean).join('\n');
  return data;
}

function storeDoctorEncounter(data, approved, share, route) {
  const context = doctorEncounterContext();
  if (!context || route !== location.hash) return;
  const {person:p,appointment} = context;
  const existing = doctorVisits(p.id).find(v=>!v.approved && (v.appointmentId || '') === (appointment?.id || ''));
  const v = {...data,id:existing?.id || 'V'+crypto.randomUUID(),patient:p.id,doctor:demoDoctor,
    appointmentId:appointment?.id,approved,date:new Date().toLocaleDateString('ar-EG')};
  if (approved) v.approvedAt = new Date().toISOString();
  if (appointment && !appointment.calledAt) appointment.calledAt = new Date().toISOString();
  if (existing) db.visits[db.visits.indexOf(existing)] = v;
  else db.visits.push(v);
  if (approved) {
    for (const [index,request] of v.requests.entries()) {
      if (!db.orders.some(o => o.visit === v.id && (o.requestIndex === index || (o.requestIndex == null && o.type === request.label)))) {
        db.orders.push({patient:p.id,visit:v.id,type:request.label,kind:request.kind,priority:request.priority,
          notes:request.notes,requestIndex:index,status:'تم الطلب',date:v.date,doctor:demoDoctor});
      }
    }
    if (appointment) { appointment.status='مكتمل'; appointment.queueState='completed'; }
    p.status = 'مكتملة';
    if (share) db.sharedReports.push({patient:p.id,visit:v.id,plan:v.plan,instructions:v.instructions,
      medications:v.medications,date:v.date});
  } else {
    p.status = 'قيد الزيارة';
    if (appointment) appointment.queueState = 'in-consultation';
  }
  log(approved?'اعتماد زيارة سريرية':'حفظ مسودة زيارة',v.id);
  closeModal();
  if (approved) location.hash = 'record/' + p.id;
  else render();
  toast(approved?'تم اعتماد الزيارة.':'تم حفظ المسودة.');
}

function bindDoctorPortal(route) {
  $('#doctor-visit-date')?.addEventListener('change',e=>{doctorVisitDate=e.target.value;render();$('#doctor-visit-date')?.focus();});
  const dateInput=$('#doctor-schedule-date');
  if (dateInput) {
    const changePeriod=value=>{
      doctorScheduleDate=value;
      doctorScheduleDay='';
      render();
    };
    dateInput.addEventListener('change',event=>{
      changePeriod(event.target.value);
      $('#doctor-schedule-date')?.focus();
    });
    $('#doctor-schedule-day')?.addEventListener('change',event=>{
      doctorScheduleDay=event.target.value;
      render();
      $('#doctor-schedule-day')?.focus();
    });
    for (const control of document.querySelectorAll('[data-schedule-shift]')) {
      control.addEventListener('click',()=>{
        const shift=control.dataset.scheduleShift;
        const date=new Date((doctorScheduleDate||doctorToday())+'T12:00:00');
        if (shift!=='today') date.setDate(date.getDate()+Number(shift));
        changePeriod(shift==='today'?'':bookingDateKey(date));
        document.querySelector('[data-schedule-shift="'+shift+'"]')?.focus();
      });
    }
  }
  const recordKey = ['record','encounter'].includes(route) && doctorCanAccess(selected) && $('#main .patient-banner')
    ? location.hash : '';
  if (recordKey && lastDoctorRecord !== recordKey) log('عرض ملف أو كشف سريري',selected);
  lastDoctorRecord = recordKey;
  const form = $('#doctor-encounter');
  if (!form) return;
  form.addEventListener('click',e=>{
    const add = e.target.closest('[data-add-row]');
    const remove = e.target.closest('[data-remove-row]');
    if (add) {
      const group = form.querySelector('[data-doctor-group="'+add.dataset.addRow+'"]');
      group.insertAdjacentHTML('beforeend',doctorFormRow(add.dataset.addRow,{},group.children.length));
      group.lastElementChild.querySelector('input')?.focus();
    } else if (remove) {
      const row = remove.closest('[data-doctor-row]');
      const group = row.parentElement;
      row.remove();
      group.querySelectorAll('[data-diagnosis-position]').forEach((el,index)=>{el.textContent=index===0?'تشخيص أساسي':'تشخيص ثانوي';});
      group.parentElement.querySelector('[data-add-row]').focus();
    }
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const approving = e.submitter?.value === 'approve';
    let data;
    try { data=collectDoctorDraft(form,approving); }
    catch (error) { form.querySelector('.doctor-error').textContent=error.message; return; }
    form.querySelector('.doctor-error').textContent='';
    const hash = location.hash;
    if (!approving) { storeDoctorEncounter(data,false,false,hash); return; }
    modal('مراجعة واعتماد الزيارة',`<p>سيُحفظ التقرير باسم ${esc(demoDoctor)} مع وقت الاعتماد.</p>
      <p class="doctor-plan-preview">${esc(data.plan)}</p>
      <label><input type="checkbox" id="doctor-share-plan"> مشاركة الخطة وتعليمات المتابعة والروشتة مع المريض</label>`,
      '<button class="button primary" id="doctor-approve-visit" type="button">تأكيد الاعتماد الطبي</button>' +
      button('العودة للكشف','close','secondary'));
    $('#doctor-approve-visit').addEventListener('click',()=>storeDoctorEncounter(data,true,$('#doctor-share-plan').checked,hash),{once:true});
  });
}
