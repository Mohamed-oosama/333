'use strict';

// Presentation adapted to the user's hospital dashboard references.
let registryDoctor = '';
let registryTab = 'overview';
let sidebarCollapsed = false;
let bookingAfterLogin = false;
const DEMO_TODAY = '2026-11-06';
const stateTone = p => p.status === 'مكتملة' ? 'emerald' : p.status === 'قيد الزيارة' ? 'sky' : p.status === 'لم يصل' ? 'gray' : 'amber';
const personAvatar = (p, large = false) => `<span class="person-avatar ${large ? 'large' : ''} tone-${db.patients.findIndex(x => x.id === p.id) % 5}" aria-hidden="true">${esc(p.name.split(' ').slice(0,2).map(s=>s[0]).join(''))}</span>`;
const doctorPhoto = () => '<img class="doctor-photo" src="./assets/doctor-avatar.png" alt="" width="36" height="36">';
const metric = (label, value, glyph, tone, note) => `<article class="metric-card ${tone}"><span class="metric-symbol">${icon(glyph)}</span><div><span>${label}</span><strong>${value}</strong></div><small>${note}</small></article>`;

const publicPortals = [
  {id:'patient', title:'بوابة المرضى', icon:'user', description:'حجز المواعيد ومتابعة الزيارات والأرشيف.'},
  {id:'doctor', title:'بوابة الأطباء', icon:'doctor', description:'متابعة المرضى وتسجيل الزيارات والفحوصات.'},
  {id:'reception', title:'بوابة الاستقبال', icon:'calendar', description:'تسجيل وصول المرضى وتنظيم المواعيد والفرز.'},
  {id:'admin', title:'إدارة المستشفى', icon:'shield', description:'مراجعة سجل النشاط وإعدادات مساحة الإدارة.'}
];

function portalNavigation(current = '', showIcons = false) {
  return publicPortals.map(({id,title,icon:glyph}) =>
    `<a href="#login/${id}" ${current === id ? 'aria-current="page"' : ''}>${showIcons ? icon(id === 'reception' ? 'file' : glyph) : ''}<span>${title}</span></a>`).join('');
}

function hospitalHome() {
  const hospital = hospitalProfile();
  const name = esc(hospital.name);
  const steps = [
    ['ادخل إلى بوابتك','ملفك ومواعيدك مرتبطان بحسابك.'],
    ['اختر موعدك','حدد الطبيب والتاريخ والوقت.'],
    ['تابع زيارتك','راجع الحجز وتعليمات المتابعة.']
  ];
  const portalLabels = {patient:'للمرضى',doctor:'للأطباء',reception:'لفريق الاستقبال',admin:'للإدارة'};
  document.body.dataset.surface='hospital';
  document.title=hospital.name;
  $('#modal-root').innerHTML='';
  $('#app').innerHTML=`<div class="hospital-landing">
    <header class="landing-header">
      <a class="landing-brand" href="#home"><img class="brand-logo" src="./assets/mnu-university-logo.jpg" alt="شعار جامعة المنصورة الجديدة">
        <strong>${name}</strong></a>
      <nav class="landing-nav" aria-label="تنقل المستشفى">
        <a href="#home" aria-current="page">${icon('grid')} الرئيسية</a>
        ${publicPortals.map(({id,title,icon:glyph})=>`<a href="#login/${id}">${icon(glyph)} ${title}</a>`).join('')}
      </nav>
    </header>
    <main class="landing-main">
      <div class="landing-hero">
        <section class="landing-intro" aria-labelledby="landing-title">
          <p class="landing-kicker">مرحبًا بك في ${name}</p>
          <h1 id="landing-title">رعاية تبدأ <span>بموعد،</span><br>وتستمر معك.</h1>
          <p class="landing-lead">احجز زيارتك، تابع مواعيدك، وراجع تعليمات طبيبك من مكان واحد.</p>
          <div class="landing-actions">
            ${button('احجز موعدك الآن <span class="landing-arrow">'+icon('arrow')+'</span>','public-book','landing-gold')}
            ${link(icon('calendar')+' لديك حجز؟ تابع مواعيدك',demoSession?.role==='patient'?'appointments':'login/patient','landing-outline')}
          </div>
          <p class="landing-hint">اختر بوابتك حسب دورك من القائمة بالأسفل.</p>
          ${hospital.address || hospital.phone ? `<p class="landing-contact">${[hospital.address,hospital.phone].filter(Boolean).map(value=>`<bdi>${esc(value)}</bdi>`).join(' · ')}</p>` : ''}
        </section>
        <section class="landing-guide" aria-labelledby="landing-guide-title">
          <p class="landing-kicker">${icon('calendar')} زيارتك القادمة</p>
          <h2 id="landing-guide-title">خطوتك الأولى للرعاية</h2>
          <p>اختر الطبيب والوقت المناسب من المواعيد المتاحة في بوابتك.</p>
          <ol>${steps.map(([title,description],index)=>`<li>
            <span class="landing-step-number" aria-hidden="true">0${index+1}</span>
            <div><strong>${title}</strong><small>${description}</small></div>
          </li>`).join('')}</ol>
        </section>
      </div>
      <section class="landing-portals" aria-labelledby="landing-portals-title">
        <h2 id="landing-portals-title">بوابات المستشفى</h2>
        <p>اختر البوابة المناسبة لدورك للدخول إلى مساحتك.</p>
        <div class="landing-portal-grid">${publicPortals.map(({id,title,icon:glyph,description})=>`
          <article class="landing-portal">
            <div class="landing-portal-meta"><span class="landing-portal-icon">${icon(glyph)}</span><span class="landing-portal-role">${portalLabels[id]}</span></div>
            <h3>${title}</h3><p>${description}</p>
            <a class="button landing-portal-link" href="#login/${id}" aria-label="ادخل البوابة · ${title}">ادخل البوابة <span class="landing-arrow">${icon('arrow')}</span></a>
          </article>`).join('')}</div>
      </section>
    </main>
    <footer class="landing-footer"><strong>${name}</strong><span>نسخة تفاعلية تجريبية · بيانات مصطنعة · خدمات النماذج غير متصلة</span></footer>
  </div>`;
}

function clinicalShell() {
  const personal = role === 'patient';
  if (personal) { patientShell(); return; }
  const items = role === 'admin' ? adminNavGroups.flatMap(([,links])=>links) : role === 'reception' ? receptionNavigation : personal
    ? [['portal','grid','الرئيسية'],['appointments','calendar','مواعيدي'],['patient-reports','file','تعليمات الطبيب'],['patient-profile','user','بياناتي']]
    : navs.filter(n=>allowed[role].includes(n[0])).map(([r,i,label])=>[r,i,(role==='reception'&&receptionTitles[r])||(role==='doctor'&&doctorTitles[r])||(role==='admin'&&adminTitles[r])||({dashboard:'لوحة العمل',consultations:'الكشف',patients:'المرضى',appointments:'المواعيد',queue:'الاستقبال والفرز',ai:'النماذج السبعة',documents:role==='radiologist'?'مساحة الأشعة':'الفحوصات والمستندات',audit:'سجل النشاط',settings:'الإعدادات','manage-doctors':'إدارة الأطباء','manage-reception':'إدارة الاستقبال','admin-bookings':'متابعة الحجوزات'})[r]||label]);
  const person = personal ? patient() : null;
  const name = personal ? person.name : role === 'doctor' ? 'د. سارة أحمد' : activeReceptionStaff(demoSession)?.name || roles[role];
  const home = personal ? 'portal' : role==='radiologist' ? 'documents' : 'dashboard';
  document.body.dataset.surface = personal ? 'patient' : 'clinical';
  $('#app').innerHTML = `<div class="app-shell hybrid-shell clinical-shell ${sidebarCollapsed?'side-collapsed':''}" data-role="${role}">
    <aside id="sidebar" class="clinical-sidebar" aria-label="القائمة الرئيسية">
      <a class="hospital-brand" href="#${home}"><img class="brand-logo" src="./assets/mnu-university-logo.jpg" alt="شعار جامعة المنصورة الجديدة" /><span class="side-label"><strong>${esc(hospitalProfile().name)}</strong>${['admin','reception'].includes(role)?'':'<small>المستشفى والرعاية المتصلة</small>'}</span></a>
      ${role === 'admin' ? adminNavigation() : `<div class="side-section side-label">${role==='reception'?'بوابة الاستقبال':'مساحة العمل'}</div>
      <nav class="clinical-nav">${items.map(([r,i,t])=>`<a href="#${r}" data-nav="${r}" title="${t}">${icon(i)}<span class="side-label">${t}</span>${r==='ai'?'<b class="nav-count side-label">7</b>':''}</a>`).join('')}</nav>`}
      <div class="sidebar-bottom"><div class="sidebar-profile">${role==='admin'?icon('shield'):role==='reception'?icon('user'):personal?personAvatar(person):doctorPhoto()}<div class="side-label"><strong>${esc(name)}</strong><small>${role==='radiologist'?'قسم الأشعة':personal?'ملفك الصحي':role==='admin'?'إدارة المستشفى':role==='reception'?'فريق الاستقبال':'عيادة أمراض الصدر'}</small></div></div>
        ${role==='reception'?'<a class="reception-settings" href="#settings">الإعدادات</a>':`<button class="sidebar-collapse" data-action="collapse-sidebar" aria-label="تصغير القائمة" aria-expanded="${!sidebarCollapsed}">${icon('chevron')}<span class="side-label">تصغير القائمة</span></button>`}
        <button class="sidebar-exit" data-action="logout">${icon('logout')}<span class="side-label">تسجيل الخروج</span></button>
      </div>
    </aside>
    <button class="sidebar-scrim" data-action="toggle-menu" aria-label="إغلاق القائمة"></button>
    <div class="workspace clinical-workspace">
      <header class="clinical-topbar"><div class="topbar-heading"><button class="icon-btn menu-trigger" data-action="toggle-menu" aria-label="القائمة" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button><div><h1 id="workspace-title">${role==='radiologist'?'مساحة الأشعة':'مساحة الطبيب'}</h1><p id="workspace-subtitle">${dateLabel}</p></div></div>
        ${role==='admin'?adminSearchBar():role==='radiologist'?'':`<form id="global-search" class="global-search">${icon('search')}<input aria-label="بحث عام عن مريض" placeholder="ابحث بالاسم، رقم الملف أو الهاتف" value=""><kbd>Ctrl K</kbd></form>`}
        <div class="topbar-tools"><span class="locale-label">العربية</span><button class="icon-btn notification-trigger" data-action="workspace-notifications" aria-label="الإشعارات" aria-expanded="false">${icon('bell')}${role!=='reception'&&!personal&&db.audit.length?'<span class="notification-dot"></span>':''}</button><div class="topbar-profile">${role==='admin'?icon('shield'):role==='reception'?icon('user'):personal?personAvatar(person):doctorPhoto()}<div><strong>${esc(name)}</strong><small>${role==='radiologist'?'قسم الأشعة':personal?'بوابة المريض':role==='admin'?'إدارة المستشفى':role==='reception'?'فريق الاستقبال':'طبيب أمراض الصدر'}</small></div></div></div>
      </header>
      <main id="main" tabindex="-1"></main>
      <footer class="app-footer"><span>MNU 333 · الرعاية تبدأ بمعلومة واضحة</span><span>نسخة تجريبية · بيانات مصطنعة · النماذج غير متصلة</span></footer>
      <nav class="mobile-bottom" aria-label="التنقل السريع">${(role==='admin'?items.filter(i=>['dashboard','admin-facilities','admin-bookings','admin-reports'].includes(i[0])):role==='radiologist'||role==='reception'?items:items.filter(i=>['dashboard','patients','appointments','ai'].includes(i[0]))).slice(0,4).map(([r,i,t])=>`<a href="#${r}" data-nav="${r}">${icon(i)}<span>${t}</span></a>`).join('')}</nav>
    </div>
  </div>`;
  $('#global-search')?.addEventListener('submit',e=>{e.preventDefault();query=e.target.querySelector('input').value.trim();patientFilter='';registryDoctor='';if(location.hash==='#patients')render();else location.hash='patients';});
}

function patientShell() {
  const p = patient();
  const items = [['portal','grid','الرئيسية'],['appointments','calendar','مواعيدي'],['patient-reports','file','تعليمات الطبيب','التعليمات'],['patient-attachments','upload','أرشيفي الطبي','أرشيفي'],['patient-profile','user','ملفي']];
  document.body.dataset.surface = 'patient';
  $('#app').innerHTML = `<div class="patient-shell hybrid-shell" data-role="patient">
    <header class="patient-header clinical-topbar">
      <a class="patient-brand" href="#portal"><img class="brand-logo" src="./assets/mnu-university-logo.jpg" alt="شعار جامعة المنصورة الجديدة"><span><strong>${esc(hospitalProfile().name)}</strong><small>بوابة المريض</small></span></a>
      <nav class="patient-nav" aria-label="تنقل بوابة المريض">${items.map(([r,i,t])=>`<a href="#${r}" data-nav="${r}">${icon(i)}<span>${t}</span></a>`).join('')}</nav>
      <div class="patient-header-profile"><span class="patient-info-mark" aria-hidden="true">${icon('user')}</span><span><strong>${esc(p.name)}</strong><small><bdi>${esc(p.id)}</bdi></small></span></div>
      <button class="patient-logout" data-action="logout" aria-label="تسجيل الخروج" title="تسجيل الخروج">${icon('logout')}</button>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="patient-footer">MNU 333 · بيانات عرض محلية · لا تُدخل بيانات طبية حقيقية</footer>
    <nav class="mobile-bottom" aria-label="تنقل الهاتف">${items.map(([r,i,t,short])=>`<a href="#${r}" data-nav="${r}" aria-label="${t}">${icon(i)}<span>${short || t}</span></a>`).join('')}</nav>
  </div>`;
}

function patientFacts(p) {
  return `<dl class="patient-facts">${[['رقم الملف',p.id],['العمر / النوع',(p.age?p.age+' سنة':'غير مسجل')+' · '+(p.gender||'غير مسجل')],['رقم الهاتف',p.phone],['الطبيب المعالج',p.doctor],['نوع الزيارة',p.visit],['الحساسية',p.allergy]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'غير مسجل')}</dd></div>`).join('')}</dl>`;
}

function vitalSummary(p) {
  const v=db.vitals[p.id];
  return `<div class="mini-vitals"><h3>العلامات الحيوية</h3>${v?`<dl>${[['ضغط الدم',v.pressure,'mmHg'],['النبض',v.pulse,'bpm'],['الحرارة',v.temp,'°C'],['الأكسجين',v.spo2,'%']].map(([k,val,u])=>`<div><dt>${k}</dt><dd><bdi>${esc(val||'—')}</bdi> <small>${u}</small></dd></div>`).join('')}</dl>`:'<p class="quiet-empty">لم تُسجّل العلامات بعد.</p>'}${role==='doctor'?button(icon('plus')+' تسجيل العلامات','vitals','text-link small'):''}</div>`;
}

function historyList(p) {
  const visits=db.visits.filter(v=>v.patient===p.id).slice().reverse();
  return `<div class="medical-history"><h3>مسار الزيارات</h3><ol><li><span class="history-point">${icon('calendar')}</span><div><strong>زيارة اليوم · ${esc(p.visit)}</strong><small>${dateLabel} · <bdi>${esc(p.time)}</bdi></small><p>${esc(p.doctor)}</p></div>${badge(p.status,stateTone(p))}</li>${visits.slice(0,3).map(v=>`<li><span class="history-point ${v.approved?'approved':''}">${icon(v.approved?'check':'file')}</span><div><strong>${v.approved?'زيارة معتمدة':'مسودة محفوظة'}</strong><small>${esc(v.date)}</small><p>${esc(v.reason||'زيارة عيادة')}</p></div>${link('عرض','record/'+p.id,'ghost small')}</li>`).join('')}</ol>${!visits.length?'<p class="quiet-empty">لا توجد زيارات سابقة محفوظة.</p>':''}</div>`;
}

function detailPanel(p, mode='dashboard') {
  const tab=mode==='registry'?registryTab:dayTab;
  const visits=db.visits.filter(v=>v.patient===p.id);
  const orders=db.orders.filter(o=>o.patient===p.id);
  return `<section class="workspace-panel patient-overview" aria-label="ملخص المريض المحدد">
    <div class="patient-overview-head">${personAvatar(p,true)}<div><div class="patient-title-line"><h2>${esc(p.name)}</h2>${badge(p.status,stateTone(p))}</div><p><bdi>${esc(p.id)}</bdi> · ${p.age} سنة · ${esc(p.gender||'')}</p><small>${icon('phone')} <bdi>${esc(p.phone)}</bdi></small></div></div>
    <div class="patient-tabs" role="tablist" aria-label="معلومات المريض">${[['overview','نظرة عامة'],['history','الزيارات'],['orders','الفحوصات']].map(([id,t])=>`<button role="tab" aria-selected="${tab===id}" data-action="patient-panel-tab" data-mode="${mode}" data-tab="${id}" class="${tab===id?'active':''}">${t}</button>`).join('')}</div>
    <div class="patient-overview-content">${tab==='overview'?`${mode==='registry'?`<div class="record-counters"><div><strong>${visits.length}</strong><small>زيارات محفوظة</small></div><div><strong>${orders.length}</strong><small>طلبات فحص</small></div><div><strong>${db.sharedReports.filter(r=>r.patient===p.id).length}</strong><small>تعليمات مشتركة</small></div></div>`:''}<div class="patient-data-grid">${patientFacts(p)}${vitalSummary(p)}</div>${historyList(p)}`:tab==='history'?historyList(p):`<h3>طلبات الفحوصات</h3>${orders.length?orders.map(o=>`<div class="order-line">${icon('flask')}<div><strong>${esc(o.type)}</strong><small>${esc(o.date)}</small></div>${badge('طلب مسجل','sky')}</div>`).join(''):'<p class="quiet-empty">لا توجد طلبات فحص مسجلة لهذا المريض.</p>'}<div class="service-note">${icon('info')} نتائج النماذج ستظهر بعد ربط الخدمة.</div>`}</div>
    <div class="panel-bottom">${role==='doctor'?link('عرض الملف الكامل '+icon('arrow'),'record/'+p.id,'text-link'):''}${mode==='registry'&&role==='doctor'?link('بدء زيارة','encounter/'+p.id,'primary small'):''}${role==='reception'?button('تسجيل وصول / فرز','checkin','primary small',`data-id="${p.id}"`):''}</div>
  </section>`;
}

function activityList() {
  return db.audit.length?db.audit.slice(0,3).map(a=>`<div class="activity-item"><span>${icon('file')}</span><div><strong>${esc(a.action)}</strong><small>${esc(a.resource)} · ${esc(a.time)}</small></div></div>`).join(''):'<div class="quiet-empty">لا يوجد نشاط مسجل بعد.<br>تظهر هنا آخر التحديثات المحفوظة.</div>';
}

function clinicalDashboard() {
  if(role==='reception')return receptionOverview();
  if(role==='admin')return adminDashboardPage();
  return doctorDashboard();
}

function patientRegistry() {
  const list=db.patients.filter(p=>[p.name,p.id,p.phone].some(v=>String(v).toLowerCase().includes(query.toLowerCase()))&&(!patientFilter||p.status===patientFilter)&&(!registryDoctor||p.doctor===registryDoctor));
  return `<section class="registry-toolbar workspace-panel"><label class="registry-search"><span>البحث عن مريض</span><div>${icon('search')}<input id="patient-search" aria-label="البحث عن مريض" placeholder="الاسم، رقم الملف أو الهاتف" value="${esc(query)}"></div></label><label><span>الطبيب المعالج</span><select id="registry-doctor" class="input"><option value="">كل الأطباء</option>${[...new Set(db.patients.map(p=>p.doctor))].map(d=>`<option ${d===registryDoctor?'selected':''}>${esc(d)}</option>`).join('')}</select></label><label><span>الحالة</span><select id="patient-filter" class="input"><option value="">كل الحالات</option>${['بانتظار الطبيب','بانتظار الفرز','قيد الزيارة','لم يصل','مكتملة'].map(s=>`<option ${s===patientFilter?'selected':''}>${s}</option>`).join('')}</select></label>${button(icon('plus')+' مريض جديد','new-patient','primary small')}</section>
    <div class="registry-layout"><section class="workspace-panel registry-table-panel"><div class="panel-title"><h2>قائمة المرضى <span class="muted">(${list.length})</span></h2><button class="text-link" data-action="clear-patient-filters">إعادة ضبط الفلاتر</button></div><div class="registry-table-scroll"><table class="registry-table"><thead><tr><th>المريض</th><th>رقم الملف</th><th>العمر</th><th>موعد اليوم</th><th>الطبيب</th><th>الحالة</th></tr></thead><tbody>${list.map(p=>`<tr class="${selected===p.id?'selected':''}"><td><button class="registry-person" data-action="registry-select" data-id="${p.id}">${personAvatar(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.phone)}</small></span></button></td><td><bdi>${p.id}</bdi></td><td>${p.age}<small>${esc(p.gender||'')}</small></td><td><bdi>${p.time}</bdi><small>${esc(p.visit)}</small></td><td>${esc(p.doctor)}</td><td>${badge(p.status,stateTone(p))}</td></tr>`).join('')}</tbody></table>${!list.length?'<div class="quiet-empty">لا توجد نتائج مطابقة. جرّب تعديل البحث أو الفلاتر.</div>':''}</div><div class="panel-bottom"><span>عرض ${list.length} من ${db.patients.length} مرضى</span><span class="badge gray">بيانات تجريبية</span></div></section>${detailPanel(patient(),'registry')}</div>`;
}

function bindWorkspace() {
  const route=$('#main')?.dataset.route;
  const titles={dashboard:role==='doctor'?'مساحة الطبيب':role==='admin'?'إدارة المستشفى':'لوحة العمل',consultations:'الكشف',patients:'إدارة المرضى',record:'ملف المريض',encounter:'الزيارة السريرية',appointments:role==='patient'?'مواعيدي':'المواعيد',ai:'النماذج السبعة',model:'مساحة التحليل',documents:role==='radiologist'?'مساحة الأشعة':'الفحوصات والمستندات',portal:'بوابة المريض','patient-reports':'تعليمات الطبيب','patient-attachments':'مرفقاتي','patient-profile':'بياناتي',settings:'الإعدادات',queue:'الاستقبال والفرز',audit:'سجل النشاط','manage-doctors':'إدارة الأطباء','manage-reception':'إدارة الاستقبال','admin-bookings':'متابعة الحجوزات'};
  const adminDashboard=role==='admin' && route==='dashboard';
  if($('#workspace-title'))$('#workspace-title').textContent=adminDashboard?'إدارة المستشفى':(role==='reception'&&receptionTitles[route])||(role==='doctor'&&doctorTitles[route])||(role==='admin'&&adminTitles[route])||titles[route]||'MNU 333';
  if($('#workspace-subtitle'))$('#workspace-subtitle').textContent=adminDashboard?'':route==='dashboard'?dateLabel:'الرئيسية / '+((role==='reception'&&receptionTitles[route])||(role==='doctor'&&doctorTitles[route])||(role==='admin'&&adminTitles[route])||titles[route]||'مساحة العمل');
  $('#registry-doctor')?.addEventListener('change',e=>{registryDoctor=e.target.value;render();});
  if($('#global-search input'))$('#global-search input').value=query;
}

document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&$('#global-search input')){e.preventDefault();$('#global-search input').focus();}
  if(e.key==='Escape'){$('.notifications-popover')?.remove();$('.notification-trigger')?.setAttribute('aria-expanded','false');$('#sidebar')?.classList.remove('open');}
});

document.addEventListener('click',e=>{
  if(e.target.closest('[data-action="public-book"]')){
    if(demoSession?.role==='patient'){bookingAfterLogin=true;location.hash='portal';}
    else{bookingAfterLogin=true;location.hash='login/patient';}
    return;
  }
  if(!demoSession)return;
  const el=e.target.closest('[data-action]');
  if(!el){if(!e.target.closest('.notifications-popover')){$('.notifications-popover')?.remove();$('.notification-trigger')?.setAttribute('aria-expanded','false');}return;}
  const a=el.dataset.action;
  if(a==='collapse-sidebar'){sidebarCollapsed=!sidebarCollapsed;$('.clinical-shell').classList.toggle('side-collapsed',sidebarCollapsed);el.setAttribute('aria-expanded',String(!sidebarCollapsed));el.setAttribute('aria-label',sidebarCollapsed?'توسيع القائمة':'تصغير القائمة');}
  if(a==='workspace-notifications'){
    const previous=$('.notifications-popover');if(previous){previous.remove();el.setAttribute('aria-expanded','false');return;}
    const reports=role==='patient'?db.sharedReports.filter(r=>r.patient===selected):[];
    const content=role==='patient'?(reports.length?reports.slice(-3).reverse().map(r=>`<div class="activity-item">${icon('file')}<div><strong>تعليمات متابعة متاحة</strong><small>${esc(r.date)}</small><a href="#patient-reports">عرض التعليمات</a></div></div>`).join(''):'<p class="quiet-empty">لا توجد تعليمات جديدة.</p>'):role==='reception'?receptionNotices():role==='doctor'?doctorNotices():role==='admin'?adminAlerts():activityList();
    $('.clinical-topbar').insertAdjacentHTML('beforeend',`<aside class="notifications-popover" aria-label="الإشعارات"><div class="panel-title"><h2>الإشعارات والنشاط</h2><button class="icon-btn" data-action="close-notifications" aria-label="إغلاق الإشعارات">${icon('close')}</button></div>${content}</aside>`);el.setAttribute('aria-expanded','true');
  }
  if(a==='close-notifications'){$('.notifications-popover')?.remove();$('.notification-trigger')?.setAttribute('aria-expanded','false');}
  if(!['doctor','reception'].includes(role))return;
  if(a==='registry-select'&&role==='doctor'&&doctorCanAccess(el.dataset.id)){selected=el.dataset.id;registryTab='overview';draft={};render();}
  if(a==='patient-panel-tab'){if(el.dataset.mode==='registry')registryTab=el.dataset.tab;else dayTab=el.dataset.tab;render();}
  if(a==='clear-patient-filters'){query='';patientFilter='';registryDoctor='';render();}
});
