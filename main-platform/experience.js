'use strict';

// Presentation and preview navigation. This is not a server authentication layer.
const SESSION_KEY = 'clarimed-preview-session-v2';
const REMEMBER_KEY = 'clarimed-preview-remember-v1';
const DEMO_PASSWORD = 'demo123';
const encoder = new TextEncoder();
async function passwordDigest(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt.match(/.{2}/g), x=>parseInt(x,16)),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
let demoSession = null;
try {
  const candidate = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(REMEMBER_KEY));
  if (candidate && Object.hasOwn(roles, candidate.role) &&
      (!candidate.expiresAt || candidate.expiresAt > Date.now()) &&
      (candidate.role !== 'patient' || db.patients.some(p => p.id === candidate.patientId)) &&
      (!candidate.staffId || activeReceptionStaff(candidate))) {
    demoSession = candidate;
  }
} catch { /* The preview still works without browser storage. */ }
let dayQuery = '';
let dayTab = 'overview';
const dateLabel = 'الجمعة، ٦ نوفمبر ٢٠٢٦';
const shortNav = {
  dashboard: 'اليوم', 'manage-doctors':'إدارة الأطباء', 'manage-reception':'إدارة الاستقبال', 'admin-bookings':'متابعة الحجوزات', consultations:'الكشف', patients: 'المرضى', appointments: 'المواعيد',
  ai: 'النماذج السبعة', documents: 'المستندات', settings: 'الإعدادات',
  queue: 'الاستقبال', audit: 'سجل النشاط'
};
const initials = name => name.split(' ').slice(0, 2).map(x => x[0]).join(' ');
const logo = (subtitle, target) => `<a class="wordmark" href="#${target}"><img class="brand-logo" src="./assets/mnu-university-logo.jpg" alt="شعار جامعة المنصورة الجديدة" /><span class="wordmark-copy"><strong>${esc(hospitalProfile().name)}</strong><span>${subtitle}</span></span></a>`;

function allowAction(action, el) {
  if (['toggle-password', 'toggle-register-password', 'login-help'].includes(action)) return false;
  if (!demoSession || (demoSession.staffId && !activeReceptionStaff(demoSession))) return false;
  if (['close', 'toggle-menu', 'logout', 'notifications'].includes(action)) return true;
  if (['open-security-modal', 'open-tech-stack', 'toggle-heatmap'].includes(action)) return false;
  if (role === 'patient') {
    if (action === 'edit-booking') return db.appointments.some(a => a.id === el.dataset.id && a.patient === demoSession.patientId && canEditBooking(a));
    if (['cancel-booking', 'confirm-cancel'].includes(action)) {
      return db.appointments.some(a => a.id === el.dataset.id && a.patient === demoSession.patientId && canEditBooking(a));
    }
    return ['book','book-doctor','doctor-profile', 'contact', 'attachment-upload', 'attachment-open', 'attachment-filter', 'health-archive-tab'].includes(action);
  }
  if (role === 'radiologist') return ['attachment-upload', 'attachment-open'].includes(action);
  if (role === 'admin') return ['reset','confirm-reset','edit-hospital','add-directory-doctor','edit-directory-doctor','add-reception-staff','edit-reception-staff',
    'admin-add-facility','admin-edit-facility','admin-add-employee','admin-edit-employee','admin-add-stock','admin-edit-stock',
    'admin-export-csv','admin-print-report'].includes(action) ||
    (['cancel-booking','confirm-cancel'].includes(action) && db.appointments.some(a => a.id === el.dataset.id && canEditBooking(a)));
  if (role === 'reception') return ['book','new-patient','confirm-appointment','arrive-appointment',
    'reception-person','reception-card','reception-book-person','reception-print','reception-verify','reception-queue-next'].includes(action) ||
    (['edit-booking','cancel-booking','confirm-cancel'].includes(action) && db.appointments.some(a => a.id === el.dataset.id && canEditBooking(a)));
  if (role === 'doctor') {
    if (['vitals','attachment-upload','attachment-open'].includes(action)) return doctorCanAccess(selected);
    return ['doctor-report','doctor-print','check-service'].includes(action);
  }
  return false;
}

function loginPage(kind) {
  const mode = Object.hasOwn(roles, kind) ? kind : 'patient';
  const isPatient = mode === 'patient';
  const portal = publicPortals.find(item => item.id === (mode === 'radiologist' ? 'doctor' : mode));
  const staffEntry = {
    reception:{welcome:'أهلًا بفريق الاستقبال', headline:'استقبال المرضى<br><em>وتنظيم الزيارات.</em>'},
    admin:{welcome:'أهلًا بفريق الإدارة', headline:'إدارة المستشفى<br><em>ومتابعة النشاط.</em>'}
  }[mode];

  const email = mode === 'doctor' ? 'doctor@mnu333.demo' : mode + '@mnu333.demo';
  document.body.dataset.surface = 'login';
  document.title = (isPatient ? 'دخول المريض' : 'دخول ' + roles[mode]) + ' | MNU 333';
  $('#app').innerHTML = `
    <div class="auth-page ${isPatient ? 'auth-patient' : 'auth-doctor'}">
      <header class="auth-header">
        ${logo('المستشفى والرعاية المتصلة', 'home')}
        <nav class="portal-login-nav" aria-label="اختيار بوابة الدخول">${portalNavigation(mode === 'radiologist' ? 'doctor' : mode)}</nav>
      </header>
      <main class="auth-layout">
        <section class="auth-story" aria-labelledby="auth-story-title">
          <div class="auth-eyebrow">${icon(isPatient ? 'heart' : 'doctor')} ${isPatient ? 'مساحتك الصحية' : 'للرعاية السريرية'}</div>
          <h1 id="auth-story-title">${staffEntry ? staffEntry.headline : isPatient ? 'رعايتك،<br><em>أقرب إليك.</em>' : 'مساحة تركيز.<br><em>لرعاية أدق.</em>'}</h1>
          <p class="auth-description">${staffEntry ? portal.description : isPatient
            ? 'موعدك القادم، وتعليمات طبيبك، ومتابعتك الصحية.<br>كل ما تحتاجه في مكان بسيط وواضح.'
            : 'من أول زيارة إلى اعتماد المتابعة.<br>ملف المريض والفحوصات ومسار الرعاية، أمامك بوضوح.'}</p>
          <div class="auth-benefits">
            ${staffEntry ? `<div class="auth-benefit">${icon(portal.icon)}<div><strong>${portal.title}</strong><p>${portal.description}</p></div></div>` : (isPatient
              ? [['calendar', 'مواعيدك على راحتك', 'احجز موعدًا وتابع تفاصيل زيارتك القادمة.'], ['file', 'تعليمات طبيبك معك', 'ارجع لإرشادات المتابعة التي شاركها طبيبك.'], ['user', 'ملف يخصّك', 'راجع بيانات التواصل ومعلومات ملفك.']]
              : [['users', 'ملف واحد، رؤية أوضح', 'انتقل بين مرضى اليوم وراجع تفاصيل كل زيارة.'], ['brain', 'سبعة نماذج، تحت مراجعتك', 'مساحات مستقلة للأشعة والأنسجة والتقارير والتحاليل.'], ['check', 'قرارك يكمل الرعاية', 'اكتب التقييم، اعتمد الزيارة، وشارك تعليمات المتابعة.']]
            ).map(([i,t,d]) => `<div class="auth-benefit">${icon(i)}<div><strong>${t}</strong><p>${d}</p></div></div>`).join('')}
          </div>
          <div class="auth-story-foot">MNU 333 <span>${isPatient ? 'خطوة بخطوة، مع طبيبك.' : 'رعاية تبدأ بالمعلومة وتنتهي بقرار الطبيب.'}</span></div>
        </section>
        <section class="auth-form-area">
          <div class="login-form-wrap">
            <span class="section-kicker">${mode === 'radiologist' ? roles[mode] : portal?.title || roles[mode]}</span>
            <h2>${staffEntry ? staffEntry.welcome : isPatient ? 'أهلًا بعودتك' : mode==='radiologist' ? 'أهلًا بطبيب الأشعة' : 'أهلًا دكتور'}</h2>
            <p class="login-intro">${staffEntry ? portal.description : isPatient ? 'ادخل لمتابعة مواعيدك وتعليمات الرعاية.' : mode==='radiologist' ? 'أضف صور الأشعة وراجع مرفقات المريض.' : 'ادخل لمتابعة مرضاك وزياراتك.'}</p>
            <form id="login-form">
              <label class="field"><span>${isPatient ? 'رقم الملف أو رقم الهاتف' : 'البريد المهني'}</span>
                <input class="input" id="login-identifier" name="identifier" type="${isPatient ? 'text' : 'email'}" dir="ltr" autocomplete="off" required placeholder="${isPatient ? 'مثال: CL-1024' : email}">
              </label>
              <label class="field"><span>كلمة المرور</span>
                <span class="password-wrap"><input class="input" id="login-password" name="password" type="password" autocomplete="off" required placeholder="أدخل كلمة المرور" dir="ltr">
                  <button type="button" class="password-toggle" data-action="toggle-password" aria-label="إظهار كلمة المرور" aria-pressed="false">${icon('eye')}</button>
                </span>
              </label>
              <div class="login-form-meta"><label class="remember-me"><input type="checkbox" name="remember"><span>تذكرني</span></label><button type="button" class="text-link" data-action="login-help">نسيت كلمة المرور؟</button></div>
              <p id="login-error" class="form-error" role="alert"></p>
              <button type="submit" class="button primary full login-submit">${isPatient ? 'دخول إلى بوابتي' : mode==='radiologist' ? 'دخول إلى مساحة الأشعة' : staffEntry ? 'دخول إلى مساحة العمل' : 'دخول إلى مساحة الطبيب'} ${icon('arrow')}</button>
            </form>
            ${isPatient ? '<p class="register-prompt">مريض جديد؟ <a href="#register">أنشئ حسابك</a></p>' : staffEntry ? '' : '<p class="register-prompt">حساب طبيب جديد؟ يتم تفعيله من إدارة المستشفى.</p>'}
            <p class="demo-explanation">عرض تفاعلي محلي · استخدم بيانات غير حقيقية فقط.</p>
          </div>
        </section>
      </main>
      <footer class="auth-footer"><span>MNU 333 · رعاية متصلة بالإنسان</span><span>عرض تفاعلي · لا تُدخل بيانات طبية حقيقية</span></footer>
    </div>`;
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const identifier = e.target.elements.identifier.value.trim();
    const password = e.target.elements.password.value;
    const professionalEmail = identifier.toLowerCase();
    // Keep the radiology permissions when using the doctor entrance.
    const loginRole = mode === 'doctor' && professionalEmail === 'radiologist@mnu333.demo' ? 'radiologist' : mode;
    const person = isPatient && db.patients.find(p => p.id.toLowerCase() === identifier.toLowerCase() || p.phone === identifier);
    const receptionAccount = mode === 'reception' && receptionStaff().find(account => account.email === professionalEmail);
    const storedCredential = receptionAccount || (isPatient && person && db.credentials?.[person.id]);
    const validPassword = storedCredential ? await passwordDigest(password, storedCredential.salt) === storedCredential.hash : password === DEMO_PASSWORD;
    const authorized = isPatient ? !!person : receptionAccount
      ? !!activeReceptionStaff({role:'reception',staffId:receptionAccount.id,staffVersion:receptionAccount.version})
      : professionalEmail === (loginRole === 'radiologist' ? 'radiologist@mnu333.demo' : email);
    if (!validPassword || !authorized) {
      $('#login-error').textContent = isPatient ? 'راجع رقم الملف أو الهاتف وكلمة المرور.' : 'راجع البريد المهني وكلمة المرور.';
      return;
    }
    demoSession = {role:loginRole,patientId:isPatient ? person.id : null,
      ...(receptionAccount ? {staffId:receptionAccount.id,staffVersion:receptionAccount.version} : {})};
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(demoSession)); } catch {}
    try {
      if (e.target.elements.remember.checked) localStorage.setItem(REMEMBER_KEY, JSON.stringify({...demoSession, expiresAt:Date.now()+30*24*60*60*1000}));
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}
    role = loginRole;
    selected = isPatient ? person.id : 'CL-1024';
    draft = {}; query = ''; dayQuery = ''; dayTab = 'overview';
    e.target.reset();
    location.hash = isPatient ? 'portal' : loginRole === 'radiologist' ? 'documents' : 'dashboard';
  });
}

function registerPage() {
  document.body.dataset.surface = 'login';
  document.title = 'تسجيل مريض جديد | MNU 333';
  $('#modal-root').innerHTML = '';
  $('#app').innerHTML = `
    <div class="auth-page auth-patient register-page">
      <header class="auth-header">
        ${logo('المستشفى والرعاية المتصلة', 'home')}
        <nav class="portal-login-nav" aria-label="تنقل التسجيل">${portalNavigation('patient')}</nav>
      </header>
      <main class="register-layout">
        <section class="register-story" aria-labelledby="register-story-title"><div class="auth-eyebrow">${icon('heart')} مساحتك الصحية</div><h1 id="register-story-title">رعايتك،<br>أقرب إليك.</h1><p>موعدك القادم، وتعليمات طبيبك، ومتابعتك الصحية. كل ما تحتاجه في مكان بسيط وواضح.</p><div class="register-story-benefits">${[['calendar','مواعيدك على راحتك','احجز موعدًا وتابع تفاصيل زيارتك القادمة.'],['file','تعليمات طبيبك معك','ارجع لإرشادات المتابعة التي شاركها طبيبك.'],['user','ملف يخصّك','راجع بيانات التواصل ومعلومات ملفك.']].map(([i,t,d])=>`<div class="auth-benefit">${icon(i)}<div><strong>${t}</strong><p>${d}</p></div></div>`).join('')}</div></section>
        <section class="register-card" aria-labelledby="register-title"><h2 id="register-title">إنشاء حساب جديد</h2><p class="login-intro">سجّل بياناتك مرة واحدة وتابع مواعيدك وتعليمات طبيبك.</p>
          <form id="register-form">
            <label class="field"><span>الاسم الكامل</span><input class="input" name="name" autocomplete="off" minlength="3" maxlength="80" placeholder="كما في بطاقة الهوية" required></label>
            <label class="field"><span>رقم الهاتف</span><input class="input" name="phone" type="tel" dir="ltr" inputmode="numeric" autocomplete="off" pattern="[0-9]{10,15}" title="أدخل من 10 إلى 15 رقمًا" placeholder="01xxxxxxxxx" required></label>
            <label class="field"><span>رقم الملف <small>(اختياري، لو عندك ملف في المستشفى)</small></span><input class="input" name="fileId" dir="ltr" autocomplete="off" pattern="CL-[0-9]+" placeholder="مثال: CL-1024"></label>
            <label class="field"><span>كلمة المرور</span><span class="password-wrap"><input class="input" name="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="8 أحرف على الأقل" required><button type="button" class="password-toggle" data-action="toggle-register-password" aria-label="إظهار كلمة المرور">${icon('eye')}</button></span></label>
            <label class="field"><span>تأكيد كلمة المرور</span><span class="password-wrap"><input class="input" name="confirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="أعد كتابتها" required><button type="button" class="password-toggle" data-action="toggle-register-password" aria-label="إظهار تأكيد كلمة المرور">${icon('eye')}</button></span></label>
            <label class="register-consent"><input type="checkbox" name="localConsent" required><span>أوافق على حفظ بيانات العرض في هذا المتصفح فقط.</span></label>
            <p id="register-error" class="form-error" role="alert"></p>
            <button class="button primary full" type="submit">إنشاء الحساب ${icon('arrow')}</button>
          </form>
          <p class="register-prompt">لديك ملف؟ <a href="#login/patient">تسجيل الدخول</a></p>
        </section>
      </main>
      <footer class="auth-footer"><span>MNU 333 · رعاية متصلة بالإنسان</span><span>عرض تفاعلي محلي · لا تُدخل بيانات طبية حقيقية</span></footer>
    </div>`;
  $('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.elements.name.value.trim().replace(/\s+/g, ' ');
    const phone = form.elements.phone.value.trim();
    const fileId = form.elements.fileId.value.trim().toUpperCase();
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    const error = $('#register-error');
    if (name.length < 3 || name.length > 80 || !/^[0-9]{10,15}$/.test(phone) || password.length < 8 || password.length > 72 || !form.elements.localConsent.checked) {
      error.textContent = 'راجع الاسم والهاتف وكلمة المرور والموافقة على الحفظ المحلي.';
      return;
    }
    if (password !== confirmPassword) {
      error.textContent = 'تأكيد كلمة المرور غير مطابق.';
      return;
    }
    const existing = fileId ? db.patients.find(p => p.id.toUpperCase() === fileId && p.phone === phone) : null;
    if (fileId && !existing) { error.textContent = 'رقم الملف والهاتف غير متطابقين.'; return; }
    if (db.patients.some(p => p.phone === phone) && !existing) { error.textContent = 'رقم الهاتف مسجل بالفعل. استخدم صفحة الدخول.'; return; }
    if (existing && db.credentials?.[existing.id]) { error.textContent = 'هذا الملف لديه حساب بالفعل. استخدم صفحة الدخول.'; return; }
    const newId = existing?.id || 'CL-' + (Math.max(1000, ...db.patients.map(p => Number(p.id.match(/^CL-(\d+)$/)?.[1]) || 0)) + 1);
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const hash = await passwordDigest(password, salt);
    db.credentials ||= {};
    db.credentials[newId] = {salt,hash};
    if (!existing) db.patients.push({id:newId,name,phone,registeredDate:bookingDateKey(new Date()),age:null,gender:'غير مسجل',visit:'زيارة أولى',status:'لم يصل',priority:'لم يُراجع',time:'—',doctor:'لم يُحدد بعد',allergy:'لم تُسجل بيانات الحساسية'});
    role = 'patient';
    log('تسجيل مريض جديد من البوابة', newId);
    demoSession = {role:'patient',patientId:newId};
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(demoSession)); } catch {}
    try { localStorage.removeItem(REMEMBER_KEY); } catch {}
    selected = newId;
    location.hash = 'portal';
    toast('تم إنشاء حسابك. رقم الملف: ' + newId);
  });
}

function shell() {
  clinicalShell();
}

function compactTimeline(p) {
  const visits = db.visits.filter(v => v.patient === p.id).slice().reverse().slice(0, 2);
  return `<ol class="care-timeline">
    <li><strong>${p.status === 'لم يصل' ? 'موعد اليوم' : 'زيارة اليوم'}</strong><time>${dateLabel} · <bdi>${esc(p.time)}</bdi></time><p>${esc(p.visit)}</p></li>
    ${visits.map(v=>`<li><strong>${v.approved ? 'زيارة معتمدة' : 'مسودة زيارة'}</strong><time>${esc(v.date)}</time><p>${esc(v.reason || 'زيارة عيادة الصدر')}</p></li>`).join('')}
    <li><strong>الملف الطبي</strong><time>${esc(p.id)}</time><p>${visits.length ? 'راجع تفاصيل الزيارات السابقة في الملف.' : 'لا توجد زيارات سابقة محفوظة في هذه التجربة.'}</p></li>
  </ol>`;
}

function dashboard() {
  return clinicalDashboard();
}

function portal() {
  const p = patient();
  const directory = bookingDirectory();
  const upcoming = db.appointments.filter(a=>a.patient===p.id && canEditBooking(a)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const next = upcoming[0];
  const appointments = db.appointments.filter(a=>a.patient===p.id).slice().sort((a,b)=>(b.status!=='ملغي')-(a.status!=='ملغي') || (a.date+a.time).localeCompare(b.date+b.time));
  const reports = db.sharedReports.filter(r=>r.patient===p.id).slice().reverse();
  const day = date => Number(date.slice(8,10));
  const month = date => new Date(date+'T12:00:00').toLocaleDateString('ar-EG',{month:'long'});
  const time = value => esc(value || '—');
  return `<div class="patient-home">
    <div class="patient-home-heading"><div><span>أهلًا بعودتك</span><h1>${esc(p.name)}</h1><small>رقم الملف الطبي <bdi>${esc(p.id)}</bdi></small></div>${button(icon('plus')+' إضافة حجز جديد','book','primary patient-add-booking')}</div>
    <nav class="patient-home-services" aria-label="خدمات المريض">${link('الأطباء والتخصصات','patient-doctors','secondary small')}${link('ملفي الطبي','patient-attachments','secondary small')}${link('تعليمات الطبيب','patient-reports','secondary small')}</nav>
    <section class="patient-next-card" aria-label="موعدك القادم">
      ${next ? `<div class="patient-next-details"><span class="patient-date-box"><strong>${day(next.date)}</strong><small>${esc(month(next.date))}</small></span><div><span class="patient-eyebrow">زيارتك القادمة · ${esc(new Date(next.date+'T12:00:00').toLocaleDateString('ar-EG',{weekday:'long'}))}</span><h2>${esc(directory[next.doctor]?.clinic || 'العيادة')}</h2><p>${esc(next.doctor)} · ${esc(next.type)} · <bdi>${time(next.time)}</bdi></p><p>${esc(directory[next.doctor]?.location || '')}</p></div></div>` : `<div class="patient-next-details"><span class="patient-date-box">${icon('calendar')}</span><div><span class="patient-eyebrow">زيارتك القادمة</span><h2>لسه ما عندكش حجز قادم</h2><p>اختَر موعدًا مناسبًا من زر إضافة حجز جديد.</p></div></div>`}
      <p class="patient-visit-note">${icon('info')} ${next ? (next.status === 'بانتظار التأكيد' ? 'الحجز بانتظار تأكيد الاستقبال.' : 'يفضل الحضور قبل الموعد بـ 15 دقيقة، مع إحضار أي فحوصات سابقة.') : 'الحجز الجديد يظهر هنا وفي مواعيدي، والاستقبال يؤكده.'}</p>
      <div class="patient-next-actions">${next ? link('تفاصيل الزيارة','appointments','primary') : button(icon('plus')+' إضافة حجز جديد','book','primary')} ${canEditBooking(next) ? button('تعديل الحجز','edit-booking','secondary',`data-id="${esc(next.id)}"`) : ''}</div>
    </section>
    <div class="patient-home-grid">
      <section class="patient-home-card patient-appointments-card"><div class="patient-card-heading"><h2>مواعيدي</h2><button class="text-link" data-action="book">${icon('plus')} إضافة حجز</button></div>
        <div class="patient-appointment-list">${appointments.length ? appointments.slice(0,4).map(a=>`<div class="patient-appointment-row"><span class="patient-row-date"><strong>${day(a.date)}</strong><small>${esc(month(a.date))}</small></span><div><strong>${esc(directory[a.doctor]?.clinic || 'العيادة')}</strong><small>${esc(a.doctor)} · <bdi>${time(a.time)}</bdi> · ${esc(a.type)}</small></div>${badge(a.status,a.status==='ملغي'?'gray':'emerald')}</div>`).join('') : '<p class="patient-empty">لا توجد مواعيد مسجلة بعد. اضغط «إضافة حجز» للبدء.</p>'}</div>
        <a class="patient-card-more" href="#appointments">عرض كل المواعيد ${icon('arrow')}</a>
      </section>
      <div class="patient-side-cards"><section class="patient-home-card patient-instructions-card"><div class="patient-card-heading"><h2>تعليمات طبيبك</h2><a href="#patient-reports">عرض الكل</a></div>
          ${reports.length ? reports.slice(0,2).map(r=>`<div class="patient-instruction"><span>${icon('check')}</span><p>${esc(r.plan)}</p></div>`).join('') : '<p class="patient-empty">ستظهر هنا تعليمات المتابعة التي يشاركها طبيبك بعد الزيارة.</p>'}</section></div>
    </div>
  </div>`;
}

function patientReports() {
  const reports=db.sharedReports.filter(r=>r.patient===demoSession.patientId).slice().reverse();
  return `${pageHead('تعليمات الطبيب','إرشادات المتابعة التي اعتمدها طبيبك وشاركها معك.','','بوابة المريض')}
    <section class="card"><div class="card-body">${reports.length ? reports.map(r=>`<article class="report-entry"><span class="badge teal">مشاركة من الطبيب</span><time>${esc(r.date)}</time><h2>تعليمات المتابعة</h2><p>${esc(r.instructions || r.plan)}</p></article>`).join('') : empty('لا توجد تعليمات مشاركة بعد','ستظهر تعليمات طبيبك هنا بعد اعتماد الزيارة ومشاركتها معك.',link('مواعيدي','appointments','secondary'))}</div></section>`;
}

function patientProfile() {
  const p=patient();
  return `${pageHead('بياناتي','بيانات ملفك ووسيلة التواصل معك.',button('تعديل الهاتف','contact','primary'),'بوابة المريض')}
    <section class="profile-sheet"><span class="initial-avatar large">${esc(initials(p.name))}</span><h2>${esc(p.name)}</h2><dl class="profile-fields">${[['رقم الملف',p.id],['العمر',p.age?p.age+' سنة':'غير مسجل'],['رقم الهاتف',p.phone],['الطبيب المتابع',p.doctor],['الحساسية المسجلة',p.allergy]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="muted">لتصحيح البيانات الطبية، راجع فريق العيادة.</p></section>`;
}

function ai() {
  return `${pageHead('سبعة نماذج، رؤية أشمل.','اختر الوحدة المناسبة للفحص. كل نتيجة مستقلة وتخضع لمراجعة الطبيب.','','MNU 333 · AI WORKSPACE')}
    <div class="service-note">${icon('info')}<div><strong>النماذج غير متصلة حاليًا</strong><p>يمكنك استعراض المدخلات والمخرجات المطلوبة. لن تُنتج النسخة التجريبية تحليلًا طبيًا.</p></div></div>
    ${modelCards()}`;
}

function modelPage(id) {
  const m=models.find(x=>x.id===id)||models[0];
  activeModel=m.id;
  return `${pageHead(m.name,m.en,link('النماذج السبعة','ai','secondary'),'MNU 333 · '+m.num)}
    <div class="model-context"><label for="model-patient">المريض</label><select id="model-patient">${doctorPatients().map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · ${p.id}</option>`).join('')}</select><span class="badge amber">الخدمة غير متصلة</span></div>
    <div class="model-panels">
      <section class="card"><div class="card-header"><h2>مدخلات الفحص</h2>${icon(m.icon)}</div><div class="card-body"><p>${m.input}</p>
        ${m.types ? `<label class="upload-area"><span class="upload-symbol">${icon('upload')}</span><strong>اختيار ملف الفحص</strong><small>${m.types} · حد أقصى 50 MB للمعاينة</small><input type="file" id="model-file-input" accept="${m.types}"></label><p id="file-upload-status" role="status" class="muted">لم يتم اختيار ملف. لا تُرفع الملفات في هذه النسخة.</p>` : '<div class="service-note">لا توجد تقارير نماذج متاحة للتجميع في هذه التجربة.</div>'}
        ${m.id==='nlp' ? '<label class="field"><span>نص التقرير للمعاينة</span><textarea class="input" rows="5" placeholder="استخدم نصًا تجريبيًا فقط."></textarea></label>' : ''}
        ${button('حالة خدمة التحليل','check-service','secondary')}
      </div></section>
      <section class="card"><div class="card-header"><h2>النتيجة ومراجعة الطبيب</h2></div><div class="card-body">${empty('لا توجد نتيجة تحليل','تظهر النتائج هنا بعد ربط الخدمة وتشغيلها على بيانات الفحص.')}<div class="model-output"><h3>ما الذي سيقدمه النموذج؟</h3><p>${m.output}</p><p class="muted">${m.detail}</p></div></div></section>
    </div>`;
}

function settings() {
  return `${pageHead('إعدادات مساحة العمل','معلومات تجربة MNU 333 وخيارات العرض.','','مساحة العمل')}
    <section class="card"><div class="card-header"><h2>عن هذه النسخة</h2><span class="badge teal">معاينة تفاعلية</span></div><div class="card-body"><p>البيانات مصطنعة وتُحفظ في متصفحك. بوابات الدخول توضح رحلة كل مستخدم، ولا تمثلان نظام تحقق حقيقيًا.</p><p>النماذج الطبية غير متصلة. لا تستخدم هذه النسخة لإدخال معلومات مرضى حقيقية.</p>${role==='admin'?`<div class="admin-quick-links">${link('إدارة بيانات المستشفى','admin-facilities','secondary')}${button('استعادة بيانات التجربة','reset','danger')}</div>`:''}</div></section>`;
}

function render() {
  if (demoSession?.staffId && !activeReceptionStaff(demoSession)) {
    demoSession = null;
    try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(REMEMBER_KEY); } catch {}
    history.replaceState(null,'','#login/reception');
    closeModal();
  }
  const [requested='', id] = location.hash.slice(1).split('/');
  if (requested==='home' || (!requested && !demoSession)) { hospitalHome(); return; }
  if (requested==='register') { registerPage(); return; }
  if (requested==='login' || !demoSession) {
    $('#modal-root').innerHTML='';
    loginPage(requested==='login' ? id : 'patient');
    return;
  }
  role=demoSession.role;
  if (role==='patient') selected=demoSession.patientId;
  const fallback=role==='patient'?'portal':role==='radiologist'?'documents':'dashboard';
  const route=allowed[role].includes(requested)?requested:fallback;
  if (role==='doctor' && route==='appointments') db=readLocalDatabase() || db;
  if (route!==requested) history.replaceState(null,'','#'+route);
  const doctorRecordRoute = role === 'doctor' && ['record','encounter'].includes(route);
  const blockedRecord = doctorRecordRoute && id && !doctorCanAccess(id);
  if (role === 'doctor') {
    if (doctorRecordRoute && id && !blockedRecord) selected=id;
    else if (!doctorCanAccess(selected)) selected=doctorPatients()[0]?.id || '';
  }
  if (!$('.hybrid-shell') || $('.hybrid-shell').dataset.role!==role) shell();
  const pages={dashboard,'manage-doctors':hospitalDoctorAdminPage,'manage-reception':hospitalReceptionAdminPage,'admin-bookings':hospitalBookingAdminPage,consultations:consultationsPage,patients,record,encounter,appointments,queue,ai,documents,portal,audit,settings,'patient-reports':patientReports,'patient-profile':patientProfile,'patient-doctors':patientDoctorsPage,'patient-attachments':patientAttachmentsPage};
  if (role === 'reception') Object.assign(pages, {
    patients:receptionPatientsPage, appointments:receptionBookingsPage,
    'reception-checkin':() => receptionBookingsPage(true), queue:receptionQueuePage,
    'reception-schedule':receptionSchedulePage, 'reception-reports':receptionReportsPage
  });
  if (role === 'doctor') Object.assign(pages, {
    patients:doctorPatientPage, record:doctorRecordPage, appointments:doctorSchedulePage, 'doctor-reports':doctorReportsPage
  });
  if (role === 'admin') Object.assign(pages, {
    'admin-facilities':adminFacilitiesPage,'admin-staff':adminStaffPage,'admin-patients':adminPatientsPage,
    'admin-inventory':adminInventoryPage,'admin-diagnostics':adminDiagnosticsPage,'admin-models':adminModelsPage,'admin-reports':adminReportsPage
  });
  $('#main').dataset.route=route;
  $('#main').innerHTML=blockedRecord?doctorNoPatients():route==='model'?modelPage(id):(pages[route]||dashboard)();
  const title=(role === 'reception' && receptionTitles[route])||(role === 'doctor' && doctorTitles[route])||(role === 'admin' && adminTitles[route])||shortNav[route]||({portal:'ملخص رعايتي','patient-reports':'تعليمات الطبيب','patient-profile':'بياناتي','patient-doctors':'الأطباء والتخصصات',record:'ملف المريض',encounter:'الزيارة',model:'النماذج السبعة'})[route];
  document.title=(title||'مساحة الرعاية')+' | MNU 333';
  $$('[data-nav]').forEach(a=>{
    const active=a.dataset.nav===route || (a.dataset.nav==='patients'&&['record','encounter'].includes(route)) || (a.dataset.nav==='ai'&&route==='model');
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  $('#sidebar')?.classList.remove('open');
  $('.menu-trigger')?.setAttribute('aria-expanded','false');
  bindPage();
  bindWorkspace();
  if (role === 'reception') bindReceptionPage();
  if (role === 'doctor') bindDoctorPortal(route);
  if (role === 'admin') bindAdminWorkspace();
  if (bookingAfterLogin && role === 'patient') { bookingAfterLogin=false; book(); }
  $('#day-search')?.addEventListener('input',e=>{
    const pos=e.target.selectionStart;dayQuery=e.target.value;render();
    $('#day-search').focus();$('#day-search').setSelectionRange(pos,pos);
  });
}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action;
  if(action==='toggle-password'){
    const input=$('#login-password');const show=input.type==='password';
    input.type=show?'text':'password';el.setAttribute('aria-pressed',String(show));
    el.setAttribute('aria-label',show?'إخفاء كلمة المرور':'إظهار كلمة المرور');
  }
  if(action==='toggle-register-password'){
    const input=el.parentElement.querySelector('input');const show=input.type==='password';
    input.type=show?'text':'password';el.setAttribute('aria-pressed',String(show));
    el.setAttribute('aria-label',(show?'إخفاء ':'إظهار ')+(input.name==='confirmPassword'?'تأكيد كلمة المرور':'كلمة المرور'));
  }
  if(action==='login-help'){
    modal('مساعدة في الدخول','<p>لحساب العرض: المريض <bdi>CL-1024</bdi>، الطبيب <bdi>doctor@mnu333.demo</bdi>، الأشعة <bdi>radiologist@mnu333.demo</bdi>، الاستقبال <bdi>reception@mnu333.demo</bdi>، إدارة المستشفى <bdi>admin@mnu333.demo</bdi>. كلمة المرور <bdi>demo123</bdi>.</p><p>إذا نسيت كلمة مرور حساب أنشأته هنا، لا تتوفر استعادة آمنة في هذه المعاينة المحلية. لا تستخدم بيانات حقيقية.</p>',button('فهمت','close-login','primary'));
  }
  if(action==='close-login' || (action==='close'&&!demoSession))closeModal();
  if(action==='logout'&&demoSession){
    const loginRole=demoSession.role;demoSession=null;
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    try{localStorage.removeItem(REMEMBER_KEY);}catch{}
    closeModal();draft={};lastDoctorRecord='';adminPeriod='daily';adminPatientQuery='';adminAgeFilter='';adminClinicFilter='';doctorVisitDate='';doctorScheduleDate='';doctorScheduleDay='';patientFilter='';bookingAfterLogin=false;query='';dayQuery='';patientArchiveKind='all';patientArchiveQuery='';patientHealthTab='overview';selected='CL-1024';
    location.hash='login/'+loginRole;
  }
  if(!demoSession)return;
  if(action==='select-patient'&&role==='doctor'&&doctorCanAccess(el.dataset.id)){
    selected=el.dataset.id;dayTab='overview';render();
  }
  if(action==='desk-tab'&&role==='doctor'){dayTab=el.dataset.tab;render();}
});

render();

window.addEventListener('storage', event => {
  if (event.key === LOCAL_DATABASE_KEY && demoSession?.role === 'doctor' && location.hash === '#appointments') render();
  if ((event.key === RECEPTION_STAFF_KEY || event.key === null) && demoSession?.staffId && !activeReceptionStaff(demoSession)) render();
});
