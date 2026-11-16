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
  document.title='كشك تسجيل الوصول | MNU 333';
  $('#app').innerHTML=`<main class="desk-kiosk" aria-labelledby="desk-kiosk-title">
    <div class="desk-kiosk-inner">${logo()}
      <h1 id="desk-kiosk-title">كشك تسجيل الوصول</h1>
      <p>معاينة محلية. أدخل رمز الوصول من تفاصيل موعدك المؤكد لليوم.</p>
      <form id="desk-kiosk-form" class="patient-service-form">
        ${field('رمز الوصول','token','','text','required maxlength="36" dir="ltr" autocomplete="off"')}
        <p class="form-error" role="alert"></p>
        <button class="button primary" type="submit">تسجيل الوصول</button>
      </form>
      <p id="desk-kiosk-result" class="desk-kiosk-result" role="status"></p>
      ${link('العودة للبوابة',deskReception()?'reception-services/kiosk':deskPatient()?'appointments':'home','secondary')}
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
    row.status='تم تسجيل الوصول';
    row.kioskToken=null;
    recordReceptionArrival(row);
    Object.assign(receptionPerson(row.patient),{status:'بانتظار الطبيب',doctor:row.doctor});
    db.audit.unshift({action:'تسجيل وصول من الكشك التجريبي',resource:row.id,role:'الكشك',time:deskWhen(deskNow())});
    save();
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
