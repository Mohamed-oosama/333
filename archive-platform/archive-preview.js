/* Standalone, fictional archive preview. No production data or backend connection. */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (iso) => new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const badge = (text,kind='teal') => `<span class="badge ${kind}">${esc(text)}</span>`;
  const button = (text,action,kind='',extra='') => `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${text}</button>`;
  const linkButton = (text,action,extra='') => `<button type="button" class="link-button" data-action="${action}" ${extra}>${text}</button>`;
  const card = (title,body,side='') => `<section class="card"><header class="card-head"><h2>${title}</h2>${side}</header><div class="card-body">${body}</div></section>`;
  const row = (a,b) => `<div class="info-row"><span>${a}</span><strong>${b}</strong></div>`;
  const empty = (title,detail) => `<div class="empty"><strong>${title}</strong>${detail}</div>`;
  const patientTabs = [
    {id:'summary', title:'الملخص', sections:{overview:'الملخص'}},
    {id:'visits', title:'الزيارات', sections:{history:'سجل الزيارات',appointments:'المواعيد'}},
    {id:'tests', title:'الفحوصات والطلبات', sections:{labs:'صور نتائج المختبر',imaging:'الأشعة'}},
    {id:'files', title:'الملفات المرفقة', sections:{documents:'المرفقات',reports:'التقارير',prescriptions:'الروشتات'}}
  ];

  const archiveGroups = {
    doctor: [
      {title:'الزيارات والمواعيد', sections:{history:'سجل الزيارات',encounters:'تسجيل زيارة',appointments:'المواعيد'}},
      {title:'الفحوصات والنتائج', sections:{labs:'التحاليل',pacs:'الأشعة',ai:'مراجعة AI'}},
      {title:'التقارير والمرفقات', sections:{reports:'التقارير',documents:'المرفقات'}},
      {title:'الأدوية', sections:{prescriptions:'الوصفات الدوائية'}}
    ]
  };
  const db = {
    patients:[
      {id:'CL-1024',name:'أحمد محمود علي',initials:'أم',dob:'1968-03-18',age:58,gender:'ذكر',blood:'O+',verified:true,last:'2026-11-06',emergency:'جهة الاتصال محفوظة في ملف العرض',phone:'0100•••••24',doctor:'د. سارة أحمد',dept:'أمراض الصدر',allergy:'البنسلين',condition:'ربو مستقر',consent:true,status:'متابعة مطلوبة'},
      {id:'CL-1031',name:'ليلى سمير',initials:'لس',dob:'1982-07-09',age:44,gender:'أنثى',blood:'A+',verified:true,last:'2026-11-05',emergency:'جهة الاتصال محفوظة في ملف العرض',phone:'0100•••••31',doctor:'د. سارة أحمد',dept:'أمراض الصدر',allergy:'لا توجد حساسية مسجلة',condition:'متابعة كحة مزمنة',consent:true,status:'نشط'},
      {id:'CL-1042',name:'عمر حسن',initials:'عح',dob:'1993-02-20',age:33,gender:'ذكر',blood:'B+',verified:false,last:'2026-10-29',emergency:'غير مسجل',phone:'0100•••••42',doctor:'د. عمر خالد',dept:'الأورام الصدرية',allergy:'اللاتكس',condition:'متابعة تصوير',consent:false,status:'قيد المراجعة'}
    ],
    visits:[
      {id:'VIS-206',patient:'CL-1024',date:'2026-11-06',dept:'أمراض الصدر',doctor:'د. سارة أحمد',type:'متابعة',complaint:'متابعة أعراض تنفسية',diagnosis:'ربو مستقر',treatment:'استمرار خطة المتابعة المسجلة',report:'REP-311',status:'معتمد',shared:true},
      {id:'VIS-194',patient:'CL-1024',date:'2026-10-20',dept:'أمراض الصدر',doctor:'د. سارة أحمد',type:'كشف أول مرة',complaint:'سعال متكرر',diagnosis:'أعراض تنفسية قيد المتابعة',treatment:'طلب تصوير وتحاليل للمتابعة',report:'REP-302',status:'معتمد',shared:true},
      {id:'VIS-185',patient:'CL-1031',date:'2026-11-05',dept:'أمراض الصدر',doctor:'د. سارة أحمد',type:'متابعة',complaint:'سعال متقطع',diagnosis:'متابعة سريرية',treatment:'مراجعة بعد أسبوعين',report:'REP-298',status:'معتمد',shared:true},
      {id:'VIS-178',patient:'CL-1042',date:'2026-10-29',dept:'الأورام الصدرية',doctor:'د. عمر خالد',type:'مراجعة نتائج',complaint:'مراجعة تصوير',diagnosis:'قيد تقييم الطبيب',treatment:'انتظار تقرير الأشعة المعتمد',report:'',status:'قيد المراجعة',shared:false}
    ],
    studies:[
      {id:'IMG-2408',patient:'CL-1024',date:'2026-11-05',modality:'أشعة سينية X-Ray',region:'الصدر',referrer:'د. سارة أحمد',radiologist:'د. مريم فؤاد',description:'تصوير متابعة للصدر',report:'REP-321',status:'معتمد',shared:true},
      {id:'IMG-2387',patient:'CL-1024',date:'2026-10-21',modality:'أشعة مقطعية CT',region:'الصدر',referrer:'د. سارة أحمد',radiologist:'د. مريم فؤاد',description:'تصوير مقطعي للمقارنة',report:'REP-310',status:'معتمد',shared:true},
      {id:'IMG-2298',patient:'CL-1024',date:'2026-08-18',modality:'رنين مغناطيسي MRI',region:'العمود الفقري',referrer:'د. سارة أحمد',radiologist:'د. مريم فؤاد',description:'تصوير تجريبي للأرشيف',report:'REP-290',status:'معتمد',shared:true},
      {id:'IMG-2254',patient:'CL-1024',date:'2026-06-12',modality:'تصوير PET',region:'الصدر',referrer:'د. سارة أحمد',radiologist:'د. مريم فؤاد',description:'دراسة عرض قديمة للمقارنة',report:'REP-285',status:'معتمد',shared:true},
      {id:'IMG-2330',patient:'CL-1031',date:'2026-11-04',modality:'موجات فوق صوتية',region:'البطن',referrer:'د. سارة أحمد',radiologist:'د. ندى طارق',description:'فحص متابعة',report:'REP-297',status:'معتمد',shared:true},
      {id:'IMG-2261',patient:'CL-1031',date:'2026-07-15',modality:'تصوير الثدي Mammography',region:'الثدي',referrer:'د. سارة أحمد',radiologist:'د. ندى طارق',description:'فحص أرشيفي تجريبي',report:'REP-286',status:'معتمد',shared:true},
      {id:'IMG-2241',patient:'CL-1031',date:'2026-05-21',modality:'تصوير قاع العين Fundus',region:'العين',referrer:'د. سارة أحمد',radiologist:'د. ندى طارق',description:'فحص أرشيفي تجريبي',report:'REP-281',status:'معتمد',shared:true},
      {id:'IMG-2302',patient:'CL-1042',date:'2026-10-30',modality:'رنين مغناطيسي MRI',region:'الصدر',referrer:'د. عمر خالد',radiologist:'د. مريم فؤاد',description:'مراجعة صور سابقة',report:'',status:'قيد المراجعة',shared:false}
    ],
    labs:[
      {id:'LAB-881',patient:'CL-1024',name:'الهيموجلوبين',category:'صورة دم CBC',date:'2026-11-04',value:'13.8',unit:'g/dL',range:'13–17',status:'طبيعي',lab:'معمل MNU 333',note:'ضمن المدى المرجعي',history:[13.2,13.5,13.8]},
      {id:'LAB-882',patient:'CL-1024',name:'سكر صائم',category:'سكر الدم',date:'2026-11-04',value:'101',unit:'mg/dL',range:'70–99',status:'يحتاج مراجعة',lab:'معمل MNU 333',note:'يُراجع ضمن الزيارة',history:[94,98,101]},
      {id:'LAB-833',patient:'CL-1024',name:'كرياتينين',category:'وظائف الكلى',date:'2026-10-19',value:'0.9',unit:'mg/dL',range:'0.7–1.3',status:'طبيعي',lab:'معمل MNU 333',note:'ضمن المدى المرجعي',history:[0.8,0.9,0.9]},
      {id:'LAB-834',patient:'CL-1024',name:'إنزيم ALT',category:'وظائف الكبد',date:'2026-10-19',value:'24',unit:'U/L',range:'7–56',status:'طبيعي',lab:'معمل MNU 333',note:'للعرض فقط',history:[21,23,24]},
      {id:'LAB-835',patient:'CL-1024',name:'كوليسترول كلي',category:'دهون الدم',date:'2026-10-19',value:'178',unit:'mg/dL',range:'أقل من 200',status:'طبيعي',lab:'معمل MNU 333',note:'للعرض فقط',history:[184,180,178]},
      {id:'LAB-836',patient:'CL-1024',name:'TSH',category:'هرمونات',date:'2026-10-19',value:'2.1',unit:'mIU/L',range:'0.4–4.0',status:'طبيعي',lab:'معمل MNU 333',note:'للعرض فقط',history:[2.3,2.2,2.1]},
      {id:'LAB-837',patient:'CL-1024',name:'تحليل بول',category:'تحليل بول',date:'2026-10-19',value:'1.02',unit:'SG',range:'1.005–1.030',status:'طبيعي',lab:'معمل MNU 333',note:'للعرض فقط',history:[1.01,1.015,1.02]},
      {id:'LAB-838',patient:'CL-1024',name:'مؤشر مختبري',category:'دلالات أورام',date:'2026-10-19',value:'1.4',unit:'a.u.',range:'0–2.5',status:'طبيعي',lab:'معمل MNU 333',note:'قيمة خيالية لا تفسر سريريًا',history:[1.3,1.4,1.4]},
      {id:'LAB-799',patient:'CL-1031',name:'الهيموجلوبين',category:'صورة دم CBC',date:'2026-11-03',value:'12.6',unit:'g/dL',range:'12–16',status:'طبيعي',lab:'معمل MNU 333',note:'لا ملاحظات',history:[12.3,12.5,12.6]}
    ],
    prescriptions:[
      {id:'RX-302',patient:'CL-1024',visitId:'VIS-206',name:'بخاخ متابعة',dose:'جرعة وفق الروشتة',frequency:'مرتان يوميًا',duration:'30 يومًا',start:'2026-11-06',end:'2026-12-06',doctor:'د. سارة أحمد',instructions:'يُستخدم وفق تعليمات الطبيب المسجلة',status:'نشطة'},
      {id:'RX-241',patient:'CL-1024',visitId:'VIS-194',name:'دواء أعراض تنفسية',dose:'حسب الروشتة',frequency:'مرة يوميًا',duration:'14 يومًا',start:'2026-10-20',end:'2026-11-03',doctor:'د. سارة أحمد',instructions:'مراجعة الطبيب عند استمرار الأعراض',status:'سابقة'},
      {id:'RX-229',patient:'CL-1031',name:'دواء متابعة',dose:'حسب الروشتة',frequency:'مرة يوميًا',duration:'7 أيام',start:'2026-11-05',end:'2026-11-12',doctor:'د. سارة أحمد',instructions:'وفق إرشادات الطبيب',status:'نشطة'}
    ],
    reports:[
      {id:'REP-321',patient:'CL-1024',name:'تقرير أشعة الصدر',category:'أشعة',date:'2026-11-05',doctor:'د. مريم فؤاد',status:'معتمد',shared:true,version:1},
      {id:'REP-311',patient:'CL-1024',name:'تقرير الزيارة السريرية',category:'سريري',date:'2026-11-06',doctor:'د. سارة أحمد',status:'موقع',shared:true,version:2},
      {id:'REP-310',patient:'CL-1024',name:'تقرير الأشعة المقطعية',category:'أشعة',date:'2026-10-21',doctor:'د. مريم فؤاد',status:'معتمد',shared:true,version:1},
      {id:'REP-302',patient:'CL-1024',name:'تقرير كشف أول مرة',category:'سريري',date:'2026-10-20',doctor:'د. سارة أحمد',status:'موقع',shared:true,version:1},
      {id:'REP-323',patient:'CL-1024',name:'مسودة تقرير متابعة',category:'متابعة',date:'2026-11-08',doctor:'د. سارة أحمد',status:'مسودة',shared:false,version:1},
      {id:'REP-290',patient:'CL-1024',name:'تقرير رنين مغناطيسي',category:'أشعة',date:'2026-08-18',doctor:'د. مريم فؤاد',status:'معتمد',shared:true,version:1},
      {id:'REP-285',patient:'CL-1024',name:'تقرير تصوير PET',category:'أشعة',date:'2026-06-12',doctor:'د. مريم فؤاد',status:'معتمد',shared:true,version:1},
      {id:'REP-298',patient:'CL-1031',name:'تقرير متابعة',category:'متابعة',date:'2026-11-05',doctor:'د. سارة أحمد',status:'موقع',shared:true,version:1},
      {id:'REP-297',patient:'CL-1031',name:'تقرير موجات فوق صوتية',category:'أشعة',date:'2026-11-04',doctor:'د. ندى طارق',status:'معتمد',shared:true,version:1},
      {id:'REP-286',patient:'CL-1031',name:'تقرير تصوير الثدي',category:'أشعة',date:'2026-07-15',doctor:'د. ندى طارق',status:'معتمد',shared:true,version:1},
      {id:'REP-281',patient:'CL-1031',name:'تقرير قاع العين',category:'أشعة',date:'2026-05-21',doctor:'د. ندى طارق',status:'معتمد',shared:true,version:1},
      {id:'REP-299',patient:'CL-1042',name:'مسودة تقرير تصوير',category:'أشعة',date:'2026-10-30',doctor:'د. مريم فؤاد',status:'مسودة',shared:false,version:1}
    ],
    admissions:[{id:'ADM-107',patient:'CL-1024',date:'2025-03-12',discharge:'2025-03-14',dept:'الباطنة',doctor:'د. نبيل رفعت',reason:'متابعة أعراض تنفسية',diagnosis:'مراقبة سريرية',procedure:'تحاليل وتصوير متابعة',surgery:'لا توجد عملية',summary:'خروج بعد استقرار الحالة'}],
    appointments:[{id:'APT-501',patient:'CL-1024',date:'2026-11-11',time:'09:00',doctor:'د. سارة أحمد',dept:'أمراض الصدر',status:'مؤكد',instruction:'إحضار الفحوصات السابقة'}, {id:'APT-482',patient:'CL-1024',date:'2026-10-20',time:'10:30',doctor:'د. سارة أحمد',dept:'أمراض الصدر',status:'مكتمل',instruction:'أُنجزت الزيارة'}, {id:'APT-503',patient:'CL-1031',date:'2026-11-08',time:'13:30',doctor:'د. سارة أحمد',dept:'أمراض الصدر',status:'مؤكد',instruction:'مراجعة نتائج التحاليل'}, {id:'APT-509',patient:'CL-1031',date:'2026-11-13',time:'11:00',doctor:'د. سارة أحمد',dept:'أمراض الصدر',status:'مؤكد',instruction:'متابعة النتائج'}],
    ai:[{id:'AI-701',patient:'CL-1024',study:'IMG-2408',date:'2026-11-05',model:'Image Classification v1.2',prediction:'مؤشر بصري يحتاج مطابقة سريرية',confidence:'87%',region:'الرئة اليمنى',status:'معتمد للمشاركة',reviewer:'د. مريم فؤاد',shared:true}, {id:'AI-702',patient:'CL-1024',study:'IMG-2387',date:'2026-10-21',model:'Segmentation v2.0',prediction:'تحديد منطقة للمراجعة',confidence:'81%',region:'الصدر',status:'بانتظار مراجعة الطبيب',reviewer:'—',shared:false}, {id:'AI-703',patient:'CL-1031',study:'IMG-2330',date:'2026-11-04',model:'Abnormality Detection v1.1',prediction:'لا توجد نتيجة معتمدة بعد',confidence:'76%',region:'البطن',status:'بانتظار مراجعة الطبيب',reviewer:'—',shared:false}],
    documents:[{id:'DOC-501',patient:'CL-1024',visitId:'VIS-206',name:'صورة تقرير الزيارة.pdf',category:'PDF',date:'2026-11-06',source:'الطبيب المعالج',size:'268 KB'}, {id:'DOC-502',patient:'CL-1024',visitId:'VIS-206',name:'صورة الأشعة.jpg',category:'JPG',date:'2026-11-05',source:'قسم الأشعة',size:'1.4 MB'}, {id:'DOC-508',patient:'CL-1031',name:'نتائج المختبر.pdf',category:'PDF',date:'2026-11-03',source:'المختبر',size:'320 KB'}],
    audit:[{date:'2026-11-08 09:35',actor:'د. سارة أحمد',action:'مراجعة ملف المريض',target:'CL-1024',detail:'عرض آخر الزيارات'}, {date:'2026-11-06 14:10',actor:'د. سارة أحمد',action:'توقيع تقرير',target:'REP-311',detail:'الإصدار 2'}, {date:'2026-11-05 11:20',actor:'د. مريم فؤاد',action:'اعتماد تحليل AI',target:'AI-701',detail:'مشاركة النتيجة مع المريض'}]
  };
  const state = {role:'patient',section:'overview',patient:'CL-1024',query:'',filter:'الكل',study:'IMG-2408',compare:false,multiSeries:false,annotation:false,measure:false,panX:0,panY:0,zoom:1,rotate:0,brightness:1,drafts:{},draft:{complaint:'',history:'',symptoms:'',vitals:'',exam:'',assessment:'',diagnosis:'',plan:'',prescription:'',followup:'',notes:''},draftStatus:'مسودة',draftVersion:1};
  const blankDraft = () => ({complaint:'',history:'',symptoms:'',vitals:'',exam:'',assessment:'',diagnosis:'',plan:'',prescription:'',followup:'',notes:''});
  const switchPatient = (id) => {state.drafts[state.patient]={draft:{...state.draft},status:state.draftStatus,version:state.draftVersion};state.patient=id;const saved=state.drafts[id];state.draft=saved?{...saved.draft}:blankDraft();state.draftStatus=saved?.status||'مسودة';state.draftVersion=saved?.version||1;state.study=db.studies.find(x=>x.patient===id)?.id||'';state.compare=false;state.multiSeries=false;};
  const current = () => db.patients.find(p=>p.id===state.patient) || db.patients[0];
  const records = (key,patient=state.patient) => db[key].filter(x=>x.patient===patient);
  const assignedPatients = () => db.patients.filter(p=>p.doctor==='د. سارة أحمد' && p.consent);
  const isPatient = () => state.role==='patient';
  const visible = (key) => records(key,'CL-1024').filter(x=>!isPatient() || x.shared!==false);
  const toast = (message) => { const e=$('#archive-preview-toast');e.textContent=message;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),3000); };
  function setView(role, section = '') {
    collectDraft();
    if (role === 'patient' && state.patient !== 'CL-1024') switchPatient('CL-1024');
    state.role = role;
    state.section = Object.hasOwn(panels[role], section) ? section : (role === 'patient' ? 'overview' : '');
    state.query = '';
    state.filter = 'الكل';
    render();
  }

  function changeRole(role) {
    if (role === state.role) return;
    history.pushState(null, '', '#' + role);
    setView(role);
    window.scrollTo(0, 0);
    $(`[data-role="${role}"]`)?.focus({preventScroll:true});
  }

  function openSection(section, toggle = false, control) {
    const next = toggle && section === state.section ? '' : section;
    const group = archiveGroups.doctor.findIndex(item => Object.hasOwn(item.sections, section));
    setView(state.role, next);
    const trigger = $(`[data-action="${control}"][data-section="${section}"]`) ||
      $(`[aria-controls="archive-group-${group}"]`);
    trigger?.focus();
  }

  const head = (subtitle, actions = '') => `<div class="panel-heading"><p>${subtitle}</p>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
  const profile = (p=current()) => `<section class="card profile-card"><span class="avatar">${esc(p.initials)}</span><div class="profile-main"><h2>${esc(p.name)} ${p.verified?badge('ملف موثق','good'):badge('قيد التحقق','warn')}</h2><p>رقم الملف <bdi class="latin">${p.id}</bdi> · ${p.age} سنة · ${p.gender} · ${esc(p.dept)}</p></div><div class="profile-meta"><span>فصيلة الدم: <bdi class="latin">${p.blood}</bdi></span><span>آخر زيارة: ${fmt(p.last)}</span><span>الحساسية: ${esc(p.allergy)}</span></div></section>`;
  function visitFiles(visit) {
    const reports = visible('reports').filter(item => item.shared &&
      (item.id === visit.report || item.visitId === visit.id));
    const prescriptions = visible('prescriptions').filter(item => item.visitId === visit.id);
    const documents = visible('documents').filter(item => item.visitId === visit.id);
    const files = [
      ...reports.map(item => [item, 'تقرير', 'report-detail']),
      ...prescriptions.map(item => [item, 'روشتة', 'rx-detail']),
      ...documents.map(item => [item, item.kind === 'lab-image' ? 'صورة نتيجة المختبر' : 'مرفق', 'doc-detail'])
    ];
    return `<section class="visit-files"><h4>التقارير والروشتات والمرفقات</h4>${
      files.length ? files.map(([item, label, action]) => `
        <div class="visit-file-row"><span>${badge(label)} <strong>${esc(item.name)}</strong></span>
          ${button('عرض',action,'soft',`data-id="${item.id}" aria-label="عرض ${label}: ${esc(item.name)}"`)}</div>
      `).join('') : '<p>لا توجد مستندات مرتبطة بهذه الزيارة.</p>'
    }</section>`;
  }

  const timeline = (items) => `<div class="timeline">${items.length ? items.map(v => `
    <article class="timeline-item">
      <time>${fmt(v.date)} · <bdi class="latin">${v.id}</bdi></time>
      <h3>${esc(v.type)} · ${esc(v.dept)} ${badge(v.status,v.status==='معتمد'?'good':'warn')}</h3>
      <p>${esc(v.doctor)} · ${esc(v.complaint)}</p>
      <details><summary>عرض تفاصيل الزيارة</summary>
        <div class="detail-grid">
          <div><span>سبب الزيارة</span>${esc(v.complaint)}</div>
          <div><span>التقييم</span>${esc(v.diagnosis)}</div>
          <div><span>ملخص الخطة</span>${esc(v.treatment)}</div>
          ${isPatient() ? '' : `<div><span>التقرير المرتبط</span>${esc(v.report || 'لا يوجد تقرير معتمد')}</div>`}
        </div>
        ${isPatient() ? visitFiles(v) : ''}
      </details>
    </article>`).join('') : empty('لا توجد زيارات','ستظهر الزيارات المعتمدة هنا بعد تسجيلها.')}</div>`;
  const appointments = (items) => `<div class="info-list">${items.map(a=>`<div class="info-row"><span><strong>${fmt(a.date)} · <bdi class="num">${a.time}</bdi></strong><br>${esc(a.dept)} · ${esc(a.doctor)}<br><small>${esc(a.instruction)}</small></span>${badge(a.status,a.status==='مؤكد'?'good':'teal')}</div>`).join('')}</div>`;
  function patientHistory(){return head('تسلسل زمني لزياراتك وتقييمات الأطباء المعتمدة.')+card('سجل الزيارات',timeline(records('visits','CL-1024').filter(x=>x.shared)));}
  const searchToolbar = (placeholder,categories) => `<div class="toolbar"><input class="search" id="archive-search" aria-label="بحث" placeholder="${placeholder}" value="${esc(state.query)}"><select class="select" id="archive-filter" aria-label="تصفية">${categories.map(c=>`<option ${state.filter===c?'selected':''}>${c}</option>`).join('')}</select></div>`;
  const matches = (text,cat) => (!state.query || text.toLowerCase().includes(state.query.toLowerCase())) && (state.filter==='الكل'||state.filter===cat);
  const studyTiles = (items) => `<div class="tile-grid">${items.length?items.map(s=>`<article class="study-tile"><div class="study-art"><span>${esc(s.modality.split(' ').at(-1))}</span></div><div class="tile-body"><h3>${esc(s.modality)} · ${esc(s.region)}</h3><p>${fmt(s.date)} · ${esc(s.radiologist)} · <bdi class="latin">${s.id}</bdi></p><div class="tile-footer">${badge(s.status,s.status==='معتمد'?'good':'warn')}${button('عرض الدراسة','study','soft',`data-id="${s.id}"`)}</div></div></article>`).join(''):empty('لا توجد دراسات مطابقة','غيّر البحث أو نوع التصوير لعرض النتائج.')}</div>`;
  function patientImaging(){const all=visible('studies');const categories=['الكل',...new Set(all.map(x=>x.modality))];const items=all.filter(x=>matches(`${x.modality} ${x.region} ${x.id} ${x.radiologist}`,x.modality));return head('صور وتقارير الأشعة المعتمدة والمتاحة لك فقط.')+`<div class="notice">عارض الصور هنا واجهة تجريبية برسوم بديلة. ملفات DICOM الحقيقية تحتاج نظام PACS آمن.</div>`+searchToolbar('ابحث بالنوع أو المنطقة أو رقم الدراسة',categories)+studyTiles(items);}
  function chart(values){const min=Math.min(...values)-.5,max=Math.max(...values)+.5;const pts=values.map((v,i)=>`${24+i*105},${97-(v-min)/(max-min)*73}`).join(' ');return `<svg class="lab-chart" viewBox="0 0 260 120" role="img" aria-label="رسم لتغير النتيجة عبر ثلاث قراءات"><line x1="15" y1="99" x2="245" y2="99"/><line x1="15" y1="59" x2="245" y2="59"/><polyline points="${pts}"/>${values.map((v,i)=>`<circle cx="${24+i*105}" cy="${97-(v-min)/(max-min)*73}" r="4"/><text x="${18+i*105}" y="115">${i+1}</text>`).join('')}</svg>`;}
  function labTable(items,doctor=false){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>التحليل</th><th>تاريخ العينة</th><th>النتيجة</th><th>المدى المرجعي</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>${items.map(l=>`<tr><td><strong>${esc(l.name)}</strong><small>${esc(l.category)} · <bdi class="latin">${l.id}</bdi></small></td><td>${fmt(l.date)}</td><td><bdi class="num">${l.value}</bdi> ${esc(l.unit)}</td><td><bdi class="num">${l.range}</bdi></td><td>${badge(l.status,l.status==='طبيعي'?'good':'warn')}</td><td>${linkButton(doctor?'مراجعة':'تفاصيل','lab-detail',`data-id="${l.id}"`)}</td></tr>`).join('')}</tbody></table></div>`;}
  function patientLabs() {
    const images = visible('documents').filter(doc => doc.kind === 'lab-image');
    return head('اعرض نتيجة المختبر كصورة من ملفك.', button('إضافة صورة نتيجة','upload-lab','primary')) +
      card('صور نتائج المختبر', images.length
        ? `<div class="lab-image-grid">${images.map(doc => `
          <article class="document-tile">
            <button class="lab-image-preview" type="button" data-action="doc-detail" data-id="${doc.id}" aria-label="عرض ${esc(doc.name)}">
              <img src="${esc(doc.imageUrl)}" alt="" loading="lazy">
            </button>
            <div class="tile-body"><h3>${esc(doc.name)}</h3><p>${fmt(doc.date)} · ${esc(doc.category)}</p></div>
          </article>`).join('')}</div>`
        : empty('لسه مفيش صور نتائج', 'اضغط على «إضافة صورة نتيجة» لاختيار صورة من جهازك.'));
  }

  function labUploadDialog() {
    const visits = visible('visits').filter(visit => visit.shared);
    showDialog('إضافة صورة نتيجة المختبر', `
      <p class="notice">الصورة بتفضل في المعاينة الحالية لحد ما تحدّث الصفحة. استخدم صورة تجريبية.</p>
      <form id="lab-image-form" class="field-grid">
        <label class="field wide">صورة نتيجة المختبر
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required>
        </label>
        <label class="field wide">ربط بزيارة (اختياري)
          <select name="visit"><option value="">بدون ربط</option>${visits.map(visit =>
            `<option value="${visit.id}">${fmt(visit.date)} · ${esc(visit.type)}</option>`).join('')}</select>
        </label>
        <p class="wide" role="alert"></p>
      </form>`,
      '<button type="submit" form="lab-image-form" class="button primary">إضافة الصورة</button>' +
      button('إلغاء','close-dialog'));
  }

  async function saveLabImage(form, submitter) {
    if (!isPatient() || form.dataset.saving) return;
    const data = new FormData(form);
    const file = data.get('image');
    const error = form.querySelector('[role=alert]');
    const formats = {'image/jpeg':'JPG', 'image/png':'PNG', 'image/webp':'WebP'};
    if (!file?.size || !formats[file.type] || file.size > 10 * 1024 * 1024) {
      error.textContent = 'اختار صورة JPG أو PNG أو WebP بحجم لحد 10 ميجابايت.';
      return;
    }

    error.textContent = '';
    form.dataset.saving = 'true';
    if (submitter) submitter.disabled = true;
    const imageUrl = URL.createObjectURL(file);
    const preview = new Image();
    preview.src = imageUrl;
    try {
      await preview.decode();
    } catch {
      URL.revokeObjectURL(imageUrl);
      error.textContent = 'الصورة ما فتحتش. جرّب صورة تانية.';
      delete form.dataset.saving;
      if (submitter) submitter.disabled = false;
      return;
    }
    if (!form.isConnected || !isPatient()) {
      URL.revokeObjectURL(imageUrl);
      return;
    }

    const visit = visible('visits').find(item => item.shared && item.id === data.get('visit'));
    db.documents.unshift({
      id:`LAB-IMG-${db.documents.length + 1}`, patient:current().id,
      kind:'lab-image', name:file.name, category:formats[file.type], imageUrl,
      date:new Date().toISOString().slice(0,10), source:'المريض (معاينة)',
      size:`${Math.ceil(file.size / 1024)} KB`, visitId:visit?.id
    });
    closeDialog();
    render();
    toast('اتضافت صورة نتيجة المختبر للمعاينة');
  }
  function prescriptionList(items){return items.length?items.map(r=>`<div class="mini-panel" style="margin-bottom:9px"><div class="tile-footer"><h3>${esc(r.name)}</h3>${badge(r.status,r.status==='نشطة'?'good':'teal')}</div><p><bdi class="latin">${r.id}</bdi> · ${fmt(r.start)} إلى ${fmt(r.end)} · ${esc(r.doctor)}</p><div class="detail-grid"><div><span>الجرعة والتكرار</span>${esc(r.dose)} · ${esc(r.frequency)}</div><div><span>المدة والتوجيه</span>${esc(r.duration)} · ${esc(r.instructions)}</div></div><div class="inline-actions" style="margin-top:9px">${button('عرض الروشتة','rx-detail','soft',`data-id="${r.id}"`)}${button('تنزيل نسخة عرض','download','',`data-id="${r.id}" data-kind="rx"`)}</div></div>`).join(''):empty('لا توجد روشتات','ستظهر الروشتات هنا إذا سُجلت في ملفك.');}
  function patientPrescriptions(){const all=records('prescriptions','CL-1024');return head('الأدوية الحالية والوصفات السابقة المسجلة في ملف العرض.')+card('الأدوية الحالية',prescriptionList(all.filter(x=>x.status==='نشطة')))+card('وصفات سابقة',prescriptionList(all.filter(x=>x.status!=='نشطة')));}
  const reportTiles = (items) => items.length?`<div class="tile-grid">${items.map(r=>`<article class="document-tile"><div class="doc-symbol">PDF</div><div class="tile-body"><h3>${esc(r.name)}</h3><p>${fmt(r.date)} · ${esc(r.doctor)} · إصدار ${r.version} · <bdi class="latin">${r.id}</bdi></p><div class="tile-footer">${badge(r.status,r.status==='مسودة'?'warn':'good')}<div class="inline-actions">${button('معاينة','report-detail','soft',`data-id="${r.id}"`)}${button('تنزيل نسخة عرض','download','',`data-id="${r.id}" data-kind="report"`)}${!isPatient()&&r.status==='مسودة'?button('اعتماد','approve-report','primary',`data-id="${r.id}"`):''}${!isPatient()&&r.status==='معتمد'&&!r.shared?button('مشاركة مع المريض','share-report','soft',`data-id="${r.id}"`):''}</div></div></div></article>`).join('')}</div>`:empty('لا توجد تقارير مطابقة','اختر فئة أخرى أو امسح البحث.');
  function patientReports(){const all=visible('reports');const cats=['الكل',...new Set(all.map(x=>x.category))];return head('تقارير سريرية وأشعة ومتابعة اعتمدت للمشاركة معك.')+searchToolbar('ابحث باسم التقرير أو رقمه',cats)+reportTiles(all.filter(x=>matches(`${x.name} ${x.id} ${x.doctor}`,x.category)));}
  function patientAppointments(){const all=records('appointments','CL-1024');return head('المواعيد القادمة والسابقة وتعليمات المتابعة.')+card('المواعيد القادمة',appointments(all.filter(x=>x.status==='مؤكد')))+card('زيارات سابقة',appointments(all.filter(x=>x.status!=='مؤكد')));}
  const aiWorkflow = () => `<div class="ai-process"><span>التصوير الطبي</span><b>←</b><span>معالجة تجريبية</span><b>←</b><span>نتائج AI</span><b>←</b><span>مراجعة الطبيب</span><b>←</b><span>تقرير معتمد</span></div>`;
  const aiCard = (a,doctor=false) => `<article class="ai-card"><div class="tile-footer"><h3><bdi class="latin">${a.id}</bdi> · ${esc(a.model)}</h3>${badge(a.status,a.status==='معتمد للمشاركة'?'good':a.status==='مرفوض'?'bad':'warn')}</div><p>الدراسة <bdi class="latin">${a.study}</bdi> · ${fmt(a.date)} · ${esc(a.region)} · ثقة النموذج <bdi class="num">${a.confidence}</bdi></p><p>مخرجات تجريبية: ${esc(a.prediction)} · راجعها: ${esc(a.reviewer)}</p><div class="ai-heatmap" role="img" aria-label="تخطيط حراري توضيحي غير طبي"></div><div class="inline-actions">${button('تفاصيل التحليل','ai-detail','soft',`data-id="${a.id}"`)}${doctor&&a.status==='بانتظار مراجعة الطبيب'?`${button('اعتماد ومشاركة','ai-approve','primary',`data-id="${a.id}"`)}${button('رفض','ai-reject','danger',`data-id="${a.id}"`)}${button('إعادة التحليل','ai-rerun','',`data-id="${a.id}"`)}`:''}</div></article>`;
  function documentsView(doctor=false){const all=doctor?records('documents'):records('documents','CL-1024');const cats=['الكل',...new Set(all.map(x=>x.category))];const filtered=all.filter(x=>matches(`${x.name} ${x.id} ${x.source}`,x.category));return `${searchToolbar('ابحث باسم الملف أو مصدره',cats)}${filtered.length?`<div class="tile-grid">${filtered.map(d=>`<article class="document-tile"><div class="doc-symbol">${esc(d.category)}</div><div class="tile-body"><h3>${esc(d.name)}</h3><p>${fmt(d.date)} · ${esc(d.source)} · ${esc(d.size)}</p><div class="tile-footer"><span class="badge teal">${esc(d.category)}</span><div class="inline-actions">${button('عرض','doc-detail','soft',`data-id="${d.id}"`)}${button('تنزيل','download','',`data-id="${d.id}" data-kind="document"`)}</div></div></div></article>`).join('')}</div>`:empty('لا توجد ملفات مطابقة','ارفع ملفًا تجريبيًا أو امسح البحث.')}<div class="notice" style="margin-top:14px">صيغ العرض المدعومة في النموذج: PDF، JPG، PNG، DICOM، NIfTI، DOCX. لا تُرفع الملفات إلى خادم.</div>`;}
  function patientDocuments(){return head('تقارير وصور ومستندات مرتبة حسب المصدر والتاريخ.',button('إضافة مرفق تجريبي','upload','primary'))+documentsView();}
  const draftLabels={complaint:'الشكوى الرئيسية',history:'تاريخ المشكلة الحالية',symptoms:'الأعراض',vitals:'العلامات الحيوية',exam:'الفحص السريري',assessment:'التقييم السريري',diagnosis:'التشخيص المسجل',plan:'خطة العلاج',prescription:'الروشتة',followup:'تعليمات المتابعة',notes:'ملاحظات إضافية'};
  function doctorEncounters() {
    const signed = state.draftStatus === 'موقع';
    const core = ['complaint', 'assessment', 'diagnosis', 'plan'];
    const field = key => `<label class="field">${draftLabels[key]}<textarea name="${key}" ${signed ? 'disabled' : ''}>${esc(state.draft[key])}</textarea></label>`;
    const actions = signed
      ? button('إنشاء نسخة تصحيح','new-version','soft')
      : button('حفظ مسودة','save-encounter') +
        button('اعتماد التقرير','finalize-encounter','soft') +
        button('توقيع التقرير','sign-encounter','primary',state.draftStatus === 'معتمد' ? '' : 'disabled');
    return card('تسجيل زيارة', `
      <div class="encounter-status">إصدار ${state.draftVersion} ${badge(state.draftStatus, signed ? 'good' : 'warn')}</div>
      <form id="encounter-form">
        <div class="field-grid">${core.map(field).join('')}</div>
        <details class="encounter-extra">
          <summary>تفاصيل الزيارة الإضافية</summary>
          <div class="field-grid">${Object.keys(draftLabels).filter(key => !core.includes(key)).map(field).join('')}</div>
        </details>
      </form>
      <div class="inline-actions">${actions}${button('معاينة التقرير','preview-encounter')}</div>
    `);
  }
  function viewer(study,compare=false){
    const two=compare||state.multiSeries;
    const previous=db.studies.find(x=>x.patient===study.patient&&x.id!==study.id);
    const secondLabel=compare?`دراسة سابقة · ${previous?.id||'لا توجد'}`:`سلسلة ثانية · ${study.id}`;
    const stage=(label,interactive=false)=>`<div class="viewer-stage"><div class="viewer-over">${label}</div><div class="study-art" style="--viewer-scale:${interactive?state.zoom:1};--viewer-rotate:${interactive?state.rotate:0}deg;--viewer-brightness:${interactive?state.brightness:1};--viewer-x:${interactive?state.panX:0}px;--viewer-y:${interactive?state.panY:0}px"><span>DEMO</span></div>${interactive&&state.annotation?'<span class="viewer-marker">موضع توضيحي</span>':''}${interactive&&state.measure?'<span class="viewer-ruler">قياس توضيحي</span>':''}</div>`;
    return `<div class="viewer"><div class="${two?'viewer-compare':''}">${stage(`${esc(study.id)} · ${esc(study.region)} · 01/24`,true)}${two?stage(secondLabel):''}</div><div class="viewer-controls"><h3>أدوات العارض</h3><div class="viewer-buttons">${button('تكبير +','zoom-in')}${button('تصغير −','zoom-out')}${button('تدوير','rotate')}${button('تحريك','pan')}${button('علامة','annotation','','aria-pressed="'+state.annotation+'"')}${button('قياس','measure','','aria-pressed="'+state.measure+'"')}${button('سلسلتان','multi-series','','aria-pressed="'+state.multiSeries+'"')}${button('مقارنة سابقة','compare','','aria-pressed="'+compare+'"')}</div><label>الإضاءة / Window Level <input type="range" id="viewer-brightness" min="0.5" max="1.6" step="0.1" value="${state.brightness}"></label><label>الشريحة <input type="range" min="1" max="24" value="1" id="viewer-slice"></label><p>دراسة <bdi class="latin">${study.id}</bdi><br>نوع: ${esc(study.modality)}<br>التقرير: ${esc(study.report||'قيد الاعتماد')}<br>الصورة والقياس والعلامة كلها توضيحية وغير تشخيصية.</p></div></div>`;
  }
  function doctorPacs(){const all=records('studies');const selected=all.find(x=>x.id===state.study)||all[0]||db.studies[0];return head('عارض تصوير توضيحي بأدوات قياس شكلية ومقارنة دراسات.',button('مراجعة التقرير','report-detail','soft',`data-id="${selected.report||''}"`))+`<div class="toolbar"><label class="field">الدراسة<select id="study-select" class="select">${all.map(x=>`<option value="${x.id}" ${selected.id===x.id?'selected':''}>${x.id} · ${x.modality}</option>`).join('')}</select></label>${badge(selected.status,selected.status==='معتمد'?'good':'warn')}</div>${viewer(selected,state.compare)}<div style="margin-top:15px">${card('سلاسل التصوير والتقرير',row('الدراسة',`<bdi class="latin">${selected.id}</bdi>`)+row('المنطقة',esc(selected.region))+row('الطبيب المُحيل',esc(selected.referrer))+row('طبيب الأشعة',esc(selected.radiologist))+row('وصف الفحص',esc(selected.description))+row('حالة التقرير',esc(selected.status)))}</div>`;}
  function doctorAI(){const all=records('ai');const filtered=all.filter(x=>matches(`${x.id} ${x.model} ${x.study}`,x.status));return head('مراجعة مخرجات النماذج السبعة قبل اعتماد أي مشاركة.',button('تشغيل تحليل تجريبي','run-ai','primary'))+`<div class="notice warn"><strong>عرض تجريبي:</strong> لا تعمل هنا نماذج طبية حقيقية. جميع النسب والخرائط والنتائج خيالية ولا تصلح لتشخيص.</div>${aiWorkflow()}${searchToolbar('رقم التحليل أو النموذج', ['الكل','معتمد للمشاركة','بانتظار مراجعة الطبيب','مرفوض'])}<div class="section-grid"><div>${filtered.length?filtered.map(x=>aiCard(x,true)).join(''):empty('لا توجد نتائج','غيّر التصفية لعرض التحليلات.')}</div><div>${card('الموديولات المتاحة للعرض', ['تصنيف الصور','كشف الشذوذ','تقسيم الصورة','إعادة بناء ثلاثية الأبعاد','تفسير النتيجة','مقارنة زمنية','مسودة تقرير أشعة'].map((x,i)=>row(`0${i+1}`,x)).join(''))}${card('حدود الاستخدام',`<p style="font-size:11px;color:var(--muted)">النتيجة تظل غير معتمدة حتى يراجعها طبيب مخوّل. اعتماد المريض يخص هذا العرض فقط، ولا يوقّع تقريرًا طبيًا حقيقيًا.</p>`)}</div></div>`;}
  function doctorLabs(){const all=records('labs');const cats=['الكل',...new Set(all.map(x=>x.category))];const filtered=all.filter(x=>matches(`${x.name} ${x.category} ${x.id}`,x.category));return head('نتائج المختبر مع الحالة والمدى المرجعي واتجاه القراءات.')+searchToolbar('ابحث عن تحليل أو فئة',cats)+card('نتائج المريض',filtered.length?labTable(filtered,true):empty('لا توجد نتائج','غيّر البحث أو اختر مريضًا آخر.'));}
  function doctorPrescriptions(){return head('إضافة وصفة تجريبية ومراجعة الوصفات السابقة للمريض المحدد.',button('إضافة دواء','add-rx','primary'))+`<div class="notice">الوصفات هنا بيانات خيالية للمعاينة فقط، ولا تُستخدم للعلاج.</div>${card('الوصفات الحالية والسابقة',prescriptionList(records('prescriptions')))}`;}
  function doctorReports(){const all=records('reports');const cats=['الكل',...new Set(all.map(x=>x.category))];return head('معاينة التقارير وحالات الاعتماد والإصدارات.',button('مسودة سريرية جديدة','nav','primary','data-section="encounters"'))+searchToolbar('ابحث باسم التقرير أو رقمه',cats)+reportTiles(all.filter(x=>matches(`${x.name} ${x.id}`,x.category)));}
  const panels = {
    patient:{overview:null,history:patientHistory,appointments:patientAppointments,labs:patientLabs,imaging:patientImaging,reports:patientReports,documents:patientDocuments,prescriptions:patientPrescriptions},
    doctor:{history:()=>card('سجل الزيارات',timeline(records('visits'))),appointments:()=>card('المواعيد المسجلة',appointments(records('appointments'))),encounters:doctorEncounters,labs:doctorLabs,pacs:doctorPacs,ai:doctorAI,reports:doctorReports,documents:()=>documentsView(true),prescriptions:doctorPrescriptions}
  };

  function groupMarkup({title, sections}, index) {
    const entries = Object.entries(sections);
    const open = Object.hasOwn(sections, state.section);
    const target = open ? state.section : entries[0][0];
    const id = 'archive-group-' + index;
    const choices = entries.map(([key, label]) =>
      button(label, 'nav', key === state.section ? 'soft' : '', `data-section="${key}" aria-pressed="${key === state.section}"`)
    ).join('');
    return `<section class="card archive-group">
      <h2><button type="button" class="group-toggle" data-action="toggle-group" data-section="${target}" aria-expanded="${open}" aria-controls="${id}">
        <span>${title}</span><span aria-hidden="true">${open ? '−' : '+'}</span>
      </button></h2>
      <div class="archive-panel" id="${id}" ${open ? '' : 'hidden'}>
        ${open ? `${entries.length > 1 ? `<div class="group-choices" role="group" aria-label="${title}">${choices}</div>` : ''}${panels[state.role][state.section]()}` : ''}
      </div>
    </section>`;
  }

  function patientArchive(p, summary) {
    const active = patientTabs.find(tab => Object.hasOwn(tab.sections, state.section));
    const tabs = patientTabs.map(tab => {
      const selected = tab === active;
      const section = Object.keys(tab.sections)[0];
      return `<button type="button" id="patient-tab-${tab.id}" role="tab"
        data-action="patient-tab" data-section="${section}" aria-controls="patient-archive-panel"
        aria-selected="${selected}" tabindex="${selected ? 0 : -1}">${tab.title}</button>`;
    }).join('');
    const entries = Object.entries(active.sections);
    const choices = entries.length > 1 ? `<div class="group-choices" role="group" aria-label="${active.title}">
      ${entries.map(([key, title]) => button(title, 'nav', key === state.section ? 'soft' : '',
        `data-section="${key}" aria-pressed="${key === state.section}"`)).join('')}
    </div>` : '';
    return `<section class="patient-archive-identity">
      <span class="avatar" aria-hidden="true">${esc(p.initials)}</span>
      <div>
        <h2>${esc(p.name)}</h2>
        <p>رقم الملف: <bdi>${esc(p.id)}</bdi> · ${esc(p.age)} سنة · ${esc(p.gender)}</p>
        <p>الطبيب المتابع: ${esc(p.doctor || 'لم يُحدد بعد')}</p>
      </div>
    </section>
    <div class="patient-archive-tabs" role="tablist" aria-label="أقسام الأرشيف الصحي">${tabs}</div>
    <div class="patient-archive-panel" id="patient-archive-panel" role="tabpanel" aria-labelledby="patient-tab-${active.id}" tabindex="0">
      ${choices}${state.section === 'overview'
        ? card('ملخص الملف', summary + row('الحساسية', esc(p.allergy)) + row('آخر زيارة', fmt(p.last)))
        : panels.patient[state.section]()}
    </div>`;
  }

  function render() {
    const p = current();
    const visit = records('appointments').filter(a => a.status === 'مؤكد')
      .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    const summary = `<div class="archive-summary"><span>الحالة المسجلة <strong>${esc(p.condition)}</strong></span>
          <span>الموعد القادم <strong>${visit ? `${fmt(visit.date)} · <bdi class="num">${visit.time}</bdi>` : 'لا يوجد موعد مسجل'}</strong></span></div>`;
    const patientPicker = isPatient() ? '' : `<label class="archive-picker">ملف المريض
      <select class="select" id="archive-patient">${assignedPatients().map(item =>
        `<option value="${item.id}" ${item.id === p.id ? 'selected' : ''}>${esc(item.name)} · ${item.id}</option>`
      ).join('')}</select></label>`;
    $('#archive-preview-app').innerHTML = `<div class="archive-single">
      <header class="topbar archive-topbar">
        <a class="brand" href="#patient"><img src="./assets/mnu-university-logo.jpg" alt="شعار جامعة المنصورة الجديدة"><strong>MNU 333</strong></a>
        <div class="topbar-spacer"></div>
        <a href="../main-platform/" class="archive-return-btn" title="العودة إلى المنصة السريرية الأساسية">المنصة الرئيسية ←</a>
        <div class="role-switch" role="group" aria-label="تبديل الواجهة">
          <button type="button" data-action="role" data-role="patient" class="${isPatient() ? 'active' : ''}" aria-pressed="${isPatient()}">المريض</button>
          <button type="button" data-action="role" data-role="doctor" class="${isPatient() ? '' : 'active'}" aria-pressed="${!isPatient()}">الطبيب</button>
        </div>
      </header>
      <main class="workspace archive-workspace ${isPatient() ? 'archive-workspace--patient' : ''}" id="preview-main">
        <div class="archive-intro"><div><span class="eyebrow">${isPatient() ? 'بوابة المريض' : 'مساحة الطبيب'}</span><h1>${isPatient() ? 'أرشيفي الطبي' : 'الأرشيف الطبي للمريض'}</h1></div>${patientPicker}</div>
        ${isPatient() ? patientArchive(p, summary) : `${profile(p)}${summary}<div class="archive-groups">${archiveGroups.doctor.map(groupMarkup).join('')}</div>`}
      </main>
      <footer class="app-footer">معاينة الأرشيف الطبي · بيانات خيالية</footer>
    </div>`;
  }
  function showDialog(title,body,footer='',wide=false){$('#archive-preview-dialog').innerHTML=`<div class="overlay" data-action="close-overlay"><section class="dialog ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title"><header class="dialog-head"><h2 id="preview-dialog-title">${title}</h2><button type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">${body}</div>${footer?`<div class="dialog-foot">${footer}</div>`:''}</section></div>`;$('#archive-preview-dialog .dialog-head button')?.focus();}
  function closeDialog(){$('#archive-preview-dialog').innerHTML='';}
  function studyDialog(id){const s=db.studies.find(x=>x.id===id);if(!s)return;state.study=id;state.compare=false;showDialog(`${s.modality} · ${s.region}`,`<div class="notice">دراسة <bdi class="latin">${s.id}</bdi> · ${fmt(s.date)} · ${s.radiologist}</div>${viewer(s)}<div class="detail-grid"><div><span>الطبيب المُحيل</span>${s.referrer}</div><div><span>تقرير الأشعة</span>${s.report||'لم يُعتمد بعد'}</div><div><span>حالة الدراسة</span>${s.status}</div><div><span>الوصف</span>${s.description}</div></div>`,button('تنزيل وصف الدراسة','download','soft',`data-id="${s.id}" data-kind="study"`),true);}
  function detailDialog(kind,id){let item,title,body;if(kind==='lab'){item=db.labs.find(x=>x.id===id);if(!item)return;title=item.name;body=`${row('رقم التحليل',item.id)}${row('الفئة',item.category)}${row('تاريخ العينة',fmt(item.date))}${row('النتيجة',`${item.value} ${item.unit}`)}${row('المدى المرجعي',item.range)}${row('المختبر',item.lab)}${row('ملاحظة الطبيب',item.note)}${chart(item.history)}`;}
    if(kind==='rx'){item=db.prescriptions.find(x=>x.id===id);if(!item)return;title=`روشتة ${item.id}`;body=`${row('الدواء',esc(item.name))}${row('الجرعة',esc(item.dose))}${row('التكرار',esc(item.frequency))}${row('المدة',esc(item.duration))}${row('تاريخ البداية',fmt(item.start))}${row('تاريخ النهاية',fmt(item.end))}${row('الطبيب',item.doctor)}${row('الإرشادات',esc(item.instructions))}`;}
    if(kind==='report'){item=db.reports.find(x=>x.id===id);if(!item){toast('لا يوجد تقرير معتمد لهذه الدراسة');return;}if(isPatient()&&!item.shared){toast('هذا التقرير غير متاح للمريض');return;}title=item.name;body=`<div class="notice">هذا تقرير خيالي بصيغة معاينة، وليس مستندًا طبيًا حقيقيًا.</div>${row('رقم التقرير',item.id)}${row('الفئة',item.category)}${row('التاريخ',fmt(item.date))}${row('المحرر',item.doctor)}${row('الحالة',item.status)}${row('الإصدار',item.version)}`;}
    if (kind === 'doc') {
      item = records('documents').find(doc => doc.id === id && (!isPatient() || doc.shared !== false));
      if (!item) return;
      title = esc(item.name);
      body = item.imageUrl
        ? `<img class="lab-image-full" src="${esc(item.imageUrl)}" alt="${esc(item.name)}">`
        : `<div class="notice">معاينة وصفية لملف تجريبي. لا توجد ملفات طبية حقيقية في هذه النسخة.</div>${row('رقم الملف',item.id)}${row('النوع',item.category)}${row('المصدر',item.source)}${row('تاريخ الإضافة',fmt(item.date))}${row('الحجم',item.size)}`;
    }
    if(kind==='ai'){item=db.ai.find(x=>x.id===id);if(!item)return;if(isPatient()&&!item.shared){toast('النتيجة قيد مراجعة الطبيب');return;}title=`تحليل ${item.id}`;body=`<div class="notice warn">تحليل تجريبي لدعم القرار فقط، وليس تشخيصًا طبيًا.</div><div class="ai-heatmap"></div>${row('الدراسة',item.study)}${row('النموذج',item.model)}${row('التاريخ',fmt(item.date))}${row('المخرجات',item.prediction)}${row('الثقة',item.confidence)}${row('المنطقة',item.region)}${row('الحالة',item.status)}${row('المراجع',item.reviewer)}`;}
    showDialog(title,body,button('إغلاق','close-dialog'));
  }
  function download(kind,id){const map={report:db.reports,rx:db.prescriptions,document:db.documents,study:db.studies};const item=map[kind]?.find(x=>x.id===id);if(!item)return;if(isPatient()&&item.shared===false){toast('هذا الملف غير متاح للمريض');return;}if(item.imageUrl){const link=document.createElement('a');link.href=item.imageUrl;link.download=item.name;link.click();return;}const content=`MNU 333 — ملف عرض خيالي\nالنوع: ${kind}\nالرقم: ${id}\nالاسم: ${item.name||item.modality||'مستند تجريبي'}\nهذه نسخة نصية توضيحية، وليست تقريرًا أو صورة طبية أصلية.\n`;const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MNU333-demo-${id}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تنزيل ملف المعاينة النصي');}
  function collectDraft(){const form=$('#encounter-form');if(!form)return;new FormData(form).forEach((v,k)=>{state.draft[k]=String(v)});}
  function uploadDialog(){showDialog('إضافة مرفق تجريبي',`<div class="notice">يُعرض اسم الملف فقط داخل هذه الصفحة، دون رفعه أو تخزين محتواه.</div><form id="upload-form" class="field-grid"><label class="field">اسم الملف<input name="name" required placeholder="مثال: تقرير متابعة.pdf"></label><label class="field">النوع<select name="category"><option>PDF</option><option>JPG</option><option>PNG</option><option>DICOM</option><option>NIfTI</option><option>DOCX</option></select></label><label class="field wide">ملف من جهازك (اختياري)<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.dcm,.nii,.docx"></label></form>`,button('إضافة للمعاينة','submit-upload','primary')+button('إلغاء','close-dialog'));}
  function rxDialog(){showDialog('وصفة تجريبية جديدة',`<div class="notice warn">لا تضع بيانات أو وصفات حقيقية في هذه المعاينة.</div><form id="rx-form" class="field-grid"><label class="field">اسم الدواء<input required name="name" placeholder="اسم دواء خيالي"></label><label class="field">الجرعة<input required name="dose" placeholder="الجرعة"></label><label class="field">التكرار<input required name="frequency" placeholder="مرة يوميًا"></label><label class="field">المدة<input required name="duration" placeholder="7 أيام"></label><label class="field wide">الإرشادات<textarea name="instructions" placeholder="تعليمات تجريبية"></textarea></label></form>`,button('حفظ وصفة العرض','submit-rx','primary')+button('إلغاء','close-dialog'));}
  function handleAction(el){const action=el.dataset.action,id=el.dataset.id;switch(action){case 'role':changeRole(el.dataset.role);break;case 'patient-tab':openSection(el.dataset.section,false,'patient-tab');break;case 'nav':openSection(el.dataset.section,false,'nav');break;case 'toggle-group':openSection(el.dataset.section,true,'toggle-group');break;case 'study':studyDialog(id);break;case 'lab-detail':detailDialog('lab',id);break;case 'rx-detail':detailDialog('rx',id);break;case 'report-detail':detailDialog('report',id);break;case 'doc-detail':detailDialog('doc',id);break;case 'ai-detail':detailDialog('ai',id);break;case 'download':download(el.dataset.kind,id);break;case 'upload':uploadDialog();break;case 'upload-lab':if(isPatient())labUploadDialog();break;case 'add-rx':rxDialog();break;case 'close-dialog':closeDialog();break;case 'close-overlay':break;case 'zoom-in':state.zoom=Math.min(2,state.zoom+.2);refreshViewer();break;case 'zoom-out':state.zoom=Math.max(.6,state.zoom-.2);refreshViewer();break;case 'rotate':state.rotate=(state.rotate+90)%360;refreshViewer();break;case 'compare':state.compare=!state.compare;if(state.compare)state.multiSeries=false;refreshViewer();break;case 'multi-series':state.multiSeries=!state.multiSeries;if(state.multiSeries)state.compare=false;refreshViewer();break;case 'annotation':state.annotation=!state.annotation;refreshViewer();break;case 'measure':state.measure=!state.measure;refreshViewer();break;case 'pan':state.panX=state.panX>=40?0:state.panX+20;state.panY=state.panY>=20?0:state.panY+10;refreshViewer();break;case 'save-encounter':collectDraft();state.draftStatus='مسودة';db.audit.unshift({date:'2026-11-08 11:15',actor:'د. سارة أحمد',action:'حفظ مسودة زيارة',target:current().id,detail:`الإصدار ${state.draftVersion}`});render();toast('حُفظت المسودة داخل هذه المعاينة');break;case 'finalize-encounter':collectDraft();if(!state.draft.complaint.trim()||!state.draft.assessment.trim()){toast('اكتب الشكوى والتقييم قبل الاعتماد');break;}state.draftStatus='معتمد';render();toast('اعتمد التقرير التجريبي، ويمكن توقيعه الآن');break;case 'sign-encounter':if(state.draftStatus!=='معتمد')break;state.draftStatus='موقع';db.audit.unshift({date:'2026-11-08 11:20',actor:'د. سارة أحمد',action:'توقيع تقرير تجريبي',target:current().id,detail:`الإصدار ${state.draftVersion}`});render();toast('وُقع التقرير التجريبي وقُفلت هذه النسخة');break;case 'new-version':state.draftVersion++;state.draftStatus='مسودة';render();toast('بدأت نسخة تصحيح جديدة مع حفظ النسخة الموقعة');break;case 'preview-encounter':collectDraft();showDialog('معاينة تقرير الزيارة',`<div class="notice">تقرير تجريبي · الإصدار ${state.draftVersion} · ${state.draftStatus}</div>${Object.entries(draftLabels).map(([k,v])=>row(v,esc(state.draft[k]||'لم يُسجل بعد'))).join('')}`);break;case 'ai-approve':updateAI(id,'معتمد للمشاركة',true);break;case 'ai-reject':updateAI(id,'مرفوض',false);break;case 'ai-rerun':runMockAI(id);break;case 'run-ai':runMockAI();break;case 'approve-report':updateReport(id,'معتمد',false);break;case 'share-report':updateReport(id,'معتمد',true);break;case 'submit-upload':submitUpload();break;case 'submit-rx':submitRx();break;}}
  function refreshViewer(){const inDialog=!!$('#archive-preview-dialog .viewer');if(inDialog){const s=db.studies.find(x=>x.id===state.study);if(s){$('#archive-preview-dialog .viewer').outerHTML=viewer(s,state.compare);return;}}render();}
  function updateAI(id,status,shared){const a=db.ai.find(x=>x.id===id);if(!a||isPatient())return;a.status=status;a.shared=shared;a.reviewer='د. سارة أحمد';db.audit.unshift({date:'2026-11-08 11:30',actor:'د. سارة أحمد',action:status==='مرفوض'?'رفض تحليل AI':'اعتماد تحليل AI',target:id,detail:shared?'مشاركة مع المريض':'بقي غير متاح للمريض'});render();toast(shared?'اعتُمدت النتيجة في مساحة الطبيب':'رُفضت النتيجة');}
  function runMockAI(previousId){
    if(isPatient())return;
    const old=db.ai.find(x=>x.id===previousId);
    const study=db.studies.find(x=>x.id===old?.study)||records('studies')[0];
    if(!study){toast('لا توجد دراسة تصوير في ملف المريض المحدد');return;}
    if(old)old.status='أعيد التحليل';
    const id=`AI-${710+db.ai.length}`;
    db.ai.unshift({id,patient:state.patient,study:study.id,date:'2026-11-08',model:old?`${old.model} · إعادة معالجة`:'Abnormality Detection v1.1',prediction:'منطقة تجريبية تحتاج مراجعة الطبيب',confidence:'79%',region:study.region,status:'بانتظار مراجعة الطبيب',reviewer:'—',shared:false});
    db.audit.unshift({date:'2026-11-08 11:40',actor:'د. سارة أحمد',action:old?'إعادة تحليل AI تجريبي':'تشغيل تحليل AI تجريبي',target:id,detail:`الدراسة ${study.id}`});
    state.filter='الكل';render();toast('أُنشئت نتيجة خيالية جديدة بانتظار المراجعة');
  }
  function updateReport(id,status,shared){
    if(isPatient())return;
    const r=db.reports.find(x=>x.id===id&&x.patient===state.patient);
    if(!r)return;
    r.status=status;r.shared=shared;
    db.audit.unshift({date:'2026-11-08 11:45',actor:'د. سارة أحمد',action:shared?'مشاركة تقرير مع المريض':'اعتماد تقرير',target:id,detail:`الإصدار ${r.version}`});
    render();toast(shared?'ظهر التقرير في معاينة المريض':'اعتُمد التقرير، ويمكنك مشاركته مع المريض');
  }
  function submitUpload(){const form=$('#upload-form');if(!form.reportValidity())return;const d=new FormData(form);const file=d.get('file');const name=String(d.get('name')).trim();const category=String(d.get('category'));if(!name)return;db.documents.unshift({id:`DOC-${600+db.documents.length}`,patient:'CL-1024',name,category,date:'2026-11-08',source:'المريض (معاينة)',size:file?.size?`${Math.round(file.size/1024)} KB`:'اسم فقط'});closeDialog();render();toast('أُضيف اسم المرفق إلى معاينة الأرشيف فقط');}
  function submitRx(){const form=$('#rx-form');if(!form.reportValidity())return;const d=new FormData(form);db.prescriptions.unshift({id:`RX-${400+db.prescriptions.length}`,patient:state.patient,name:String(d.get('name')),dose:String(d.get('dose')),frequency:String(d.get('frequency')),duration:String(d.get('duration')),start:'2026-11-08',end:'2026-12-08',doctor:'د. سارة أحمد',instructions:String(d.get('instructions')||'وفق إرشاد الطبيب'),status:'نشطة'});closeDialog();render();toast('أُضيفت الوصفة التجريبية لملف المريض المحدد');}
  document.addEventListener('click',e=>{if(e.target.classList?.contains('overlay')){closeDialog();return;}const el=e.target.closest('[data-action]');if(el)handleAction(el);});
  document.addEventListener('submit', event => {
    if (event.target.id !== 'lab-image-form') return;
    event.preventDefault();
    saveLabImage(event.target, event.submitter);
  });
  document.addEventListener('input',e=>{if(e.target.id==='archive-search'){const pos=e.target.selectionStart;state.query=e.target.value;render();const field=$('#archive-search');field?.focus();field?.setSelectionRange(pos,pos);}if(e.target.id==='viewer-brightness'){state.brightness=Number(e.target.value);document.querySelectorAll('.viewer-stage .study-art').forEach(x=>x.style.setProperty('--viewer-brightness',state.brightness));}});
  document.addEventListener('change',e=>{
    if(e.target.id==='archive-patient'&&!isPatient()&&assignedPatients().some(p=>p.id===e.target.value)){
      collectDraft();
      switchPatient(e.target.value);
      state.query='';
      state.filter='الكل';
      render();
      $('#archive-patient')?.focus();
    }
    if(e.target.id==='archive-filter'){state.filter=e.target.value;render();}if(e.target.id==='study-select'){state.study=e.target.value;state.compare=false;render();}if(e.target.id==='viewer-slice')toast(`الشريحة ${e.target.value} من 24 — عرض توضيحي`);});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDialog();
    if (event.target.dataset.action !== 'patient-tab') return;
    const tabs = [...document.querySelectorAll('[data-action="patient-tab"]')];
    const index = tabs.indexOf(event.target);
    const next = {ArrowLeft:(index + 1) % tabs.length, ArrowRight:(index + tabs.length - 1) % tabs.length,
      Home:0, End:tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].click();
  });
  function readLocation() {
    const [role, section] = location.hash.slice(1).split('/');
    setView(role === 'doctor' ? 'doctor' : 'patient', section);
  }

  window.addEventListener('hashchange', readLocation);
  readLocation();
})();
