'use strict';

// Frontend data boundary. Replace these operations with authenticated requests
// when the shared database is connected.
const deskRows = (collection) => db.serviceDesk?.[collection] || [];
const deskNow = () => new Date().toISOString();
const deskActor = () => demoSession?.staffId || demoSession?.patientId || currentDoctor() || demoSession?.role || 'kiosk';
const deskRefresh = () => { db = readLocalDatabase() || db; };
const deskPatient = () => demoSession?.role === 'patient' && receptionPerson(demoSession.patientId) ? demoSession.patientId : null;
const deskReception = () => receptionGuard();
const deskOwned = (collection,id) => {
  const patientId = deskPatient();
  return patientId && deskRows(collection).find(row=>row.id===id && row.patient===patientId);
};

function deskAdd(collection, values) {
  const row={...values,id:crypto.randomUUID(),createdAt:deskNow(),actor:deskActor()};
  ((db.serviceDesk ||= {})[collection] ||= []).push(row);
  log('إضافة سجل خدمة',row.id);
  return row;
}

function deskUpdate(row, changes) {
  Object.assign(row,changes,{updatedAt:deskNow(),updatedBy:deskActor()});
  log('تحديث سجل خدمة',row.id);
}

function deskSubmit(formId, authorized, handle) {
  $(formId)?.addEventListener('submit',event=>{
    event.preventDefault();
    deskRefresh();
    if (!authorized()) return;
    const form=event.currentTarget;
    const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,String(value).trim()]));
    const error=handle(values);
    if (error) { form.querySelector('[role=alert]').textContent=error;return; }
    if ($('#modal-root .modal')?.contains(form)) closeModal();
    render();
    toast('تم الحفظ في المعاينة.');
  });
}

function deskModal(title,fields,submit='حفظ') {
  modal(title,`<form id="desk-form" class="patient-service-form">${fields}
    <p class="form-error" role="alert"></p><button class="button primary" type="submit">${submit}</button></form>`);
}

const deskText = (label,name,required=true) =>
  `<label class="field"><span>${label}</span><textarea class="input" name="${name}" rows="3" maxlength="500" ${required?'required':''}></textarea></label>`;
const deskSelect = (label,name,values,value) => adminSelect(label,name,values.map(item=>Array.isArray(item)?item:[item,item]),value,'required');
const deskChoice = (label,name,values) => deskSelect(label,name,values,values[0]);
const deskPersonField = () => deskSelect('المريض','patient',db.patients.map(p=>[p.id,p.name+' · '+p.id]),selected);
const deskAction = (label,action,id='',tone='secondary small') =>
  `<button type="button" class="button ${tone}" data-desk-action="${action}" data-id="${esc(id)}">${label}</button>`;
const deskRow = (title,detail,status='',actions='') =>
  `<article class="patient-service-row"><div><strong>${esc(title)}</strong><p class="patient-result-note">${esc(detail)}</p></div>
    ${status?badge(status,'teal'):''}${actions}</article>`;
const deskPanel = (title,rows,empty='لا توجد سجلات بعد.') => patientService(title,rows.length?rows.join(''):patientServiceEmpty(empty));
const deskWhen = value => value?new Date(value).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}):'—';
const deskAmount = value => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value)<=10000000 ? Math.round(Number(value)*100) : null;
