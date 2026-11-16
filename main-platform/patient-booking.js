'use strict';

const patientBookingRoute = (id,view='') => 'patient-journey/'+encodeURIComponent(id)+(view?'/'+view:'');
const patientCancelReasons = ['','الموعد غير مناسب','تغيّرت خطتي','حجزت موعدًا آخر','سبب آخر'];
const patientBookingLabel = id => `<span class="patient-booking-label">رقم الحجز <bdi>${esc(id)}</bdi></span>`;

function patientBookingCode(row, extra='') {
  if (!row || !canEditBooking(row) || row.status!=='مؤكد') return '';
  const token = patientKioskToken(row);
  return token?`<canvas class="patient-code ${extra}" data-token="${esc(token)}" data-id="${esc(row.id)}"
    role="img" aria-label="رمز QR لتسجيل الحضور"></canvas>`:'';
}

function patientBookingReceipt(row) {
  const confirmed = row.status==='مؤكد';
  const pending = row.status==='بانتظار التأكيد';
  const doctor = bookingDirectory()[row.doctor];
  const id = esc(row.id);
  const dataId = `data-id="${id}"`;
  const checkIn = patientBookingCode(row,'patient-full-code');
  const number = `<div><p>رقم الحجز</p><div class="patient-screen-actions">
    <strong class="patient-booking-number"><bdi>${id}</bdi></strong>
    <button type="button" class="button secondary" id="patient-copy-booking" ${dataId}>نسخ الرقم</button></div></div>`;
  const actions = `<div class="patient-screen-actions">
    ${confirmed?`<button type="button" class="button primary" data-patient-service="calendar" ${dataId}>إضافة للتقويم</button>`:''}
    ${confirmed?link('قبل موعدك',patientBookingRoute(row.id,'prepare'),'secondary'):''}
    ${button('إعادة جدولة','edit-booking','secondary',dataId)}
    ${button('إلغاء الحجز','cancel-booking','secondary',dataId)}</div>`;
  const details = `${number}<div><h2>${esc([row.doctor,doctor?.department].filter(Boolean).join(' · '))}</h2>
    <p>${patientVisitDate(row.date,row.time)}</p><p>${esc(doctor?.location||'الموقع غير مسجل')}</p></div>
    ${row.reason?`<p>سبب الزيارة · ${esc(row.reason)}</p>`:''}
    ${checkIn?'<p class="patient-booking-note">اعرض الكود أو قل رقم الحجز عند الاستقبال لتسجيل حضورك.</p>':''}${actions}`;
  const code = checkIn?`${checkIn}
    <strong><bdi>${id}</bdi></strong><p>كود تسجيل الحضور</p><button type="button" id="patient-save-qr" class="button secondary">حفظ كصورة</button>
    ${row.date===receptionToday()?deskAction('عرض الرمز النصي للكشك','kiosk-pass',row.id,'secondary small'):''}
    <p>يحمل الكود رمز وصول مؤقتًا فقط، ويُستخدم يوم الموعد.</p>`:
    `<h2>كود تسجيل الحضور</h2>${patientScreenEmpty(pending?'بانتظار تأكيد الاستقبال. ستجد كود QR هنا بعد التأكيد.':
      'كود تسجيل الحضور غير متاح لهذا الموعد.')}`;
  return `<div class="patient-screen"><p><a href="#appointments">مواعيدي</a> / ${confirmed?'تأكيد الحجز':'طلب الحجز'}</p>
    ${patientScreenHeading(confirmed?'تم تأكيد حجزك':'تم إرسال طلب الحجز')}
    <div class="patient-two patient-receipt-layout">${patientScreenPanel('',details)}${patientScreenPanel('',code,'','patient-qr-panel')}</div></div>`;
}

function bindPatientBookingReceipt() {
  $$('.patient-code').forEach(drawPatientBookingCode);
  const copy = $('#patient-copy-booking');
  if (!copy) return;
  copy.addEventListener('click',async ()=>{
    try {
      await navigator.clipboard.writeText(copy.dataset.id);
      toast('تم نسخ رقم الحجز.');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents($('.patient-booking-number bdi'));
      selection.removeAllRanges();
      selection.addRange(range);
      toast('رقم الحجز محدد للنسخ.');
    }
  });
  const canvas = $('.patient-full-code');
  if (!canvas) return;
  const download = $('#patient-save-qr');
  if (canvas.hidden) { download.hidden=true; return; }
  download.addEventListener('click',()=>{
    const image = document.createElement('a');
    image.href=canvas.toDataURL('image/png');
    image.download='MNU333-'+canvas.dataset.id+'-QR.png';
    image.click();
  });
}

function drawPatientBookingCode(canvas) {
  const context = canvas.getContext('2d');
  if (typeof qrcode!=='function'||!context) { canvas.hidden=true; return; }
  const qr = qrcode(0,'M');
  qr.addData(canvas.dataset.token);
  qr.make();
  const size = qr.getModuleCount();
  const scale = 8;
  const margin = 4;
  canvas.width = canvas.height = (size+margin*2)*scale;
  context.fillStyle='#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#102f36';
  for (let row=0;row<size;row++) {
    for (let col=0;col<size;col++) {
      if (qr.isDark(row,col)) context.fillRect((col+margin)*scale,(row+margin)*scale,scale,scale);
    }
  }
}

function patientPrecheckPage(row) {
  const p = patient();
  const saved = row.precheck;
  const insurer = patientRegisteredInsurer();
  const steps = [
    ['تأكيد بياناتك',[p.name,p.age?p.age+' سنة':'',p.phone].filter(Boolean).join(' · '),'بياناتي صحيحة','identity'],
    ['التأمين',insurer||'لم تسجل جهة تأمين',insurer?'تمت المراجعة':'متابعة بدون تأمين','insurance'],
    ['الحساسية والأدوية',p.allergy||'لا توجد حساسية مسجلة','راجعت البيانات','medication'],
    ['الموافقة على تجهيز الزيارة','أوافق على حفظ هذه المراجعة ضمن الحجز في المعاينة','أوافق','consent']
  ];
  const checklist = steps.map(([title,detail,label,key],index)=>patientScreenPanel('',`
    <div class="patient-screen-heading"><div><h2>${index+1} ${title}</h2><p>${esc(detail)}</p>
    ${key==='insurance'&&!insurer?'<button type="button" class="patient-inline-link" data-patient-command="insurer">أضف جهة تأمين</button>':
      key==='medication'?'<a href="#patient-attachments/medications">عرض الأدوية المشتركة</a>':''}</div>
    <label class="patient-toggle"><input type="checkbox" name="${key}" required ${saved?'checked':''}><span>${label}</span></label></div>`)).join('');
  const ready = `<h2>${saved?'تم تجهيز زيارتك':'جاهز؟'}</h2><p>${saved?'اعرض الكود عند الوصول يوم الموعد':'أكمل الخطوات لتجهيز زيارتك'}</p>
    ${patientBookingCode(row,'patient-precheck-code')}
    <button type="submit" class="button primary">${saved?'تحديث التجهيز':'أنا جاهز'}</button>
    <p class="form-error" role="alert"></p>`;
  return `<div class="patient-screen"><p><a href="#appointments">مواعيدي</a> / <bdi>${esc(row.id)}</bdi></p>
    ${patientScreenHeading('سجل حضورك قبل الوصول')}<form id="patient-precheck-form" data-id="${esc(row.id)}" class="patient-two patient-receipt-layout">
    <div class="patient-screen-stack">${checklist}</div>${patientScreenPanel('',ready,'','patient-qr-panel')}</form></div>`;
}

function patientAlternativeSlots(name,id,from=bookingDateKey(new Date()),limit=6) {
  const date = new Date(from+'T12:00:00');
  const slots = [];
  for (let day=0;day<28&&slots.length<limit;day++,date.setDate(date.getDate()+1)) {
    const key = bookingDateKey(date);
    slots.push(...availableBookingTimes(name,id,key).slice(0,day===0?3:2).map(time=>({date:key,time})));
  }
  return slots.slice(0,limit);
}

function patientReschedule(id) {
  db=readLocalDatabase()||db;
  const row = patientServiceRecord(db.appointments,id);
  if (!canEditBooking(row)) { toast('الموعد غير متاح لإعادة الجدولة.'); return; }
  const original = [row.doctor,row.date,row.time].join('|');
  const slots = patientAlternativeSlots(row.doctor,row.patient);
  modal('إعادة جدولة',`<form id="patient-reschedule" class="patient-service-form">
    <p>الموعد الحالي · ${patientVisitDate(row.date,row.time)}</p><p>اختر موعدًا جديدًا مع ${esc(row.doctor)}</p>
    ${slots.length?`<div class="patient-screen-pills">${slots.map(({date,time},i)=>`<label class="patient-choice">
      <input type="radio" name="slot" value="${i}" ${i===0?'checked':''}><span>${patientShortDate(date)} · <bdi>${time}</bdi></span></label>`).join('')}</div>`:
      '<p>لا توجد أوقات بديلة متاحة حاليًا.</p>'}
    <p>رقم الحجز محفوظ، ويتجدد كود الوصول بعد تغيير الموعد.</p><p class="form-error" role="alert"></p>
    <button class="button primary" type="submit" ${slots.length?'':'disabled'}>تأكيد الموعد الجديد</button>
    ${button('رجوع','close')}${button('اختيار تاريخ آخر','full-reschedule','secondary',`data-id="${esc(id)}"`)}</form>`);
  deskSubmit('#patient-reschedule',deskPatient,({slot})=>{
    const current = patientServiceRecord(db.appointments,id);
    const next = slots[Number(slot)];
    if (!canEditBooking(current)||[current.doctor,current.date,current.time].join('|')!==original) return 'تغير الموعد. أغلق النافذة وافتحها مرة أخرى.';
    if (!next||!availableBookingTimes(current.doctor,current.patient,next.date).includes(next.time)) return 'الوقت لم يعد متاحًا. اختر وقتًا آخر.';
    Object.assign(current,next,{kioskToken:null,precheck:null});
    log('إعادة جدولة موعد',id);
  });
}

function patientBookingConflict(name,id,slot,waitId) {
  const times=availableBookingTimes(name,id,slot.date);
  modal('الوقت لم يعد متاحًا',`<form id="patient-book-conflict" class="patient-service-form">
    <p>اختر وقتًا متاحًا في نفس اليوم أو ارجع لاختيار يوم آخر.</p>
    <div class="patient-screen-pills">${times.map((value,index)=>`<label class="patient-choice"><input type="radio" name="time"
      value="${esc(value)}" ${index===0?'checked':''}><span><bdi>${esc(value)}</bdi></span></label>`).join('')}</div>
    ${times.length?'<button type="submit" class="button primary">اختر وقتًا بديلًا</button>':''}
    ${button('رجوع','close')}${waitId?'':`<button type="button" class="button secondary" name="wait">قائمة الانتظار</button>`}</form>`);
  const form=$('#patient-book-conflict');
  form.elements.wait?.addEventListener('click',()=>appointmentWaitJoin({doctor:name,patient:id,date:slot.date}));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const time=new FormData(form).get('time');
    if (times.includes(time)&&patientSessionId()===id) book(undefined,name,id,{...slot,time},waitId);
  });
}

function patientBookingSaveError(form) {
  const area=form.querySelector('[role=alert]');
  area.innerHTML='<strong>تعذّر حفظ الحجز</strong><p>تحقق من إتاحة التخزين في المتصفح ثم أعد المحاولة.</p>'+
    '<div class="patient-screen-actions"><button type="submit" class="button primary">إعادة المحاولة</button>'+
    '<a class="button secondary" href="#patient-requests/support" data-close-booking-error>تواصل مع الدعم</a></div>';
  area.querySelector('[data-close-booking-error]').addEventListener('click',closeModal);
}
