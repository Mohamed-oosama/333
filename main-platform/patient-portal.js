'use strict';

function patientDoctorCard(name,doctor) {
  const available = firstBookingDay(name,demoSession.patientId);
  return `<article class="patient-screen-panel patient-doctor-card" data-doctor-department="${esc(doctor.department)}"
    data-doctor-search="${esc([name,doctor.specialty,doctor.clinic,doctor.branch,doctor.location].filter(Boolean).join(' '))}">
    <span class="patient-directory-avatar" aria-hidden="true">د</span>
    <h2>${esc(name)}</h2><p>${esc(doctor.specialty)}</p>
    <p class="patient-doctor-available">${available ? 'أقرب موعد '+patientShortDate(available) : 'لا توجد أوقات متاحة'}</p>
    <div class="patient-screen-actions">${link('احجز','appointments/doctor/'+encodeURIComponent(name),'primary small')}
    ${button('الملف','doctor-profile','secondary small',`data-id="${esc(name)}"`)}</div>
  </article>`;
}

function patientDoctorsPage(name) {
  const doctors = Object.entries(bookingDirectory()).filter(([,doctor]) => doctor.active !== false);
  const groups = patientDepartmentChoices(doctors);
  return `<div class="patient-screen">${patientScreenHeading('الأطباء والتخصصات',
    `<input class="input patient-directory-query" id="patient-doctor-query" type="search" aria-label="اسم الطبيب أو العيادة" placeholder="اسم الطبيب أو العيادة" value="${esc(patientDecode(name))}">`)}
    <div class="patient-screen-pills" aria-label="التخصصات">
      <button type="button" class="patient-pill" data-doctor-group="" aria-pressed="true">كل التخصصات</button>
      ${groups.slice(0,8).map(([,label,matches])=>`<button type="button" class="patient-pill" aria-pressed="false"
        data-doctor-group="${esc(JSON.stringify(bookingDepartments().filter(matches)))}">${esc(label)}</button>`).join('')}
      ${groups.length>8?`<select id="patient-doctor-specialty" class="input" aria-label="تخصصات أخرى"><option value="">تخصصات أخرى</option>
        ${groups.slice(8).map(([name])=>`<option>${esc(name)}</option>`).join('')}</select>`:''}
    </div>
    <div class="patient-four">${doctors.map(([doctorName,doctor])=>patientDoctorCard(doctorName,doctor)).join('')}</div>
    <p id="patient-doctor-empty" class="patient-screen-empty" hidden>لا يوجد أطباء مطابقون لاختيارك.</p></div>`;
}

function showPatientDoctorProfile(name) {
  if (patientSessionId()) location.hash='patient-doctors/profile/'+encodeURIComponent(name);
}

function patientDoctorProfile(name) {
  const doctor = bookingDirectory()[name];
  if (!doctor||doctor.active===false) return '<div class="patient-screen">'+patientScreenHeading('ملف الطبيب')+
    patientScreenEmpty('هذا الطبيب غير متاح للحجز',link('دليل الأطباء','patient-doctors','secondary'))+'</div>';
  const about = `<div class="patient-provider-header"><span class="patient-directory-avatar" aria-hidden="true">د</span>
    <div><h1>${esc(name)}</h1><p>${esc([doctor.specialty,doctor.clinic].filter(Boolean).join(' · '))}</p>
    <p>${esc(doctor.location)}</p></div></div>
    <h2>نبذة</h2><p>${esc(doctor.bio||doctor.specialty)}</p>
    <p>أيام العيادة · ${doctor.days.map(day=>bookingDayNames[day]).join('، ')}</p>
    <div>${deskAction('رسالة للاستقبال','thread-add','','secondary')}</div>`;
  const schedule = `<form id="patient-provider-slots" class="patient-service-form" data-doctor="${esc(name)}"></form>`;
  return `<div class="patient-screen"><p><a href="#patient-doctors">الأطباء</a> / ${esc(name)}</p>
    <div class="patient-two">${patientScreenPanel('',about)}${patientScreenPanel('جدول المواعيد',schedule)}</div></div>`;
}

function bindPatientDoctorProfile() {
  const form=$('#patient-provider-slots');
  if (!form) return;
  const name=form.dataset.doctor,id=patientSessionId(),day=new Date();
  const days=[];
  for(let i=0;i<28&&days.length<3;i++,day.setDate(day.getDate()+1)) {
    const date=bookingDateKey(day);
    if (availableBookingTimes(name,id,date).length) days.push(date);
  }
  let date=days[0],time='';
  function display() {
    const hours=availableBookingTimes(name,id,date||'');
    if (!hours.includes(time)) time=hours[0]||'';
    const pills=(values,key,label)=>values.map(v=>`<button type="button" class="patient-pill" name="${key}" value="${esc(v)}"
      aria-pressed="${v===(key==='date'?date:time)}">${label(v)}</button>`).join('');
    form.innerHTML=(days.length?`<div class="patient-screen-pills">${pills(days,'date',v=>esc(healthArchiveDateLabel(v,{weekday:'long',day:'numeric'})))}</div>
      <div class="patient-screen-pills">${pills(hours,'time',v=>'<bdi>'+esc(v)+'</bdi>')}</div>`:patientScreenEmpty('لا توجد أوقات متاحة'))+
      `<button type="submit" class="button primary" ${time?'':'disabled'}>${time?'احجز '+patientShortDate(date)+' · <bdi>'+esc(time)+'</bdi>':'احجز موعدًا'}</button>
      <button type="button" name="wait" class="patient-inline-link">لا يوجد وقت مناسب؟ قائمة الانتظار</button>`;
  }
  form.addEventListener('click',event=>{
    const control=event.target.closest('button[type=button]');
    if (!control) return;
    if(control.name==='wait'){appointmentWaitJoin({doctor:name,date,patient:id});return;}
    if(control.name==='date'){date=control.value;time='';}
    if(control.name==='time') time=control.value;
    display();
    [...form.elements].find(node=>node.name===control.name&&node.value===control.value)?.focus();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (time&&patientSessionId()===id) book(undefined,name,undefined,{date,time,review:true});
  });
  display();
}

function filterPatientDoctors() {
  if (!$('#patient-doctor-empty')) return;
  const query = ($('#patient-doctor-query')?.value || '').trim().toLocaleLowerCase('ar');
  const specialty = $('#patient-doctor-specialty')?.value || '';
  const group = $('[data-doctor-group][aria-pressed="true"]')?.dataset.doctorGroup;
  const departments = specialty ? [specialty] : group ? JSON.parse(group) : null;
  const cards = [...document.querySelectorAll('[data-doctor-department]')];
  for (const card of cards) {
    card.hidden = (departments && !departments.includes(card.dataset.doctorDepartment)) ||
      !card.dataset.doctorSearch.toLocaleLowerCase('ar').includes(query);
  }
  $('#patient-doctor-empty').hidden = cards.some(card=>!card.hidden);
}

document.addEventListener('input', event => {
  if (event.target.id === 'patient-doctor-query') filterPatientDoctors();
});
document.addEventListener('change', event => {
  if (event.target.id !== 'patient-doctor-specialty') return;
  $$('[data-doctor-group]').forEach(node=>node.setAttribute('aria-pressed',String(!event.target.value&&!node.dataset.doctorGroup)));
  filterPatientDoctors();
});
document.addEventListener('click', event => {
  const group = event.target.closest('[data-doctor-group]');
  if (!group) return;
  $$('[data-doctor-group]').forEach(node=>node.setAttribute('aria-pressed',String(node===group)));
  const extra = $('#patient-doctor-specialty');
  if (extra) extra.value='';
  filterPatientDoctors();
});
