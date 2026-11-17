'use strict';

function patientKioskPass(id) {
  const row=patientServiceRecord(db.appointments,id);
  if (row?.date!==receptionToday() || row?.status!=='مؤكد') { toast('رمز الوصول متاح لموعد مؤكد لليوم.');return; }
  const token = patientKioskToken(row);
  if (!token) return;
  modal('رمز تسجيل الوصول',`<p>أدخل الرمز في كشك الوصول التجريبي.</p>
    <label class="field"><span>رمز الوصول</span><input class="input" readonly dir="ltr" value="${esc(token)}"></label>
    ${link('فتح الكشك','check-in-kiosk','secondary')}`);
}

function patientKioskToken(row) {
  if (row.patient!==deskPatient() || row.status!=='مؤكد' || row.date<receptionToday()) return '';
  if (!row.kioskToken) {
    row.kioskToken=crypto.randomUUID();
    log('إصدار رمز وصول تجريبي',row.id);
  }
  return row.kioskToken;
}

function kioskPage() {
  closeModal();
  document.body.dataset.surface='reception-kiosk';
  document.title='كشك تسجيل الوصول | '+hospitalProfile().name;
  $('#app').innerHTML=`<main class="desk-kiosk" aria-labelledby="desk-kiosk-title">
    <div class="desk-kiosk-inner">
      <h1 id="desk-kiosk-title">أهلًا بك في <bdi>${esc(hospitalProfile().name)}</bdi></h1>
      <p>التسجيل الذاتي</p>
      <form id="desk-kiosk-form" class="patient-service-form">
        <input class="input" name="token" type="text" required maxlength="36" dir="ltr" autocomplete="off"
          aria-label="رمز الوصول" placeholder="أدخل رمز الوصول من حجزك">
        <p class="form-error" role="alert"></p>
        <button class="button primary" type="submit">تأكيد الوصول</button>
      </form>
      <p id="desk-kiosk-result" class="desk-kiosk-result" role="status"></p>
      ${link('العودة للبوابة',deskReception()?'reception-services/kiosk':deskPatient()?'appointments':'home','reception-text-link')}
    </div></main>`;
  const form=$('#desk-kiosk-form');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    deskRefresh();
    const token=form.elements.token.value.trim().toLowerCase();
    const result=$('#desk-kiosk-result'),error=form.querySelector('[role=alert]');
    result.textContent='';error.textContent='';
    const valid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(token);
    const row=valid&&db.appointments.find(item=>item.kioskToken===token&&item.date===receptionToday()&&
      item.status==='مؤكد'&&receptionPerson(item.patient)&&!receptionActiveArrival(item.patient));
    if (!row) { error.textContent='الرمز غير صالح لهذا الموعد أو تم تسجيل الوصول بالفعل.';return; }
    const person=receptionPerson(row.patient);
    const previousRow={...row};
    const previousPerson={status:person.status,doctor:person.doctor};
    row.status='تم تسجيل الوصول';
    row.kioskToken=null;
    recordReceptionArrival(row);
    Object.assign(person,{status:'بانتظار الطبيب',doctor:row.doctor});
    db.audit.unshift({action:'تسجيل وصول من الكشك التجريبي',resource:row.id,role:'الكشك',time:deskWhen(deskNow())});
    if (!save()) {
      Object.keys(row).forEach(key=>{if (!Object.hasOwn(previousRow,key)) delete row[key];});
      Object.assign(row,previousRow);
      Object.assign(person,previousPerson);
      db.audit.shift();
      error.textContent='تعذّر تسجيل الوصول في هذا المتصفح. حاول مجددًا.';
      return;
    }
    result.textContent='رقم الدور A'+row.queueNumber+' · '+receptionClinic(row);
    form.reset();
  });
}

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-desk-action="kiosk-pass"]');
  if (!control||!deskPatient()) return;
  deskRefresh();
  patientKioskPass(control.dataset.id);
});
