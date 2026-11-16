'use strict';

const appointmentWaitRows = () => db.appointmentWaitlist || [];
const appointmentWaitSlots = row => availableBookingTimes(row.doctor,row.patient,row.date);
const appointmentWaitStatus = row => row.status==='booked'?'تم الحجز':row.status==='cancelled'?'ملغي':
  row.date<receptionToday()?'انتهت المهلة':appointmentWaitSlots(row).length?'يوجد موعد متاح':'في الانتظار';

function appointmentWaitPage() {
  const staff = role==='reception';
  const rows = appointmentWaitRows().filter(row=>staff||row.patient===patientSessionId());
  const entries = rows.map(row=>{
    const status = appointmentWaitStatus(row);
    const actions = row.status==='waiting' && row.date>=receptionToday() ?
      (status==='يوجد موعد متاح'?button('اختيار موعد','waitlist-book','primary small',receptionIdAttr(row)):'')+
      button('إلغاء الطلب','waitlist-cancel','secondary small',receptionIdAttr(row)):'';
    return receptionRow(esc(staff?(receptionPerson(row.patient)?.name||row.patient)+' · '+row.doctor:row.doctor),
      esc(receptionDate(row.date)+(staff?' · '+row.patient:'')),badge(status,status==='يوجد موعد متاح'?'teal':'gray')+actions);
  });
  if (!staff) return '<div class="patient-screen">'+patientScreenHeading('قائمة انتظار المواعيد',
    button('إضافة إلى قائمة الانتظار','waitlist-join','primary'))+
    '<p>اختر طبيبًا وتاريخًا، وإذا توفر وقت سيظهر تنبيه داخل البوابة لتكمل الحجز.</p>'+
    patientScreenPanel('طلبات الانتظار',entries.length?receptionRows(entries):patientScreenEmpty('لا توجد طلبات انتظار'))+'</div>';
  return pageHead('قائمة انتظار المواعيد','اختار طبيب وتاريخ. لما يتاح وقت، تقدر تختاره وتكمل الحجز.',
    button('إضافة إلى قائمة الانتظار','waitlist-join','primary')+link('المواعيد','appointments','secondary'),
    staff?'بوابة الاستقبال':'بوابة المريض')+patientServiceWrap(patientService('طلبات الانتظار',receptionRows(entries)));
}

function appointmentWaitJoin(preferred={}) {
  if (!appointmentWaitCanAct()) return;
  db=readLocalDatabase()||db;
  const staff=role==='reception';
  const doctors=Object.entries(bookingDirectory()).filter(([,schedule])=>schedule.active!==false);
  if (!doctors.length) { toast('لا توجد عيادات متاحة حاليًا.');return; }
  modal('إضافة إلى قائمة الانتظار',`<form id="waitlist-form" class="patient-service-form">
    ${staff?adminSelect('المريض','patient',db.patients.map(p=>[p.id,p.name+' · '+p.id]),preferred.patient||selected,'required'):''}
    ${adminSelect('الطبيب','doctor',doctors.map(([name,d])=>[name,name+' · '+d.department]),preferred.doctor||doctors[0][0],'required')}
    ${field('التاريخ المطلوب','date',preferred.date||receptionToday(),'date','required min="'+receptionToday()+'"')}
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">إضافة الطلب</button></form>`);
  $('#waitlist-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!appointmentWaitCanAct()) return;
    db=readLocalDatabase()||db;
    const {patient,doctor,date}=Object.fromEntries(new FormData(event.currentTarget));
    const id=staff?patient:patientSessionId();
    const error=event.currentTarget.querySelector('[role=alert]');
    const schedule=bookingDirectory()[doctor];
    if (!receptionPerson(id)||!schedule||schedule.active===false||!healthArchiveDate(date)||date<receptionToday()||
      !schedule.days.includes(new Date(date+'T12:00:00').getDay())||
      !schedule.hours.some(time=>futureBookingSlot(date,time))) {
      error.textContent='اختار يوم عمل للعيادة فيه وقت لم يمر بعد.';return;
    }
    if (appointmentWaitRows().some(row=>row.patient===id&&row.doctor===doctor&&row.date===date&&row.status==='waiting')) {
      error.textContent='فيه طلب انتظار مسجل بالفعل للطبيب والتاريخ دول.';return;
    }
    (db.appointmentWaitlist ||= []).push({id:'WAIT-'+crypto.randomUUID(),patient:id,doctor,date,status:'waiting',
      createdAt:new Date().toISOString()});
    log('إضافة إلى انتظار المواعيد',id);
    closeModal();render();toast('تم تسجيل طلب الانتظار.');
  });
}

function appointmentWaitCanAct() {
  return receptionGuard() || (role==='patient' && !!patientSessionId());
}

function appointmentWaitNotices(id) {
  return appointmentWaitRows().filter(row=>row.patient===id&&row.status==='waiting').flatMap(row=>{
    const slots=appointmentWaitSlots(row);
    return slots.length?[{key:'waitlist:'+row.id+':'+slots.join(','),title:'موعد متاح في قائمة الانتظار',
      detail:row.doctor+' · '+receptionDate(row.date),date:row.date,route:'appointment-waitlist'}]:[];
  });
}

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-action^="waitlist-"]');
  if (!control||!appointmentWaitCanAct()) return;
  const {action,id}=control.dataset;
  if (action==='waitlist-join') { appointmentWaitJoin();return; }
  db=readLocalDatabase()||db;
  const row=appointmentWaitRows().find(item=>item.id===id && item.status==='waiting' &&
    (role==='reception'||item.patient===patientSessionId()));
  if (!row||row.date<receptionToday()) return;
  if (action==='waitlist-book') {
    const [time]=appointmentWaitSlots(row);
    if (!time) { render();toast('الوقت لم يعد متاحًا.');return; }
    book(null,row.doctor,row.patient,{date:row.date,time},row.id);
  }
  if (action==='waitlist-cancel') {
    Object.assign(row,{status:'cancelled',updatedAt:new Date().toISOString()});
    log('إلغاء طلب انتظار موعد',row.id);render();toast('تم إلغاء طلب الانتظار.');
  }
});
