'use strict';

const doctorWorkTabs = [
  ['tasks','المهام والتنبيهات'],['followup','المتابعة والقياسات'],['diagnostics','المختبر والأشعة'],
  ['medications','مراجعة الأدوية'],['wards','التنويم والعناية'],['procedures','العمليات والإجراءات'],
  ['collaboration','التحويل والتسليم'],['quality','الموافقات والجودة'],['ai-review','مراجعة النماذج'],
  ['documents','المستندات الطبية'],['resources','المراجع'],['activity','الأداء والنشاط']
];

const medicationSources = ['قائمة الملف','ذكره المريض','روشتة جديدة','روشتة خارجية','دواء موقوف'];
const medicationFindings = ['لا يوجد اختلاف موثق','تكرار محتمل','تداخل محتمل','تعارض محتمل مع حساسية','اختلاف في الجرعة','اختلاف آخر'];
const doctorDocumentTypes = ['إفادة زيارة','شهادة إجازة مرضية','شهادة لياقة','خطاب طبي','ملخص خروج','تقرير إجراء'];

const doctorWorkTypes = {
  task:{tab:'tasks',label:'مهمة سريرية',states:['مفتوحة','قيد العمل','مكتملة']},
  followup:{tab:'followup',label:'متابعة',states:['مجدولة','تمت المتابعة','أُلغيت'],date:true},
  risk:{tab:'followup',label:'متابعة تقييم الخطورة',states:['للمراجعة','تمت المراجعة']},
  pathway:{tab:'followup',label:'مسار رعاية',states:['مسودة','قيد المتابعة','مكتمل']},
  medication:{tab:'medications',label:'مراجعة قائمة الأدوية',states:['قيد المراجعة','تمت المطابقة']},
  round:{tab:'wards',label:'جولة تنويم',states:['مجدولة','مكتملة'],date:true,stay:true},
  icu:{tab:'wards',label:'متابعة العناية المركزة',states:['قيد المتابعة','مكتملة'],stay:true},
  discharge:{tab:'wards',label:'خطة خروج',states:['مسودة','جاهزة للتنسيق','تم التنسيق'],stay:true},
  operation:{tab:'procedures',label:'جدولة عملية',states:['مطلوبة','مجدولة','مكتملة','ملغاة'],date:true},
  procedure:{tab:'procedures',label:'توثيق إجراء',states:['مسودة','موثق']},
  referral:{tab:'collaboration',label:'إحالة تخصصية',states:['مسودة','مسجلة للمتابعة','أُغلقت'],team:true},
  handover:{tab:'collaboration',label:'تسليم سريري',states:['مسودة','جاهز للتسليم','تم التوثيق'],team:true},
  meeting:{tab:'collaboration',label:'مناقشة متعددة التخصصات',states:['مجدولة','تم توثيق المناقشة'],team:true,date:true},
  consent:{tab:'quality',label:'متابعة موافقة',states:['بانتظار التوثيق','وُثقت المراجعة','مسحوبة']},
  quality:{tab:'quality',label:'مراجعة جودة',states:['مفتوحة','قيد المراجعة','مغلقة']},
  coding:{tab:'quality',label:'مراجعة الترميز السريري',states:['قيد المراجعة','تمت المراجعة']},
  aiReview:{tab:'ai-review',label:'مراجعة مخرجات نموذج',states:['بانتظار المراجعة','تحتاج إعادة فحص','تمت المراجعة']},
  document:{tab:'documents',label:'مسودة مستند طبي',states:['مسودة','تمت مراجعة المسودة'],date:true},
  reference:{tab:'resources',label:'مرجع مهني',states:['محفوظ'],resource:true},
  research:{tab:'resources',label:'ملاحظة بحثية',states:['محفوظة'],resource:true}
};

const doctorWorkGuard = () => role==='doctor' && demoSession?.role==='doctor';
const doctorWorkRecords = () => deskRows('doctorWork').filter(row=>row.doctor===currentDoctor()&&
  (!row.patient||doctorCanAccess(row.patient)));
const doctorWorkStay = id => receptionStays().some(row=>row.patient===id&&!row.discharge);
const doctorWorkRecordAction = (label,action,id='',tone='secondary small') => deskAction(label,'doctor-'+action,id,tone);
const doctorWorkRoute = (tab,id) => 'doctor-workspace/'+tab+(id?'/'+encodeURIComponent(id):'');
const doctorWorkFile = id => link('الملف الطبي','record/'+encodeURIComponent(id),'secondary small');

function doctorWorkEdit(kind,id,context) {
  const spec=doctorWorkTypes[kind];
  const existing=id&&doctorWorkRecords().find(row=>row.id===id&&row.kind===kind);
  if (!Object.hasOwn(doctorWorkTypes,kind)||(id&&!existing)) return;
  const patients=doctorPatients().filter(p=>(!context||p.id===context)&&(!spec.stay||doctorWorkStay(p.id)||p.id===existing?.patient));
  if (!spec.resource&&!patients.length) { toast('لا توجد ملفات متاحة لهذا الإجراء.');return; }
  const departments=[...new Set(Object.values(bookingDirectory()).map(item=>item.department).filter(Boolean))];
  const selectedId=existing?.patient||context||patients[0]?.id;
  const medication = kind==='medication';
  const document = kind==='document';
  deskModal(esc(spec.label),field(medication?'اسم الدواء':'العنوان','title',existing?.title||'','text','required maxlength="120"')+
    (spec.resource?'':existing?`<p>${esc(adminPatientName(existing.patient))}</p>`:
      deskSelect('المريض','patient',patients.map(p=>[p.id,p.name+' · '+p.id]),selectedId))+
    (spec.team?deskSelect('التخصص المستقبِل','team',departments,existing?.team||departments[0]):'')+
    (spec.date?field('التاريخ','date',existing?.date||'','date','required'):'')+
    (spec.resource?field('رابط المرجع (اختياري)','url',existing?.url||'','url','maxlength="500"'):'')+
    (medication?deskSelect('مصدر المعلومة','source',medicationSources,existing?.source||medicationSources[0])+
      field('الجرعة في الملف (اختياري)','previousDose',existing?.previousDose||'','text','maxlength="120"')+
      field('الجرعة التي تمت مراجعتها (اختياري)','reviewedDose',existing?.reviewedDose||'','text','maxlength="120"')+
      deskSelect('نتيجة المقارنة اليدوية','finding',medicationFindings,existing?.finding||medicationFindings[0]):'')+
    (document?deskSelect('نوع المستند','documentType',doctorDocumentTypes,existing?.documentType||doctorDocumentTypes[0]):'')+
    doctorTextArea(document?'نص المستند':medication?'قرار الطبيب أو ملاحظات المطابقة':spec.resource?'ملاحظات عن المرجع بدون بيانات مرضى':'ملاحظات الطبيب',
      'notes',existing?.notes,document?'required':'')+
    deskSelect('الحالة','state',spec.states,existing?.state||spec.states[0]));
  deskSubmit('#desk-form',doctorWorkGuard,({title,patient,team,date,url,notes,state,source,previousDose,reviewedDose,finding,documentType})=>{
    const row=id&&doctorWorkRecords().find(item=>item.id===id&&item.kind===kind);
    const target=spec.resource?null:row?.patient||patient;
    if ((id&&!row)||(!spec.resource&&!doctorCanAccess(target))||(!id&&context&&!spec.resource&&target!==context)||
        (!id&&spec.stay&&!doctorWorkStay(target))||
        !title||title.length>120||notes.length>4000||!spec.states.includes(state)||
        (spec.team&&!departments.includes(team))||(spec.date&&!healthArchiveDate(date))||
        (url&&(!/^https?:\/\//i.test(url)||url.length>500))) return 'راجع البيانات وصلاحية الملف.';
    if (medication && (!medicationSources.includes(source)||!medicationFindings.includes(finding)||
        previousDose.length>120||reviewedDose.length>120||(state==='تمت المطابقة'&&!notes))) {
      return 'راجع بيانات الدواء وسجّل قرار الطبيب قبل إنهاء المطابقة.';
    }
    if (document && (!doctorDocumentTypes.includes(documentType)||!notes)) return 'اختر نوع المستند وأدخل نص المسودة.';
    const values={title,notes,state,...(spec.team?{team}:{}),...(spec.date?{date}:{}),...(spec.resource?{url}: {}),
      ...(medication?{source,previousDose,reviewedDose,finding}:{}),...(document?{documentType}:{})};
    if (row) deskUpdate(row,values);
    else deskAdd('doctorWork',{...values,kind,patient:target,doctor:currentDoctor()});
  });
}

function doctorWorkCollection(tab,id) {
  const types=Object.entries(doctorWorkTypes).filter(([,spec])=>spec.tab===tab);
  const records=doctorWorkRecords().filter(row=>doctorWorkTypes[row.kind]?.tab===tab&&(!id||row.patient===id));
  return doctorCard('السجلات',
    '<div class="doctor-actions">'+types.map(([kind,spec])=>doctorWorkRecordAction('إضافة '+spec.label,'new',kind+(id?'/'+id:''))).join('')+'</div>'+
    doctorRows(records.slice().reverse().map(row=>{
      const spec=doctorWorkTypes[row.kind];
      return deskRow(row.title,[row.documentType||spec.label,row.patient?adminPatientName(row.patient):'',row.team,
        row.date?doctorDate(row.date):'',row.source,row.finding,row.previousDose&&'في الملف '+row.previousDose,
        row.reviewedDose&&'الجرعة المراجعة '+row.reviewedDose,row.kind==='document'?'':row.notes].filter(Boolean).join(' · '),row.state,
        (row.patient?doctorWorkFile(row.patient):'')+
        (row.url&&/^https?:\/\//i.test(row.url)?`<a class="button secondary small" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">فتح المرجع</a>`:'')+
        (row.kind==='document'?doctorWorkRecordAction('معاينة المسودة','document',row.id):'')+
        doctorWorkRecordAction('تعديل','edit',row.id));
    })));
}

function doctorWorkDocument(id) {
  const row=doctorWorkRecords().find(item=>item.id===id&&item.kind==='document');
  if (!row) return;
  log('معاينة مسودة مستند طبي',row.id);
  modal('معاينة مسودة مستند طبي',`<article class="doctor-print-report">
    <h2>${esc(hospitalProfile().name)} · ${esc(row.documentType)}</h2>
    <p><strong>مسودة غير موقعة · للاستخدام الداخلي</strong></p>
    <p>${esc(adminPatientName(row.patient))} · <bdi>${esc(row.patient)}</bdi></p>
    <p>${esc(doctorDate(row.date))} · ${esc(row.doctor)}</p>
    <h3>${esc(row.title)}</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(row.notes)}</p>
  </article>`,button('طباعة المسودة','doctor-print','secondary'));
}

function doctorWorkFollowup(people) {
  const ids=new Set(people.map(p=>p.id));
  const visits=db.visits.filter(v=>v.approved&&v.followup&&ids.has(v.patient))
    .slice().sort((a,b)=>a.followup.localeCompare(b.followup));
  return doctorCard('المواعيد الموصى بها في الزيارات المعتمدة',doctorRows(visits.map(v=>
    deskRow(adminPatientName(v.patient),doctorDate(v.followup),v.followup<doctorToday()?'مرّ التاريخ':'متابعة',doctorWorkFile(v.patient)))))+
    doctorCard('آخر قياسات مسجلة',doctorRows(people.filter(p=>db.vitals[p.id]).map(p=>
      '<section class="doctor-work-measurements"><h3>'+esc(p.name)+'</h3>'+vitalSummary(p)+doctorWorkFile(p.id)+'</section>')));
}

function doctorWorkWards(people) {
  const ids=new Set(people.map(p=>p.id));
  return doctorCard('الإقامات المسجلة في الاستقبال',doctorRows(receptionActiveStays().filter(s=>ids.has(s.patient)).map(s=>
    deskRow(adminPatientName(s.patient),receptionBedName(adminBeds().find(b=>b.id===s.bed))+
      ' · '+deskWhen(s.admitted),'إقامة نشطة',doctorWorkFile(s.patient)))));
}

function doctorWorkMedications(people) {
  return doctorCard('الروشتات المعتمدة',doctorRows(people.flatMap(p=>doctorVisits(p.id)
    .filter(v=>v.approved&&(v.prescriptions?.length||v.medications)).map(v=>
      deskRow(p.name,(v.medications||v.prescriptions.map(item=>item.label).join('، '))+
        ' · '+doctorDate(v.date),'معتمدة',button('عرض تقرير الزيارة','doctor-report','secondary small',receptionIdAttr(v)))))));
}

function doctorWorkDiagnostics(people) {
  const ids=new Set(people.map(p=>p.id));
  const orders=db.orders.filter(o=>ids.has(o.patient));
  return doctorCard('طلبات المختبر والأشعة',doctorRows(orders.slice().reverse().map(o=>
    deskRow(o.type,[adminPatientName(o.patient),o.kind,o.priority,doctorDate(o.date)].filter(Boolean).join(' · '),
      o.status||'تم الطلب',doctorWorkFile(o.patient)))))+
    doctorCard('نتائج معتمدة شاركها الطبيب',doctorRows(people.flatMap(p=>patientApprovedResults(p.id).map(r=>
      deskRow(r.label,[p.name,doctorDate(r.date),r.kind==='lab'?r.value+' '+r.unit:r.text].join(' · '),'مشاركة معتمدة',doctorWorkFile(p.id))))))+
    doctorCard('مقارنة صور الأشعة',doctorRows(people.filter(p=>doctorWorkImages(p.id).length>=2).map(p=>
      deskRow(p.name,doctorWorkImages(p.id).length+' صور متاحة','',doctorWorkRecordAction('اختيار صورتين','compare',p.id))),
      'أضف صورتين أشعة إلى نفس الملف لتظهر المقارنة.'),link('الفحوصات والمرفقات','documents','secondary small'));
}

const doctorWorkImages = id => db.attachments.filter(a=>a.patient===id&&a.id&&a.kind==='أشعة'&&isAttachmentImage(a.filename));
let doctorWorkImageUrls=[];
function doctorWorkClearImages() {
  doctorWorkImageUrls.forEach(url=>URL.revokeObjectURL(url));
  doctorWorkImageUrls=[];
}

function doctorWorkCompare(id) {
  if (!doctorCanAccess(id)) return;
  const images=doctorWorkImages(id);
  if (images.length<2) return;
  const options=images.map(a=>[a.id,a.title+' · '+doctorDate(a.date)]);
  deskModal('مقارنة صورتين من ملف '+esc(id),deskSelect('الصورة الأولى','first',options,options[0][0])+
    deskSelect('الصورة الثانية','second',options,options[1][0]),'عرض المقارنة');
  const form=$('#desk-form');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const {first,second}=Object.fromEntries(new FormData(form));
    const pair=[first,second].map(key=>doctorWorkImages(id).find(a=>a.id===key));
    const error=form.querySelector('[role=alert]');
    if (first===second||pair.some(a=>!a)) { error.textContent='اختار صورتين مختلفتين من نفس الملف.';return; }
    try {
      const files=await Promise.all(pair.map(a=>loadAttachmentBytes(a.id)));
      if (!form.isConnected||!doctorWorkGuard()||!doctorCanAccess(id)) return;
      if (files.some(file=>!file)) { error.textContent='إحدى الصورتين غير متاحة في هذا المتصفح.';return; }
      doctorWorkClearImages();
      doctorWorkImageUrls=files.map(file=>URL.createObjectURL(file));
      modal('مقارنة صور الأشعة',`<div class="doctor-image-compare">${pair.map((a,index)=>`<figure>
        <img src="${doctorWorkImageUrls[index]}" alt="${esc(a.title)}"><figcaption>${esc(a.title)} · ${esc(doctorDate(a.date))}</figcaption></figure>`).join('')}</div>`);
      log('عرض مقارنة صور أشعة',id);
    } catch { if (form.isConnected) error.textContent='تعذّر تحميل الصور.'; }
  });
}

function doctorWorkActivity(people) {
  const ids=new Set(people.map(p=>p.id));
  const visits=db.visits.filter(v=>v.doctor===currentDoctor()&&ids.has(v.patient));
  const audit=db.audit.filter(row=>row.actor===currentDoctor()).slice(0,30);
  return doctorCard('ملخص العمل',receptionMetrics([
    ['الزيارات المعتمدة',visits.filter(v=>v.approved).length],['مسودات الزيارات',visits.filter(v=>!v.approved).length],
    ['المهام المفتوحة',doctorWorkRecords().filter(row=>row.kind==='task'&&row.state!=='مكتملة'&&ids.has(row.patient)).length]
  ]))+doctorCard('سجل آخر النشاط',doctorRows(audit.map(row=>deskRow(row.action,row.time))));
}

function doctorWorkAI() {
  return doctorCard('النماذج السبعة',doctorRows(models.map(model=>
    deskRow(model.name,model.en,'الخدمة غير متصلة',link('فتح مساحة النموذج','model/'+model.id,'secondary small')))))+
    doctorCard('سجل مراجعة الطبيب','<p>سجّل المراجعة يدويًا. مشاركة النتيجة مع المريض تتم من ملفه بعد اعتماد الزيارة.</p>');
}

function doctorWorkPage(tab,id) {
  const active=doctorWorkTabs.some(([key])=>key===tab)?tab:'tasks';
  if (id&&!doctorCanAccess(id)) return doctorNoPatients();
  const people=id?doctorPatients().filter(p=>p.id===id):doctorPatients();
  const patients=people.map(p=>[p.id,p.name+' · '+p.id]);
  const context=id?doctorWorkFile(id):'';
  const extra={followup:doctorWorkFollowup,wards:doctorWorkWards,medications:doctorWorkMedications,
    diagnostics:doctorWorkDiagnostics,activity:doctorWorkActivity,'ai-review':doctorWorkAI,
    tasks:()=>doctorCard('تنبيهات الوصول والمرفقات',doctorNotices())}[active];
  return pageHead('مساحة العمل السريري',id?esc(adminPatientName(id)+' · '+id):'تابع أعمالك وسجلات المرضى المتاحة في المعاينة.',
    context+link('النماذج السبعة','ai','secondary'),'بوابة الأطباء')+
    '<nav class="admin-tabs doctor-work-tabs" aria-label="أقسام مساحة العمل">'+doctorWorkTabs.map(([key,label])=>
      `<a href="#${doctorWorkRoute(key,key==='resources'?null:id)}" ${key===active?'aria-current="page"':''}>${label}</a>`).join('')+'</nav>'+
    '<div class="doctor-work-context">'+adminSelect('عرض ملف محدد','doctor-work-patient',
      [['','كل المرضى المتاحين'],...(id?doctorPatients().map(p=>[p.id,p.name+' · '+p.id]):patients)],id||'',
      'data-doctor-work-patient="'+active+'"')+'</div>'+
    (extra?extra(people):'')+(Object.values(doctorWorkTypes).some(spec=>spec.tab===active)?doctorWorkCollection(active,id):'');
}

document.addEventListener('change',event=>{
  const tab=event.target.dataset.doctorWorkPatient;
  if (doctorWorkGuard()&&tab) location.hash=doctorWorkRoute(tab,event.target.value);
});

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-desk-action^="doctor-"]');
  if (!control||!doctorWorkGuard()) return;
  deskRefresh();
  const {deskAction:action,id}=control.dataset;
  if (action==='doctor-new') {
    const [kind,context]=id.split('/');
    doctorWorkEdit(kind,null,context);
  }
  if (action==='doctor-edit') {
    const row=doctorWorkRecords().find(item=>item.id===id);
    if (row) doctorWorkEdit(row.kind,id);
  }
  if (action==='doctor-compare') doctorWorkCompare(id);
  if (action==='doctor-document') doctorWorkDocument(id);
});
