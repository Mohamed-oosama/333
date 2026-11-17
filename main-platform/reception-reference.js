'use strict';

const receptionReferenceHead=(title,description,actions='')=>pageHead(title,description,actions,'');
const receptionBack=()=>link('مكتب الاستقبال','dashboard','secondary');
const receptionSplit=(main,side,layout='reception-wide')=>'<div class="reception-grid '+layout+'">'+main+side+'</div>';
const receptionPersonSelect=(required=true)=>adminSelect(required?'المريض':'المريض (اختياري)','patient',
  [['','اختر ملفًا'],...db.patients.map(p=>[p.id,p.name+' · '+p.id])],'',required?'required':'');
const receptionInlineForm=(id,fields,submit,tone='primary')=>`<form id="${id}" class="reception-form">${fields}
  <p class="form-error" role="alert"></p><button type="submit" class="button ${tone} full">${submit}</button></form>`;
const receptionFacts=(facts)=>'<div class="reception-facts">'+facts.map(([label,value])=>
  `<div><span>${label}</span><strong>${value}</strong></div>`).join('')+'</div>';
const receptionChips=values=>'<div class="reception-chips">'+values.map(value=>badge(value,'sky')).join('')+'</div>';

function receptionActiveNavigation(route,id) {
  if (route==='reception-services') {
    if (id==='insurance') return 'reception-services/insurance';
    if (['calls','tasks','complaints','inbox'].includes(id)) return 'reception-services/calls';
    if (['cash','refunds'].includes(id)) return 'reception-billing';
    if (id==='documents') return 'patients';
    return 'dashboard';
  }
  if (route==='reception-tools' && ['register','duplicates'].includes(id)) return 'patients';
  if (route==='reception-tools' && id==='admission') return 'reception-admissions';
  return receptionNavParent[route];
}

let receptionGlobalTerm='';
let receptionFocusSearch=false;
const receptionSearchForm=(id,value)=>`<form class="reception-search-form" id="${id}" role="search">
  <input class="input" type="search" name="query" aria-label="ابحث بالاسم أو رقم الملف أو الهاتف أو رقم الحجز"
    placeholder="ابحث بالاسم أو رقم الملف أو الهاتف أو رقم الحجز" value="${esc(value)}">
  <button class="button secondary" type="submit">بحث</button></form>`;

function receptionGlobalSearch() {
  const matches=receptionGlobalTerm?db.patients.filter(p=>receptionMatches(p,receptionGlobalTerm)).slice(0,20):[];
  return receptionReferenceHead('بحث شامل','Ctrl+K من أي صفحة',receptionBack())+
    receptionSplit(receptionCard('نتائج',receptionSearchForm('reception-global-search',receptionGlobalTerm)+
      (matches.length?receptionRows(matches.map(p=>receptionRow(esc(p.name),'<bdi>'+esc(p.id)+'</bdi>',
        link('فتح الملف','reception-file/'+encodeURIComponent(p.id),'secondary small')))):
        receptionEmpty(receptionGlobalTerm?'لا توجد نتائج مطابقة.':'ابحث عن مريض أو حجز.'))+
      '<h3>إجراءات</h3><div class="reception-actions">'+link('تسجيل وصول','reception-checkin','secondary small')+
      button('حجز موعد','book','secondary small')+link('فاتورة جديدة','reception-billing','secondary small')+'</div>'),
    receptionCard('مركز الإشعارات',receptionNotices()));
}

function receptionPatientWorkspace(id,tab) {
  const people=db.patients.filter(p=>receptionMatches(p,query));
  const person=id?receptionPerson(id):people[0];
  const list=receptionCard('سجل المرضى',
    `<input id="patient-search" class="input" type="search" aria-label="بحث المرضى" placeholder="الاسم أو الملف أو الهاتف" value="${esc(query)}">`+
    (people.length?'<div class="reception-patient-list">'+people.map(p=>`<a href="#reception-file/${encodeURIComponent(p.id)}"
      ${p.id===person?.id?'aria-current="true"':''}><div><strong>${esc(p.name)}</strong><small><bdi>${esc(p.id)}</bdi></small></div>
      ${badge(p.status||'مسجل','sky')}</a>`).join('')+'</div>':receptionEmpty('لا توجد ملفات مطابقة.')));
  return receptionPageHead('patients','قائمة وملف في شاشة واحدة',link('+ مريض جديد','reception-tools/register','primary')+
      link('المستندات','reception-services/documents','secondary'))+
    receptionSplit(list,person?'<div class="reception-stack reception-patient-detail">'+receptionFile(person.id,tab)+'</div>':
      receptionCard('ملف المريض',receptionEmpty(id?'الملف غير متاح.':'اختر مريضًا لعرض ملفه.')),'reception-form-grid');
}

let receptionRegistrationTerm='';

function receptionRegistration(review=false) {
  const matches=receptionRegistrationTerm?db.patients.filter(p=>receptionMatches(p,receptionRegistrationTerm)).slice(0,8):[];
  const next='reception-tools/register/details';
  const results=matches.length?'<div class="reception-callout warning"><h3>ملفات مشابهة</h3>'+receptionRows(matches.map(p=>
    receptionRow(esc(p.name),'<bdi>'+esc(p.id)+'</bdi>',link('افتح الملف','reception-file/'+encodeURIComponent(p.id),'secondary small'))))+'</div>':
    receptionEmpty(receptionRegistrationTerm?'لا توجد ملفات مطابقة.':'ابحث أولًا عن ملف المريض.');
  return receptionReferenceHead(review?'مراجعة تكرار الملفات':'تسجيل مريض جديد',
    'بحث عن الملف ثم تسجيل البيانات الأساسية وطباعة البطاقة',link('إلغاء','patients','secondary'))+
    '<div class="reception-steps">'+['١ · بحث أولًا','٢ · البيانات الأساسية','٣ · تأكيد وطباعة البطاقة'].map((step,i)=>
      `<span ${i===(review?0:location.hash.endsWith('/details')?1:0)?'aria-current="step"':''}>${step}</span>`).join('')+'</div>'+
    receptionSplit('<div class="reception-stack">'+receptionCard('هل المريض مسجّل؟',
      receptionSearchForm('reception-registration-search',receptionRegistrationTerm)+results+
      (matches.length&&!review?link('مراجعة التكرار','reception-tools/duplicates','secondary'):'')+
      (review?link('العودة للتسجيل','reception-tools/register','secondary'):''))+
      (!review&&location.hash.endsWith('/details')?receptionCard('البيانات الأساسية',receptionRegistrationForm()):'')+'</div>',
    receptionCard('ملخص',receptionFacts([['رقم الملف','يُولّد تلقائيًا'],['التأمين',badge('لم يُتحقق','sky')]])+
      (!review&&!location.hash.endsWith('/details')?link('متابعة ←',next,'primary full'):'')));
}

function receptionWalkInPage() {
  return receptionReferenceHead('مريض بدون حجز','أضف زيارة غير مجدولة إلى انتظار العيادة',receptionBack())+
    receptionSplit(receptionCard('بيانات الزيارة',receptionInlineForm('reception-walk-in-picker',receptionPersonSelect(),'اختيار القسم')+
      link('+ مريض جديد','reception-tools/register','secondary')),
      receptionCard('الملخص',receptionFacts([['النوع',badge('بدون حجز','amber')],['وقت الوصول','تلقائي'],['رقم الدور','يُولّد عند التأكيد']])));
}

function receptionEmergencyPage() {
  const rows=adminLedgerRows('emergency').filter(row=>row.date===receptionToday()).slice().reverse();
  return receptionReferenceHead('طوارئ: تسجيل سريع','تسجيل إداري فوري · الفرز من اختصاص الطاقم الطبي',receptionBack())+
    receptionSplit(receptionCard('تسجيل فوري','<div class="reception-callout danger"><strong>يمكن تسجيل مريض مجهول</strong>'+
      '<p>يُنشأ معرّف مؤقت للمراجعة عند توفر الهوية.</p></div>'+
      receptionInlineForm('reception-emergency-form',field('الاسم (اختياري)','name','','text','maxlength="120"')+
        field('مرافق أو هاتف (اختياري)','note','','text','maxlength="160"'),'سجّل الوصول للطوارئ','reception-danger')),
      receptionCard('وصول الطوارئ اليوم',rows.length?receptionRows(rows.map(row=>receptionRow(
        esc(row.name||adminPatientName(row.patient)),'<bdi>'+esc(row.patient)+'</bdi>',badge('تم تسجيل الوصول','emerald')))):
        receptionEmpty('لا توجد حالات مسجلة اليوم.')));
}

function receptionTransfersPage() {
  const visits=receptionVisitsToday();
  const eligible=visits.filter(receptionCanTransfer);
  const history=visits.flatMap(a=>(a.transfers||[]).map(transfer=>receptionRow(receptionVisitName(a),
    esc(transfer.from+' ← '+transfer.to),badge('تم الاستلام','emerald'))));
  return receptionReferenceHead('التحويل بين الأقسام','التحويل الإداري قبل بدء الكشف',receptionBack())+
    receptionCard('مسار الزيارة',receptionChips(['الاستقبال','العيادة المستقبلة','تأكيد الاستلام']))+
    receptionSplit(receptionCard('طلب تحويل',eligible.length?receptionRows(eligible.map(a=>receptionRow(receptionVisitName(a),esc(a.doctor),
      button('تحويل','reception-transfer','primary small',receptionIdAttr(a))))):receptionEmpty('لا توجد زيارات قابلة للتحويل الآن.')),
      receptionCard('التحويلات اليوم',history.length?receptionRows(history):receptionEmpty('لا توجد تحويلات مسجلة.')),'');
}

function receptionMapPage() {
  const locations=adminFacilities().filter(item=>['clinic','department','ward','branch'].includes(item.type));
  return receptionReferenceHead('خريطة المستشفى والإرشاد','المواقع المسجلة في دليل المستشفى',receptionBack())+
    receptionSplit(receptionCard('المواقع',locations.length?'<div class="reception-map">'+locations.map(item=>
      `<div><strong>${esc(item.name)}</strong><small>${esc(adminFacilityPath(item))}</small></div>`).join('')+'</div>':
      receptionEmpty('لا توجد مواقع مسجلة في دليل المستشفى.')),
      receptionCard('الاتجاهات',(locations.length?adminSelect('الوجهة','destination',locations.map(item=>[item.id,item.name]),'',
        'id="reception-map-destination"'):'')+
      '<div class="reception-printable"><p id="reception-map-path">'+esc(locations.length?adminFacilityPath(locations[0]):'—')+'</p></div>'+
      (locations.length?button('طباعة الاتجاهات','reception-print','secondary'):'')));
}

function receptionAdmissionChecklist() {
  return receptionReferenceHead('القبول والخروج الإداري','يتولى الطبيب القرار الطبي ويتولى الاستقبال التنسيق الإداري',
    link('خريطة الأسرّة','reception-admissions','secondary'))+
    receptionSplit(receptionCard('القبول',receptionFacts([['هوية المريض',badge('تُراجع','sky')],['المستندات',badge('تُراجع','sky')],
      ['التأمين',badge('تُراجع التغطية','sky')],['سرير متاح',String(receptionFreeBeds().length)]])+
      link('تسجيل القبول','reception-admissions','primary')),
    receptionCard('الخروج',receptionFacts([['قرار الخروج الطبي',badge('من الطبيب','amber')],['تسوية الفاتورة',badge('الحسابات','sky')],
      ['مستندات الخروج',badge('تُراجع','sky')],['تحرير السرير',badge('الإقامة','sky')]])+
      link('عرض المقيمين حاليًا','reception-admissions','secondary')),'');
}

const receptionGuideTopics=[
    ['تسجيل مريض مجهول','افتح تسجيل الطوارئ وسجّل وقت الوصول. يراجع الفريق الهوية لاحقًا.','reception-tools/emergency'],
    ['تسجيل وصول','افتح حجز اليوم وتحقق من الهوية قبل إصدار التذكرة.','reception-checkin'],
    ['تكرار الملفات','ابحث بالهاتف ورقم الملف وافتح السجل الموجود للمراجعة.','reception-tools/duplicates'],
    ['طلب استرداد','اختر فاتورة مدفوعة وسجّل سبب الطلب للمراجعة.','reception-services/refunds'],
    ['تحويل بين الأقسام','اختر الزيارة وتحقق من توافر العيادة وقبول التحويل.','reception-tools/transfers']
];

function receptionAssistant() {
  return receptionReferenceHead('المساعد الذكي','دليل إجراءات الاستقبال · إجابات جاهزة للمراجعة',receptionBack())+
    receptionSplit(receptionCard('المحادثة',adminSelect('اختر إجراءً أو سياسة','topic',receptionGuideTopics.map(([name],i)=>[String(i),name]),'0',
      'id="reception-guide-topic"')+'<div id="reception-guide-answer" class="reception-callout warning"></div>'),
    receptionCard('نطاق المساعد','<p class="muted">إرشاد إداري للموظف. القرارات الطبية والمالية والصلاحيات تُراجع مع المسؤول المختص.</p>'));
}

function receptionOperations() {
  const links=[
    ['الزوار والمرافقون','تسجيل الزوار ومتابعة دخولهم وخروجهم','reception-services/visitors'],
    ['الإحالات','استلام إحالة ومتابعة مراجعة القسم','reception-services/referrals'],
    ['المستندات','مراجعة المستندات الإدارية للمريض','reception-services/documents'],
    ['المساعد الذكي','دليل إجراءات الاستقبال','reception-tools/assistant'],
    ['الفروع','عرض تشغيل الفروع المسجلة','reception-services/branches'],
    ['التسجيل الذاتي','كشك تسجيل الوصول','reception-services/kiosk']
  ];
  return receptionReferenceHead('عمليات إضافية','خدمات مكتب الاستقبال',receptionBack())+
    '<div class="reception-grid">'+links.map(([title,description,route])=>receptionCard(title,'<p class="muted">'+description+'</p>'+
      link('فتح '+title,route,'secondary'))).join('')+'</div>';
}

function receptionArrivalLink(appointment) {
  return link('تسجيل وصول','reception-tools/arrival/'+encodeURIComponent(appointment.id),'secondary small');
}

function receptionArrivalPreview(id) {
  const appointment=db.appointments.find(row=>row.id===id);
  const person=appointment&&receptionPerson(appointment.patient);
  if (!person||appointment.date!==receptionToday()||!['مؤكد','تم تسجيل الوصول'].includes(appointment.status)) {
    return receptionReferenceHead('تسجيل وصول','اختر حجزًا مؤكدًا من مواعيد اليوم',link('اختيار حجز','reception-checkin','secondary'));
  }
  const ready=appointment.status==='تم تسجيل الوصول';
  const coverage=deskRows('coverage').find(row=>row.patient===person.id&&row.state==='موافقة تجريبية');
  const due=adminLedgerRows('invoices').some(row=>row.appointment===appointment.id&&adminInvoiceBalance(row)>0);
  return receptionReferenceHead('تسجيل وصول',esc([person.name,person.id,appointment.time].join(' · ')),
    link('تغيير المريض','reception-checkin','secondary'))+
    receptionSplit(receptionCard('الخطوات',receptionFacts([
      ['١ · التحقق من الهوية',badge(ready?'تم':'يتطلب التأكيد',ready?'emerald':'amber')],
      ['٢ · الحجز',esc(appointment.doctor)+' · '+badge('مؤكد','emerald')],
      ['٣ · جهة الطوارئ',badge(person.emergencyPhone?'مسجّلة':'ناقصة',person.emergencyPhone?'emerald':'amber')],
      ['٤ · التأمين',badge(coverage?'موافقة تجريبية':'لم يُتحقق','sky')],
      ['٥ · الدفع',badge(due?'فاتورة مستحقة':'لا توجد فاتورة مستحقة','sky')]
    ])),receptionCard('التذكرة','<span class="muted">رقم الدور</span><p class="reception-ticket-number">'+
      (ready&&appointment.queueNumber?'A'+esc(appointment.queueNumber):'يُولّد عند التأكيد')+'</p>'+
      (ready?button('عرض التذكرة وطباعتها','reception-ticket','primary full',receptionIdAttr(appointment)):
        button('تحقّق من الهوية وسجّل الوصول','reception-verify','primary full',receptionIdAttr(appointment)))));
}

function receptionToolsPage(id,section) {
  const pages={search:receptionGlobalSearch,register:receptionRegistration,duplicates:()=>receptionRegistration(true),
    'walk-in':receptionWalkInPage,emergency:receptionEmergencyPage,transfers:receptionTransfersPage,map:receptionMapPage,
    operations:receptionOperations,assistant:receptionAssistant,admission:receptionAdmissionChecklist,arrival:()=>receptionArrivalPreview(section)};
  return (Object.hasOwn(pages,id)?pages[id]:receptionOperations)();
}

function receptionInsuranceWorkspace() {
  const rows=deskRows('coverage').slice().reverse();
  return receptionReferenceHead('التأمين والموافقات','تحتاج التغطية إلى مراجعة الجهة المعتمدة',
    '<a class="button primary" href="#reception-services/insurance" data-reception-focus="reception-coverage-form">+ طلب موافقة</a>')+
    receptionSplit(receptionCard('طلب تحقق من الأهلية',receptionInlineForm('reception-coverage-form',receptionPersonSelect()+
      field('شركة التأمين','insurer','','text','required maxlength="100"')+field('رقم العضوية','policy','','text','required maxlength="80"')+
      field('الخدمة المطلوبة','service','','text','required maxlength="100"')+field('تاريخ انتهاء الوثيقة','expires','','date'),'تسجيل طلب التحقق')),
    receptionCard('طلبات الموافقة',(rows.length?receptionRows(rows.map(row=>receptionRow(esc(adminPatientName(row.patient)),
      esc([row.insurer,row.service,row.reply].filter(Boolean).join(' · ')),badge(esc(row.state),'amber')+
      deskAction('مراجعة الطلب','coverage-review',row.id)))):receptionEmpty('لا توجد طلبات موافقة مسجلة.'))+
      '<h3>الحالات</h3>'+receptionChips(coverageStates)),'reception-form-grid');
}

function receptionTrackedRows(collection,emptyMessage) {
  const rows=deskRows(collection).slice().reverse();
  return rows.length?receptionRows(rows.map(row=>receptionRow(esc(row.label),
    esc([row.patient?adminPatientName(row.patient):'',row.notes,deskWhen(row.createdAt),
      row.exitedAt?'الخروج '+deskWhen(row.exitedAt):''].filter(Boolean).join(' · ')),
    badge(row.state,'sky')+(deskLogs[collection]?deskAction('تحديث الحالة','log-update',collection+'/'+row.id):'')))):receptionEmpty(emptyMessage);
}

const receptionDocumentKinds=['هوية','بطاقة تأمين','نموذج إداري','إيصال','مستند آخر'];

function receptionDocuments() {
  const kinds=receptionDocumentKinds.map(kind=>[kind,kind]);
  const rows=deskRows('documents').slice().reverse();
  return receptionReferenceHead('المستندات','رفع وتصنيف ومراجعة المستندات الإدارية',link('ملفات المرضى','patients','secondary'))+
    `<form id="reception-document-form" class="reception-grid reception-document-grid">`+
    receptionCard('رفع ومسح','<label class="reception-upload"><span>اختر صورة هوية أو مستندًا</span><small>PDF · JPG · PNG</small>'+
      '<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" class="input" required></label>'+receptionChips(receptionDocumentKinds))+
    receptionCard('مراجعة البيانات','<div class="reception-form">'+receptionPersonSelect()+
      field('عنوان المستند','label','','text','required maxlength="100"')+adminSelect('التصنيف','kind',kinds,kinds[0][0],'required')+
      field('ملاحظة المراجعة','notes','','text','maxlength="200"')+
      '<p class="muted">أدخل البيانات يدويًا ثم راجعها قبل الحفظ.</p><p class="form-error" role="alert"></p>'+
      '<button type="submit" class="button primary">اعتماد وحفظ</button></div>')+
    receptionCard('مستندات المرضى',rows.length?receptionRows(rows.map(row=>receptionRow(esc(row.label),
      esc([adminPatientName(row.patient),row.kind,row.filename,row.notes].filter(Boolean).join(' · ')),
      badge(row.state,'sky')+(row.filename?`<button type="button" class="button secondary small" data-reception-download="${esc(row.id)}">تنزيل</button>`:'')+
      deskAction('تحديث الحالة','log-update','documents/'+row.id)))):receptionEmpty('لا توجد مستندات مسجلة.'))+'</form>';
}

async function storeReceptionDocument(event) {
  event.preventDefault();
  const form=event.currentTarget;
  if (!receptionRefreshRecords()||form.dataset.saving) return;
  const {patient,label,kind,notes,file}=Object.fromEntries(new FormData(form));
  const error=form.querySelector('[role=alert]');
  if (!receptionPerson(patient)||!label.trim()||!receptionDocumentKinds.includes(kind)||!file.size||file.size>10*1024*1024) {
    error.textContent='راجع البيانات واختر ملفًا حجمه أقل من أو يساوي 10 MB.';
    return;
  }
  const session=demoSession;
  form.dataset.saving='true';
  if (event.submitter) event.submitter.disabled=true;
  try {
    const header=new Uint8Array(await file.slice(0,8).arrayBuffer());
    const signature=(bytes)=>bytes.every((byte,i)=>header[i]===byte);
    const mime=signature([37,80,68,70,45])?'application/pdf':
      signature([137,80,78,71,13,10,26,10])?'image/png':signature([255,216,255])?'image/jpeg':'';
    if (!mime||(file.type&&mime!==file.type)) { error.textContent='اختر ملف PDF أو صورة PNG أو JPG صالحة.';return; }
    if (session!==demoSession||!form.isConnected||!receptionRefreshRecords()||!receptionPerson(patient)) return;
    const id=crypto.randomUUID();
    await saveAttachmentBytes(id,file.slice(0,file.size,mime));
    if (session!==demoSession||!receptionRefreshRecords()||!receptionPerson(patient)) return;
    const row={id,patient,label:label.trim(),kind,notes:notes.trim(),filename:file.name,mime,state:'تمت المراجعة',createdAt:deskNow(),actor:deskActor()};
    const documents=((db.serviceDesk ||= {}).documents ||= []);
    documents.push(row);
    if (!log('رفع مستند إداري من الاستقبال',id)) {
      documents.pop();
      db.audit.shift();
      error.textContent='تعذّر حفظ بيانات المستند. حاول مرة أخرى.';
      return;
    }
    if (form.isConnected) render();
    toast('تم حفظ المستند في المعاينة.');
  } catch {
    error.textContent='تعذّر حفظ المستند في هذا المتصفح.';
  } finally {
    delete form.dataset.saving;
    if (event.submitter) event.submitter.disabled=false;
  }
}

function receptionCommunication() {
  return receptionReferenceHead('التواصل','المكالمات والإشعارات والشكاوى والمهام',deskAction('+ تسجيل مكالمة','log-add','calls','primary'))+
    '<div class="reception-grid">'+receptionCard('مكالمة سريعة',receptionInlineForm('reception-call-form',
      receptionPersonSelect(false)+field('الغرض','label','','text','required maxlength="100"')+
      field('النتيجة','notes','','text','maxlength="200"')+
      '<label><input type="checkbox" name="followUp"> إنشاء مهمة متابعة</label>','حفظ المكالمة'))+
    receptionCard('الإشعارات والرسائل',receptionNotices()+link('رسائل المرضى','reception-services/inbox','secondary'))+
    receptionCard('مهام اليوم',receptionTrackedRows('tasks','لا توجد مهام مسجلة.'),link('عرض المهام','reception-services/tasks','reception-text-link'))+
    receptionCard('الشكاوى',receptionTrackedRows('complaints','لا توجد شكاوى جديدة.'),link('تسجيل شكوى','reception-services/complaints','reception-text-link'))+
    receptionCard('سجل المكالمات',receptionTrackedRows('calls','لا توجد مكالمات مسجلة.'))+'</div>';
}

const receptionTracking={
  visitors:{title:'الزوار والمرافقون',subtitle:'سجل الدخول والخروج',form:'تسجيل زائر',label:'اسم الزائر',notes:'غرض الزيارة',submit:'إصدار تصريح زيارة',list:'سجل الزوار',state:'بالداخل'},
  complaints:{title:'الشكاوى والملاحظات',subtitle:'متابعة البلاغات الإدارية',form:'تسجيل شكوى',label:'التصنيف',notes:'تفاصيل الشكوى',submit:'حفظ الشكوى',list:'الشكاوى المسجلة',state:'جديدة'},
  referrals:{title:'الإحالات',subtitle:'الإحالات الواردة من جهات داخلية أو خارجية',form:'استلام إحالة',label:'الجهة المحوّلة',notes:'التخصص المطلوب',submit:'تسجيل الإحالة',list:'تتبّع الحالة',state:'بانتظار مراجعة القسم'},
  tasks:{title:'المهام الداخلية',subtitle:'مهام الفريق ومتابعتها',form:'مهمة جديدة',label:'عنوان المهمة',notes:'التفاصيل',submit:'إضافة مهمة',list:'المهام المسجلة',state:'جديدة'}
};

function receptionTrackingPage(collection) {
  const details=receptionTracking[collection];
  const context={
    visitors:'يعرض السجل معلومات تصريح الزيارة ووقت الدخول والخروج.',
    referrals:'قبول الإحالة الطبية من اختصاص القسم المستلم.',
    complaints:'تظهر الشكوى فور تسجيلها في سجل التواصل.'
  }[collection];
  return receptionReferenceHead(details.title,details.subtitle,link('رجوع',collection==='tasks'||collection==='complaints'?
    'reception-services/calls':'reception-tools/operations','secondary'))+
    receptionSplit(receptionCard(details.form,receptionInlineForm('reception-tracking-form',
      '<input type="hidden" name="collection" value="'+collection+'">'+
      field(details.label,'label','','text','required maxlength="100"')+
      receptionPersonSelect(collection==='referrals')+
      field(details.notes,'notes','','text','maxlength="200"'),details.submit)),
    receptionCard(details.list,receptionTrackedRows(collection,'لا توجد سجلات بعد.')+
      (context?'<p class="muted">'+context+'</p>':'')),'reception-form-grid');
}

function receptionRefundRequests() {
  const invoices=adminLedgerRows('invoices').filter(invoice=>adminPaymentTotal(invoice.id)>0);
  const options=[['','اختر فاتورة'],...invoices.map(invoice=>[invoice.id,invoice.id+' · '+receptionMoney(adminPaymentTotal(invoice.id))])];
  return receptionReferenceHead('الاستردادات','تسجيل الطلب للمراجعة المالية',link('ورديات الخزينة','reception-services/cash','secondary'))+
    receptionSplit(receptionCard('طلب جديد',receptionInlineForm('reception-refund-request',
      adminSelect('الفاتورة','invoice',options,'','required')+field('المبلغ','amount','','number','required min="0.01" step="0.01"')+
      field('السبب','reason','','text','required maxlength="200"'),'حفظ طلب المراجعة')),
    receptionCard('مسار الاعتماد',receptionChips(['تقديم الطلب','مراجعة المشرف','الصرف وتسجيل المعاملة'])+
      receptionTrackedRows('refundRequests','لا توجد طلبات استرداد مسجلة.')),'reception-form-grid');
}

function receptionServiceWorkspace(id) {
  if (Object.hasOwn(receptionTracking,id)) return receptionTrackingPage(id);
  const pages={insurance:receptionInsuranceWorkspace,calls:receptionCommunication,refunds:receptionRefundRequests,documents:receptionDocuments};
  return Object.hasOwn(pages,id)?pages[id]():receptionExtraPage(id);
}

function receptionAdministration(section) {
  const profile=hospitalProfile();
  if (section==='policy') return receptionReferenceHead('الإعدادات','دليل إعدادات بوابة الاستقبال',link('الإدارة','settings','secondary'))+
    '<div class="reception-grid">'+receptionCard('الفرع والسياسات',receptionFacts([
      ['المستشفى',esc(profile.name)],['الفروع',link('عرض الفروع','reception-services/branches','reception-text-link')],
      ['قائمة انتظار المواعيد',link('عرض القائمة','appointment-waitlist','reception-text-link')]]))+
    receptionCard('الرسائل',link('رسائل المرضى','reception-services/inbox','secondary'))+
    receptionCard('الأمان',receptionFacts([['الجلسة الحالية','استقبال'],['إدارة الحسابات','من بوابة إدارة المستشفى']]))+
    receptionCard('المواقع',link('خريطة المستشفى والإرشاد','reception-tools/map','secondary'))+'</div>';
  const audit=db.audit.filter(row=>row.role===roles.reception).slice(0,12);
  return receptionReferenceHead('الإدارة','نشاط الاستقبال وسجل التدقيق والإعدادات',link('الإعدادات','settings/policy','secondary'))+
    '<div class="reception-grid reception-admin-grid">'+
    receptionCard('سجل التدقيق',audit.length?receptionRows(audit.map(row=>receptionRow(esc(row.action),
      esc(row.resource),'<span class="muted">'+esc(row.time)+'</span>'))):receptionEmpty('لا توجد عمليات استقبال مسجلة.'))+
    receptionCard('الأدوار',receptionFacts([['الجلسة',esc(activeReceptionStaff(demoSession)?.name||roles.reception)],['الصلاحية','موظف استقبال']]))+
    receptionCard('الإعدادات',link('الفروع والسياسات والأمان','settings/policy','secondary'))+'</div>';
}

function receptionOperationalData() {
  const visits=receptionVisitsToday();
  const waits=visits.filter(a=>a.arrivalAt&&a.calledAt).map(a=>(Date.parse(a.calledAt)-Date.parse(a.arrivalAt))/60000)
    .filter(n=>Number.isFinite(n)&&n>=0);
  const coverage=deskRows('coverage');
  const counts=new Map();
  visits.forEach(a=>{
    const name=bookingDirectory()[a.doctor]?.department||'غير محدد';
    counts.set(name,(counts.get(name)||0)+1);
  });
  const metrics=[['متوسط الانتظار',waits.length?Math.round(waits.reduce((a,b)=>a+b)/waits.length)+' د':'—'],
    ['أقصى انتظار',waits.length?Math.round(Math.max(...waits))+' د':'—'],
    ['الموافقات المعلّقة',coverage.filter(row=>coverageStates.slice(0,2).includes(row.state)).length],
    ['الشكاوى المفتوحة',deskRows('complaints').filter(row=>!['مغلقة','تم الحل'].includes(row.state)).length]];
  const decisions=[['موافق',coverage.filter(row=>row.state==='موافقة تجريبية').length],
    ['مرفوض',coverage.filter(row=>row.state==='مرفوض').length]];
  return {metrics,decisions,departments:[...counts]};
}

function receptionOperationalReport() {
  const {metrics,decisions,departments}=receptionOperationalData();
  return receptionReferenceHead('تقارير تشغيلية','الطابور · التأمين · الشكاوى',link('التقارير','reception-reports','secondary')+
    button('PDF','reception-print','secondary')+'<button class="button primary" type="button" data-reception-action="operations-csv">CSV لـ Excel</button>')+
    '<div class="reception-stack reception-printable">'+receptionMetrics(metrics)+'<div class="reception-grid reception-admin-grid">'+
    receptionCard('الطابور حسب القسم',departments.length?receptionFacts(departments.map(([name,count])=>[esc(name),count])):
      receptionEmpty('لا توجد زيارات في الطابور اليوم.'))+
    receptionCard('أداء التأمين',receptionFacts(decisions))+
    receptionCard('نشاط الاستقبال',link('عرض سجل التدقيق','settings','secondary'))+'</div></div>';
}

function bindReceptionReference() {
  $('#reception-document-form')?.addEventListener('submit',storeReceptionDocument);
  for (const id of ['reception-home-search','reception-global-search','reception-registration-search']) {
    $('#'+id)?.addEventListener('submit',event=>{
      event.preventDefault();
      const value=event.currentTarget.elements.query.value.trim();
      if (id==='reception-registration-search') receptionRegistrationTerm=value;
      else { receptionGlobalTerm=value; receptionFocusSearch=true; }
      if (id==='reception-home-search') location.hash='reception-tools/search';
      else render();
    });
  }
  const search=$('#reception-global-search input');
  if (search && receptionFocusSearch) { receptionFocusSearch=false;search.focus(); }
  $('#reception-walk-in-picker')?.addEventListener('submit',event=>{
    event.preventDefault();
    receptionWalkIn(event.currentTarget.elements.patient.value);
  });
  $('#reception-map-destination')?.addEventListener('change',event=>{
    const location=adminFacilities().find(item=>item.id===event.target.value);
    $('#reception-map-path').textContent=location?adminFacilityPath(location):'—';
  });
  const guide=$('#reception-guide-topic');
  if (guide) {
    const update=()=>{
      const [name,body,route]=receptionGuideTopics[Number(guide.value)];
      $('#reception-guide-answer').innerHTML='<h3>'+name+'</h3><p>'+body+'</p>'+link('فتح الإجراء',route,'secondary small');
    };
    guide.addEventListener('change',update);
    update();
  }
  deskSubmit('#reception-coverage-form',deskReception,({patient,insurer,policy,service,expires})=>{
    if (!receptionPerson(patient)||!insurer||!policy||!service) return 'راجع بيانات المريض والتأمين.';
    deskAdd('coverage',{patient,insurer,policy,service,expires,state:coverageStates[0]});
  });
  deskSubmit('#reception-call-form',deskReception,({patient,label,notes,followUp})=>{
    if (!label||(patient&&!receptionPerson(patient))) return 'راجع الغرض وملف المريض.';
    deskAdd('calls',{patient,label,notes,state:'تم الرد'});
    if (followUp) deskAdd('tasks',{patient,label:'متابعة مكالمة · '+label,notes,state:'جديدة'});
  });
  deskSubmit('#reception-tracking-form',deskReception,({collection,patient,label,notes})=>{
    if (!Object.hasOwn(receptionTracking,collection)||!label||
      ((patient||collection==='referrals')&&!receptionPerson(patient))) return 'راجع الحقول المطلوبة.';
    deskAdd(collection,{patient,label,notes,state:receptionTracking[collection].state});
  });
  deskSubmit('#reception-refund-request',deskReception,({invoice,amount,reason})=>{
    const cents=deskAmount(amount);
    const remaining=Math.round(adminPaymentTotal(invoice)*100)-deskRows('refundRequests')
      .filter(row=>row.invoice===invoice&&row.state==='بانتظار المراجعة').reduce((sum,row)=>sum+Math.round(row.amount*100),0);
    if (!adminLedgerRows('invoices').some(row=>row.id===invoice)||!cents||cents>remaining||!reason) return 'راجع الفاتورة والمبلغ المتاح والسبب.';
    deskAdd('refundRequests',{invoice,amount:cents/100,label:invoice,notes:receptionMoney(cents/100)+' · '+reason,state:'بانتظار المراجعة'});
  });
  $('#reception-emergency-form')?.addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const {name,note}=Object.fromEntries(new FormData(event.currentTarget));
    const date=receptionToday();
    const patientId='ER-'+crypto.randomUUID().slice(0,8).toUpperCase();
    const record={id:patientId,patient:patientId,name:name.trim()||'مريض مجهول',note:note.trim(),date,arrivalAt:deskNow()};
    ((db.adminLedgers ||= {}).emergency ||= []).push(record);
    if (!log('تسجيل وصول للطوارئ',patientId)) {
      db.adminLedgers.emergency.pop();
      db.audit.shift();
      return;
    }
    render();
    toast('تم تسجيل الوصول بالمعرّف '+patientId+' في المعاينة.');
  });
}

document.addEventListener('click',async event=>{
  if (!receptionGuard()) return;
  const filter=event.target.closest('[data-reception-queue-department]');
  if (filter) {
    receptionQueueDepartment=filter.dataset.receptionQueueDepartment;
    render();
    $('[data-reception-queue-department][aria-pressed="true"]')?.focus();
  }
  const download=event.target.closest('[data-reception-download]');
  if (download&&receptionRefreshRecords()) {
    const session=demoSession;
    const row=deskRows('documents').find(doc=>doc.id===download.dataset.receptionDownload);
    if (!row?.filename) return;
    try {
      const file=await loadAttachmentBytes(row.id);
      if (session!==demoSession||!receptionGuard()) return;
      if (!file) { toast('الملف غير متاح في هذا المتصفح.');return; }
      adminDownload(row.filename,file,row.mime);
      log('تنزيل مستند إداري من الاستقبال',row.id);
    } catch { toast('تعذّر تنزيل المستند.'); }
  }
  if (event.target.closest('[data-reception-action="operations-csv"]')) {
    const {metrics,decisions,departments}=receptionOperationalData();
    const csv=[...metrics,[],['أداء التأمين','العدد'],...decisions,[],['القسم','زيارات الطابور'],...departments]
      .map(row=>row.map(value=>'"'+String(value).replace(/^[\s]*[=+@-]/,match=>"'"+match).replaceAll('"','""')+'"').join(',')).join('\r\n');
    adminDownload('mnuh333-reception-operations.csv','\ufeff'+csv,'text/csv;charset=utf-8');
  }
});
