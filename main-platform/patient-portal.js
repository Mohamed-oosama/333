'use strict';

function patientDoctorCard(name,doctor) {
  const available = firstBookingDay(name,demoSession.patientId);
  return `<article class="patient-home-card patient-directory-card" data-doctor-department="${esc(doctor.department)}"
    data-doctor-search="${esc([name,doctor.specialty,doctor.clinic,doctor.branch,doctor.location].filter(Boolean).join(' '))}">
    <div class="patient-directory-person"><span class="patient-directory-avatar" aria-hidden="true">${esc(initials(name.replace(/^د\.\s*/,'')))}</span>
      <div><h2>${esc(name)}</h2><p>${esc(doctor.specialty)}</p></div></div>
    <p>${esc([doctor.clinic,doctor.branch,doctor.location].filter(Boolean).join(' · '))}</p>
    <p>أيام العمل: ${doctor.days.map(day => bookingDayNames[day]).join('، ')}</p>
    <p>أقرب يوم متاح: ${available ? esc(healthArchiveDateLabel(available)) : 'لا توجد أوقات متاحة خلال 4 أسابيع'}</p>
    ${button('عرض الملف التعريفي','doctor-profile','secondary small',`data-id="${esc(name)}"`)}
    ${button('احجز موعدًا','book-doctor','primary small',`data-id="${esc(name)}"`)}
  </article>`;
}

function patientDoctorsPage() {
  const doctors = Object.entries(bookingDirectory()).filter(([,doctor]) => doctor.active !== false);
  return `${pageHead('الأطباء والتخصصات','ابحث عن الطبيب وتعرّف على العيادة قبل الحجز.','','بوابة المريض')}
    <div class="patient-directory-filters">
      <label class="field"><span>البحث</span><input class="input" id="patient-doctor-query" type="search" placeholder="اسم الطبيب أو العيادة"></label>
      <label class="field"><span>التخصص</span><select class="input" id="patient-doctor-specialty"><option value="">كل التخصصات</option>
        ${bookingDepartments().map(department => `<option>${esc(department)}</option>`).join('')}</select></label>
    </div>
    <div class="patient-directory-grid">${doctors.map(([name,doctor])=>patientDoctorCard(name,doctor)).join('')}</div>
    <p id="patient-doctor-empty" class="patient-empty" ${doctors.length ? 'hidden' : ''}>لا يوجد أطباء مطابقون لاختيارك.</p>`;
}

function showPatientDoctorProfile(name) {
  if (role !== 'patient' || demoSession?.role !== 'patient') return;
  const doctor = bookingDirectory()[name];
  if (!doctor || doctor.active === false) return;
  const date = firstBookingDay(name,demoSession.patientId);
  const times = date ? availableBookingTimes(name,demoSession.patientId,date) : [];
  modal(esc(name), `<div class="booking-clinic-info">
    <strong>${esc(doctor.specialty)}</strong>
    <span>${esc([doctor.clinic,doctor.branch,doctor.location].filter(Boolean).join(' · '))}</span>
    <span>أيام العمل: ${doctor.days.map(day => bookingDayNames[day]).join('، ')}</span>
    <span>ساعات العيادة: <bdi>${esc(doctor.hours[0])}–${esc(doctor.hours.at(-1))}</bdi></span>
    <span>${date ? 'أقرب يوم متاح: ' + esc(healthArchiveDateLabel(date)) + ' · ' + times.map(time => '<bdi>'+esc(time)+'</bdi>').join('، ') : 'لا توجد أوقات متاحة خلال 4 أسابيع.'}</span>
  </div>`,button('احجز مع الطبيب','book-doctor','primary',`data-id="${esc(name)}"`));
}

function filterPatientDoctors() {
  const query = ($('#patient-doctor-query')?.value || '').trim().toLocaleLowerCase('ar');
  const specialty = $('#patient-doctor-specialty')?.value || '';
  const cards = [...document.querySelectorAll('[data-doctor-department]')];
  for (const card of cards) {
    card.hidden = (specialty && card.dataset.doctorDepartment !== specialty) ||
      !card.dataset.doctorSearch.toLocaleLowerCase('ar').includes(query);
  }
  $('#patient-doctor-empty').hidden = cards.some(card=>!card.hidden);
}

document.addEventListener('input', event => {
  if (event.target.id === 'patient-doctor-query') filterPatientDoctors();
});
document.addEventListener('change', event => {
  if (event.target.id === 'patient-doctor-specialty') filterPatientDoctors();
});
