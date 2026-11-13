'use strict';

function hospitalProfile() {
  return {name:'MNU 333', address:'', phone:'', ...db.hospitalProfile};
}

function isHospitalAdmin() {
  return role === 'admin' && demoSession?.role === 'admin';
}

function hospitalDoctorAdminPage() {
  if (!isHospitalAdmin()) return '';
  const doctors = Object.entries(bookingDirectory());
  const visits = new Map();
  for (const visit of db.visits.filter(v=>v.approved && v.doctor)) visits.set(visit.doctor,(visits.get(visit.doctor)||0)+1);
  return `<section class="card">
      <div class="card-header"><h2>دليل الأطباء <bdi>(${doctors.length})</bdi></h2>
      </div>
      <div class="card-body admin-filters"><input class="input admin-doctor-search" id="admin-doctor-search" type="search" aria-label="البحث في دليل الأطباء" placeholder="الاسم، التخصص أو البريد">
        <select class="input" id="admin-doctor-specialty" aria-label="التخصص"><option value="">كل التخصصات</option>${bookingDepartments().map(d=>`<option>${esc(d)}</option>`).join('')}</select>
        ${link(icon('plus')+' إضافة طبيب','admin-doctor/new','primary')}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>الطبيب</th><th>البريد المهني</th><th>التخصص والعيادة</th><th>المواعيد</th><th>كشوف معتمدة</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>${doctors.map(([name,d]) => `<tr data-admin-doctor="${esc(d.department)}">
          <td><strong>${esc(name)}</strong></td>
          <td><bdi>${esc(d.email || '—')}</bdi></td>
          <td>${esc(d.department)}<br><small>${esc(d.specialty)} · ${esc(d.clinic)} · ${esc(d.location)}</small></td>
          <td>${d.days.map(day => bookingDayNames[day]).join('، ')}<br><bdi>${esc(d.hours[0])}–${esc(d.hours.at(-1))}</bdi></td>
          <td>${adminNumber(visits.get(name)||0)}</td>
          <td>${badge(d.active === false ? 'الحجز موقوف' : 'متاح للحجز',d.active === false ? 'gray' : 'emerald')}</td>
          <td>${link('فتح الملف','admin-doctor/'+encodeURIComponent(name),'secondary small')}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p id="admin-doctor-empty" class="card-body" hidden>لا يوجد طبيب مطابق للبحث.</p>
      <div class="card-body admin-directory-pager">
        <span id="admin-doctor-count" aria-live="polite"></span>
        <div class="admin-quick-links">
          <button class="button secondary small" id="admin-doctor-prev" type="button">السابق</button>
          <button class="button secondary small" id="admin-doctor-next" type="button">التالي</button>
        </div>
      </div>
    </section>`;
}

function hospitalBookingAdminPage(tab) {
  if (!isHospitalAdmin()) return '';
  const appointments = [...db.appointments].sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  const section = ['admissions','referrals'].includes(tab) ? tab : '';
  const tabs = adminTabs('admin-bookings',[['','الحجوزات'],['admissions','التنويم والطوارئ'],['referrals','الإحالات']],section);
  const data = adminOperationalData();
  const body = section === 'admissions' ? adminSection('الأسرة وحالات الإشغال',adminTable(['السرير','الموقع','الحالة'],adminBeds().map(b=>[esc(b.name),esc(adminFacilityPath(b)),esc(adminBedStates[b.state] || '—')]),'لا توجد أسرّة مسجلة.'),link('إدارة الأسرة','admin-facilities','secondary'))+adminLedgerTable('emergency') :
    section === 'referrals' ? adminLedgerTable('referrals') : adminSummary([
      ['في الانتظار الآن',data.waiting.length,'المرضى في قائمة الانتظار'],['حجوزات اليوم',data.todays.length,'كل الحالات'],
      ['حجوزات مؤكدة',appointments.filter(a=>a.status==='مؤكد').length,'الحجوزات المسجلة']
    ])+`<section class="card"><div class="card-header"><h2>قائمة الحجوزات</h2>${button(icon('plus')+' حجز جديد','book','primary')}</div><div class="table-wrap"><table>
      <thead><tr><th>المريض</th><th>الطبيب</th><th>الموعد</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody>${appointments.map(a => `<tr>
        <td>${esc(db.patients.find(p => p.id === a.patient)?.name || a.patient)}</td><td>${esc(a.doctor)}</td>
        <td><bdi>${esc(a.date)} · ${esc(a.time)}</bdi></td>
        <td>${badge(a.status,a.status === 'ملغي' ? 'gray' : 'emerald')}</td>
        <td>${canEditBooking(a) ? button('إلغاء الموعد','cancel-booking','danger small',`data-id="${esc(a.id)}"`) : '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>${appointments.length ? '' : '<p class="quiet-empty">لا توجد حجوزات مسجلة.</p>'}</section>`+adminClinicOperations();
  return adminHeading('admin-bookings','الحجوزات والتنويم والطوارئ والإحالات.')+tabs+body;
}

function adminFormFooter() {
  return `<p class="full" id="admin-form-error" role="alert"></p><div class="booking-form-actions full">
    <button class="button secondary" type="button" data-action="close">إلغاء</button>
    <button class="button primary" type="submit">حفظ</button></div>`;
}

function editHospitalProfile() {
  if (!isHospitalAdmin()) return;
  const profile = hospitalProfile();
  modal('تعديل بيانات المستشفى', `<form id="admin-hospital-form" class="form-grid">
    <label class="field full"><span>اسم المستشفى</span><input class="input" name="name" value="${esc(profile.name)}" maxlength="90" required></label>
    <label class="field full"><span>العنوان</span><input class="input" name="address" value="${esc(profile.address)}" maxlength="180"></label>
    <label class="field full"><span>رقم التواصل</span><input class="input" name="phone" type="tel" dir="ltr" value="${esc(profile.phone)}" maxlength="25"></label>
    ${adminFormFooter()}</form>`);
  $('#admin-hospital-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const data = new FormData(event.currentTarget);
    const name = data.get('name').trim();
    if (!name) { $('#admin-form-error').textContent = 'اكتب اسم المستشفى.'; return; }
    db.hospitalProfile = {name,address:data.get('address').trim(),phone:data.get('phone').trim()};
    log('تحديث بيانات المستشفى',name);
    closeModal();
    shell();
    render();
    toast('تم حفظ بيانات المستشفى.');
  });
}

function clinicTimeInMinutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [hours,minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const normalizeStaffEmail = value => String(value ?? '').trim().toLowerCase();

function editHospitalDoctor(name = '', host = null) {
  if (!isHospitalAdmin()) return;
  const directory = bookingDirectory();
  const doctor = name ? directory[name] : null;
  if (name && !doctor) return;
  const facilities = adminFacilities().filter(item=>item.type==='clinic');
  const basicFields = `<label class="field"><span>اسم الطبيب</span><input class="input" name="name" value="${esc(name)}" maxlength="80" ${doctor?'readonly':''} required></label>
    <label class="field"><span>البريد المهني للطبيب (اختياري)</span><input class="input" type="email" dir="ltr" name="email" autocomplete="off" maxlength="120" value="${esc(doctor?.email || '')}"></label>
    ${field('رقم الهاتف (اختياري)','phone',doctor?.phone,'tel','maxlength="24"')}
    <label class="field"><span>التخصص</span><input class="input" name="department" list="admin-specialties" value="${esc(doctor?.department || '')}" maxlength="70" required></label>
    <datalist id="admin-specialties">${bookingDepartments().map(department => `<option value="${esc(department)}">`).join('')}</datalist>
    <label class="field"><span>المسمّى المهني</span><input class="input" name="specialty" value="${esc(doctor?.specialty || '')}" maxlength="90" required></label>
    ${facilities.length ? adminSelect('عيادة من هيكل المستشفى','facilityId',
      [['','إدخال موقع يدوي'],...facilities.map(item=>[item.id,adminFacilityPath(item)])],doctor?.facilityId||'') : ''}
    <label class="field"><span>اسم العيادة</span><input class="input" name="clinic" value="${esc(doctor?.clinic || '')}" maxlength="80" required></label>
    <label class="field"><span>مكان العيادة</span><input class="input" name="location" value="${esc(doctor?.location || '')}" maxlength="140" required placeholder="المبنى، الدور، رقم العيادة"></label>`;
  const scheduleFields = `<fieldset class="admin-doctor-days full"><legend>أيام العمل</legend>${bookingDayNames.map((day,i) =>
      `<label><input type="checkbox" name="day" value="${i}" ${doctor?.days.includes(i) ? 'checked' : ''}> ${day}</label>`).join('')}</fieldset>
    <label class="field"><span>أول موعد</span><input class="input" name="start" type="time" value="${esc(doctor?.hours[0] || '09:00')}" required></label>
    <label class="field"><span>آخر موعد</span><input class="input" name="end" type="time" value="${esc(doctor?.hours.at(-1) || '12:00')}" required></label>
    <label class="full"><input type="checkbox" name="active" ${doctor?.active !== false ? 'checked' : ''}> متاح للحجز</label>`;
  const content = host ? adminSection('البيانات الأساسية',`<div class="form-grid">${basicFields}</div>`) +
    adminSection('أوقات الحجز',`<div class="form-grid">${scheduleFields}</div>`) +
    `<p id="admin-form-error" role="alert"></p><div class="admin-quick-links"><button type="submit" class="button primary">حفظ الطبيب</button>${link('إلغاء','manage-doctors','secondary')}</div>`
    : basicFields+scheduleFields+adminFormFooter();
  const markup = `<form id="admin-doctor-form" class="${host?'admin-doctor-file':'form-grid'}">${content}</form>`;
  if (host) host.innerHTML=markup;
  else modal(doctor ? 'تعديل الطبيب' : 'إضافة طبيب', markup);
  const form = $('#admin-doctor-form');
  const locationInputs = [form.elements.clinic,form.elements.location];
  const refreshFacility = () => locationInputs.forEach(input=>{input.disabled=!!form.elements.facilityId?.value;});
  form.elements.facilityId?.addEventListener('change',refreshFacility);
  refreshFacility();
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const data = new FormData(event.currentTarget);
    const email = normalizeStaffEmail(data.get('email'));
    const facilityId = data.get('facilityId') || '';
    const facility = facilityBookingFields(facilityId);
    const fields = Object.fromEntries(['name','department','specialty','clinic','location'].map(key => [key,facility[key] || data.get(key)?.trim() || '']));
    const key = name || fields.name;
    const error = $('#admin-form-error');
    const days = data.getAll('day').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day < 7);
    const start = clinicTimeInMinutes(data.get('start'));
    const end = clinicTimeInMinutes(data.get('end'));
    if (Object.values(fields).some(value => !value) || !days.length) { error.textContent = 'أكمل بيانات الطبيب واختر يوم عمل على الأقل.'; return; }
    if (!name && Object.keys(bookingDirectory()).some(existing => existing.normalize('NFKC').trim() === key.normalize('NFKC'))) {
      error.textContent = 'فيه طبيب مسجل بنفس الاسم. افتح بياناته للتعديل.'; return;
    }
    if (email && Object.entries(bookingDirectory()).some(([doctorName,entry]) => doctorName !== key && normalizeStaffEmail(entry.email) === email)) {
      error.textContent = 'البريد المهني ده مسجل لطبيب آخر.';
      return;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || (end-start)%30 !== 0) {
      error.textContent = 'حدد وقت البداية والنهاية بفاصل نصف ساعة بين المواعيد.'; return;
    }
    const hours = [];
    for (let minutes=start; minutes<=end; minutes+=30) hours.push(
      String(Math.floor(minutes/60)).padStart(2,'0') + ':' + String(minutes%60).padStart(2,'0'));
    const {department,specialty,clinic,location} = fields;
    const phone = data.get('phone').trim();
    if (phone && !/^\+?[\d\s()-]{7,24}$/.test(phone)) { error.textContent='أدخل رقم هاتف صالحًا.'; return; }
    const entry = {name:key,email,phone,department,specialty,clinic,location,facilityId,days:[...new Set(days)],hours,active:data.has('active')};
    db.doctorDirectory = [...(db.doctorDirectory || []).filter(item => item.name !== key),entry];
    log(doctor ? 'تعديل بيانات طبيب' : 'إضافة طبيب إلى دليل الحجز',key);
    closeModal();
    if (host && !name) location.hash='admin-doctor/'+encodeURIComponent(key);
    else render();
    toast(doctor ? 'تم تحديث بيانات الطبيب.' : 'تمت إضافة الطبيب إلى دليل الحجز.');
  });
}

function bindAdminDoctorDirectory() {
  const search=$('#admin-doctor-search');
  if (!search) return;
  const specialty=$('#admin-doctor-specialty');
  const previous=$('#admin-doctor-prev'), next=$('#admin-doctor-next');
  const rows=$$('[data-admin-doctor]');
  const pageSize=5;
  let page=0;
  function display() {
    const query=search.value.trim().toLocaleLowerCase('ar');
    const matching=rows.filter(row=>(!specialty.value||row.dataset.adminDoctor===specialty.value) &&
      row.textContent.toLocaleLowerCase('ar').includes(query));
    const start=page*pageSize;
    const visible=new Set(matching.slice(start,start+pageSize));
    for (const row of rows) row.hidden=!visible.has(row);
    $('#admin-doctor-empty').hidden=matching.length>0;
    $('#admin-doctor-count').textContent='عرض '+adminNumber(visible.size)+' من '+adminNumber(matching.length)+' طبيبًا';
    previous.disabled=page===0;
    next.disabled=start+pageSize>=matching.length;
  }
  const filter=()=>{page=0;display();};
  search.addEventListener('input',filter);
  specialty.addEventListener('change',filter);
  previous.addEventListener('click',()=>{page--;display();});
  next.addEventListener('click',()=>{page++;display();});
  display();
}

const RECEPTION_STAFF_KEY = 'clarimed-reception-staff-v1';

function receptionStaff() {
  try {
    const accounts = JSON.parse(localStorage.getItem(RECEPTION_STAFF_KEY));
    return Array.isArray(accounts) ? accounts : [];
  } catch { return []; }
}

function activeReceptionStaff(session) {
  if (session?.role !== 'reception' || !session.staffId) return null;
  return receptionStaff().find(account => account.id === session.staffId &&
    account.active && account.version === session.staffVersion) || null;
}

function hospitalReceptionAdminPage() {
  if (!isHospitalAdmin()) return '';
  const staff = receptionStaff();
  return `<section class="card"><div class="card-header"><h2>فريق الاستقبال <bdi>(${staff.length})</bdi></h2>${button('إضافة موظف استقبال','add-reception-staff','primary')}</div>
    ${staff.length ? `<div class="table-wrap"><table>
      <thead><tr><th>الموظف</th><th>البريد المهني</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody>${staff.map(account => `<tr><td><strong>${esc(account.name)}</strong></td>
        <td><bdi>${esc(account.email)}</bdi></td>
        <td>${badge(account.active ? 'نشط' : 'موقوف',account.active ? 'emerald' : 'gray')}</td>
        <td>${button('تعديل','edit-reception-staff','secondary small',`data-id="${esc(account.id)}" aria-label="تعديل ${esc(account.name)}"`)}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p class="card-body">مفيش موظفين مضافين لسه. استخدم زر «إضافة موظف استقبال».</p>'}</section>`;
}

function editReceptionStaff(id = '') {
  if (!isHospitalAdmin()) return;
  const existing = id ? receptionStaff().find(account => account.id === id) : null;
  if (id && !existing) return;
  modal(existing ? 'تعديل موظف استقبال' : 'إضافة موظف استقبال', `<form id="reception-staff-form" class="form-grid">
    <label class="field full"><span>اسم الموظف</span><input class="input" name="name" maxlength="80" value="${esc(existing?.name || '')}" required></label>
    <label class="field full"><span>البريد المستخدم للدخول</span><input class="input" type="email" dir="ltr" name="email" autocomplete="off" maxlength="120" value="${esc(existing?.email || '')}" required></label>
    ${existing ? '' : '<label class="field full"><span>كلمة مرور حساب العرض</span><input class="input" type="password" name="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>'}
    <label class="full"><input type="checkbox" name="active" ${existing?.active !== false ? 'checked' : ''}> السماح بالدخول من بوابة الاستقبال</label>
    ${adminFormFooter()}</form>`);
  const form = $('#reception-staff-form');
  const error = form.querySelector('#admin-form-error');
  const submit = form.querySelector('[type=submit]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!isHospitalAdmin() || submit.disabled) return;
    const data = new FormData(form);
    const name = data.get('name').trim();
    const email = normalizeStaffEmail(data.get('email'));
    const active = data.has('active');
    const reserved = Object.keys(roles).some(roleId => email === roleId + '@mnu333.demo');
    if (!name || !email || (reserved && normalizeStaffEmail(existing?.email) !== email)) {
      error.textContent = 'اكتب اسم الموظف واستخدم بريدًا مختلفًا عن حسابات العرض الأساسية.';
      return;
    }
    submit.disabled = true;
    try {
      let credentials;
      if (!existing) {
        const password = data.get('password');
        if (password.length < 8 || password.length > 72) {
          error.textContent = 'اكتب كلمة مرور من 8 إلى 72 حرفًا.';
          return;
        }
        const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2,'0')).join('');
        credentials = {salt,hash:await passwordDigest(password,salt)};
      }
      if (!form.isConnected || !isHospitalAdmin()) return;
      const staff = receptionStaff();
      const latest = id ? staff.find(account => account.id === id) : null;
      if (id && (!latest || latest.version !== existing.version)) {
        error.textContent = 'الحساب اتغير. اقفل النموذج وافتحه تاني للمراجعة.';
        return;
      }
      if (staff.some(account => account.id !== id && normalizeStaffEmail(account.email) === email)) {
        error.textContent = 'البريد ده مستخدم لموظف استقبال بالفعل.';
        return;
      }
      const emailChanged = latest && normalizeStaffEmail(latest.email) !== email;
      const account = latest
        ? {...latest,name,email,active,version:latest.version + Number(latest.active !== active || emailChanged)}
        : {id:crypto.randomUUID(),name,email,active,version:1,...credentials};
      localStorage.setItem(RECEPTION_STAFF_KEY,JSON.stringify(latest
        ? staff.map(item => item.id === id ? account : item)
        : [...staff,account]));
      log(latest ? 'تعديل حساب موظف استقبال' : 'إضافة موظف استقبال',name);
      closeModal();
      render();
      toast(emailChanged ? 'تم تحديث البريد. سجّل الدخول بالبريد الجديد وكلمة المرور الحالية.' :
        latest ? 'تم تحديث حساب الاستقبال.' : 'اتضاف الموظف ويقدر يدخل بالبريد وكلمة المرور.');
    } catch {
      error.textContent = 'تعذر حفظ حساب الاستقبال في المتصفح.';
    } finally {
      submit.disabled = false;
    }
  });
}
