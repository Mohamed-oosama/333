'use strict';

const adminNavGroups = [
  ['الرئيسية', [['dashboard','grid']]],
  ['الأشخاص', [['manage-doctors','doctor'],['admin-patients','user']]],
  ['التشغيل', [['admin-bookings','calendar'],['admin-inventory','file'],['admin-diagnostics','flask']]],
  ['السجلات', [['admin-archive','database'],['admin-reports','pulse']]],
  ['المالية', [['admin-billing','file']]],
  ['الإدارة', [['admin-facilities','settings']]]
].map(([name, links])=>[name,links.map(([route,glyph])=>[route,glyph,adminTitles[route]])]);

const adminNavParent = {
  'admin-staff':'manage-doctors','manage-reception':'manage-doctors','admin-doctor':'manage-doctors',
  'admin-patient':'admin-patients','admin-models':'admin-diagnostics',audit:'admin-reports',settings:'admin-facilities'
};

function adminNavigation() {
  return `<nav class="clinical-nav admin-navigation" aria-label="أقسام إدارة المستشفى">${adminNavGroups.map(([name,items])=>
    `<div class="admin-nav-group"><div class="side-section side-label">${name}</div>${items.map(([route,glyph,label])=>
      `<a href="#${route}" data-nav="${route}" aria-label="${label}" title="${label}">${icon(glyph)}<span class="side-label">${label}</span></a>`).join('')}</div>`).join('')}</nav>`;
}

function adminTabs(base, items, selected) {
  return `<nav class="admin-tabs" aria-label="أقسام الصفحة">${items.map(([key,label])=>
    `<a href="#${base}${key?'/'+key:''}" ${key===selected?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
}

function adminSummary(items) {
  return `<div class="admin-summary" style="--columns:${items.length}">${items.map(([label,value,note])=>
    `<article><span>${label}</span><strong>${typeof value==='number'?adminNumber(value):esc(value)}</strong><small>${note}</small></article>`).join('')}</div>`;
}

function adminSearchBar() {
  return `<form id="admin-global-search" class="admin-global-search" role="search">
    ${icon('search')}<input type="search" class="input" name="term" required aria-label="ابحث عن مريض أو طبيب أو حجز" placeholder="ابحث عن مريض أو طبيب أو حجز">
  </form>`;
}

function adminFind(query) {
  const matches=(...values)=>values.some(value=>String(value??'').toLowerCase().includes(query));
  const people=db.patients.filter(p=>matches(p.name,p.id,p.phone)).map(p=>['مريض',p.name,'admin-patient/'+encodeURIComponent(p.id)]);
  const doctors=Object.entries(bookingDirectory()).filter(([name,d])=>matches(name,d.email,d.department))
    .map(([name])=>['طبيب',name,'admin-doctor/'+encodeURIComponent(name)]);
  const bookings=db.appointments.filter(a=>matches(a.id,a.date,a.doctor,db.patients.find(p=>p.id===a.patient)?.name))
    .map(a=>['حجز',a.date+' · '+a.time+' · '+a.doctor,'admin-bookings']);
  modal('نتائج البحث',adminTable(['النوع','النتيجة','الإجراء'],[...people,...doctors,...bookings].map(([kind,name,route])=>
    [kind,esc(name),`<a class="button secondary small" data-admin-search-link href="#${route}">فتح</a>`]),'لا توجد نتائج مطابقة.'));
}

function adminPeoplePage(route, section) {
  const active=route==='manage-reception'?'staff':route==='admin-staff'?'staff':section==='shifts'?'shifts':'';
  const doctors=Object.entries(bookingDirectory());
  const tabs=adminTabs('manage-doctors',[['','الأطباء · '+adminNumber(doctors.length)],['staff','الموظفون'],['shifts','المناوبات والإجازات']],section==='staff'?'staff':active);
  const shifts=()=>adminSection('مواعيد عمل الأطباء',adminTable(['الطبيب','أيام العمل','أوقات الحجز'],doctors.map(([name,d])=>[
    esc(name),esc(d.days.map(day=>bookingDayNames[day]).join('، ')),`<bdi>${esc(d.hours.join('، '))}</bdi>`
  ])))+adminLedgerTable('leave');
  return adminHeading('manage-doctors','دليل الأطباء والموظفين ومواعيد العمل والإجازات.')+tabs+
    (active==='staff'||section==='staff' ? adminStaffPage() : active==='shifts' ? shifts() : hospitalDoctorAdminPage());
}

function adminRouteId(rawId) {
  try { return decodeURIComponent(rawId || ''); } catch { return ''; }
}

function adminDoctorFile(rawId, section) {
  const id=adminRouteId(rawId);
  const directory=bookingDirectory();
  const adding=rawId==='new';
  const doctor=!adding && Object.hasOwn(directory,id) ? directory[id] : null;
  const active=doctor && ['account','archive'].includes(section) ? section : '';
  const heading=adminHeading('admin-doctor',doctor ? esc(id+' · '+doctor.department) : 'إضافة طبيب جديد إلى دليل الحجز.',link('دليل الأطباء','manage-doctors','secondary'));
  if (!doctor && !adding) return heading+adminSection('الطبيب','<p class="quiet-empty">الملف غير متاح.</p>');
  const tabs=adding ? '' : adminTabs('admin-doctor/'+encodeURIComponent(id),[['','البيانات والمواعيد'],['account','الحساب والصلاحيات'],['archive','الأرشيف']],active);
  if (active==='account') return heading+tabs+adminSection('الحساب والصلاحيات',adminFacts([
    ['البريد المهني',doctor.email],['الإتاحة في دليل الحجز',doctor.active===false?'موقوف':'متاح'],
    ['الوصول إلى مساحة الطبيب',id===demoDoctor?'حساب الطبيب التجريبي':'بيانات دليل الحجز']
  ]));
  if (active==='archive') return heading+tabs+adminSection('الزيارات المعتمدة',adminTable(['رقم الزيارة','رقم ملف المريض','التاريخ'],
    db.visits.filter(v=>v.approved&&v.doctor===id).map(v=>[esc(v.id),esc(v.patient),esc(v.date)]),'لا توجد زيارات معتمدة لهذا الطبيب.'));
  return heading+tabs+`<div id="admin-doctor-editor" data-doctor="${esc(adding?'':id)}"></div>`;
}

function adminFacts(entries) {
  return `<dl class="admin-facts">${entries.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value===''||value==null?'لم يُضف بعد':value)}</dd></div>`).join('')}</dl>`;
}

function adminPatientFile(rawId, section) {
  const patient=db.patients.find(p=>p.id===adminRouteId(rawId));
  if (!patient) return adminHeading('admin-patient','الملف غير متاح.',link('العودة للمرضى','admin-patients','secondary'));
  const active=['account','archive'].includes(section) ? section : '';
  const heading=adminHeading('admin-patient',esc(patient.name)+' · <bdi>'+esc(patient.id)+'</bdi>',link('العودة للمرضى','admin-patients','secondary'));
  const tabs=adminTabs('admin-patient/'+encodeURIComponent(patient.id),[['','البيانات والحجوزات'],['account','الحساب'],['archive','الأرشيف']],active);
  if (active==='account') return heading+tabs+adminSection('بيانات التواصل والحساب',adminFacts([
    ['رقم الملف',patient.id],['الهاتف',patient.phone],['البريد الإلكتروني',patient.email],['تاريخ التسجيل',patient.registeredDate]
  ]));
  if (active==='archive') return heading+tabs+adminSection('مستندات المريض',adminDocumentsTable(adminDocuments().filter(d=>d.patient===patient.id)),
    link('الأرشيف الطبي','admin-archive','secondary'));
  const visits=db.visits.filter(v=>v.approved&&v.patient===patient.id);
  const last=visits.map(v=>bookingDateFromVisit(v.date)).filter(Boolean).sort().at(-1);
  const bookings=db.appointments.filter(a=>a.patient===patient.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const details=adminSection('بيانات المريض',adminFacts([
    ['رقم الملف',patient.id],['العمر',patient.age],['الطبيب المتابع',patient.doctor],['التخصص',bookingDirectory()[patient.doctor]?.department],
    ['رقم الهاتف',patient.phone],['آخر زيارة',adminDate(last)]
  ]))+adminSection('الحجوزات',adminTable(['الموعد','الطبيب','الحالة'],bookings.map(a=>[
    `<bdi>${esc(a.date)} · ${esc(a.time)}</bdi>`,esc(a.doctor),badge(esc(a.status),a.status==='مؤكد'?'emerald':'gray')
  ]),'لا توجد حجوزات لهذا المريض.'),button(icon('plus')+' حجز جديد','admin-book-patient','primary',`data-id="${esc(patient.id)}"`));
  return heading+tabs+`<div class="admin-dashboard-columns"><div class="admin-stack">${details}</div><div class="admin-stack">${adminSummary([
    ['الزيارات المعتمدة',visits.length,'الزيارات المسجلة في الملف']
  ])}${adminSection('ملاحظة','<p>قد يرتبط رقم هاتف واحد بأكثر من فرد في الأسرة.</p>')}</div></div>`;
}

const adminDocumentKinds = ['تقرير','تحليل','أشعة','وصفة طبية','تقرير خروج','موافقة أو إقرار','تقرير باثولوجي','مستند آخر'];
const adminDocumentLabels = ['التقارير الطبية','نتائج المختبر','تقارير الأشعة','الوصفات الطبية','تقارير الخروج','الموافقات والإقرارات','تقارير الباثولوجي','مستندات أخرى'];
function adminDocuments() {
  const shared=db.sharedReports.flatMap(report=>[
    {kind:'تقرير',title:'تقرير زيارة معتمد',text:[report.plan,report.instructions].filter(Boolean).join('\n')},
    {kind:'وصفة طبية',title:'وصفة طبية معتمدة',text:report.medications}
  ].filter(entry=>entry.text).map(entry=>({...entry,patient:report.patient,date:report.date,visit:report.visit})));
  return [...(db.adminDocuments || []),...db.attachments,...shared];
}

function adminDocumentsTable(docs) {
  return adminTable(['المستند','المريض','النوع','الطبيب','التاريخ','السرية','الإجراء'],docs.map(d=>{
    const person=db.patients.find(p=>p.id===d.patient);
    return [esc(d.title),esc(person?.name||d.patient),esc(d.kind||'مستند آخر'),esc(person?.doctor||'—'),esc(adminDate(d.date)),
      badge(d.uploader==='admin'?'إداري':'ملف المريض','gray'),
      d.id ? button('فتح','attachment-open','secondary small',`data-id="${esc(d.id)}"`) :
        d.text ? button('عرض','admin-open-approved','secondary small',`data-visit="${esc(d.visit)}" data-patient="${esc(d.patient)}" data-kind="${esc(d.kind)}"`) : '—'];
  }),'لا توجد مستندات مطابقة في الأرشيف.');
}

function adminArchivePage(tab) {
  const active=tab==='upload'?'upload':'';
  const heading=adminHeading('admin-archive','المستندات والتقارير المحفوظة لكل مريض.')+
    adminTabs('admin-archive',[['','المستندات'],['upload','رفع مستند']],active);
  if (active) return heading+adminSection('رفع مستند',`<form id="admin-upload-form" class="form-grid">
    ${adminSelect('المريض','patient',[['','اختر المريض'],...db.patients.map(p=>[p.id,p.name+' · '+p.id])],'','required')}
    ${adminSelect('نوع المستند','kind',adminDocumentKinds.map(k=>[k,k]),'تقرير')}
    ${field('عنوان المستند','title','','text','required maxlength="80"')}
    ${field('التاريخ','date',adminToday(),'date','required')}
    <label class="field full"><span>الملف (حتى 10 MB)</span><input type="file" class="input" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.dcm" required></label>
    <p class="full" role="alert" id="admin-upload-error"></p><div class="full"><button class="button primary" type="submit">حفظ المستند</button></div></form>`);
  const docs=adminDocuments();
  return heading+`<div class="admin-document-counts">${adminDocumentKinds.map((kind,index)=>
    `<div><span>${adminDocumentLabels[index]}</span><strong>${adminNumber(docs.filter(d=>(d.kind||'مستند آخر')===kind).length)}</strong></div>`).join('')}</div>`+
    adminSection('كل المستندات',`<div class="admin-filters" id="admin-document-filters">
      ${field('البحث','query','','search','placeholder="اسم المريض أو عنوان المستند"')}
      ${adminSelect('النوع','kind',[['','كل الأنواع'],...adminDocumentKinds.map(k=>[k,k])],'')}
      ${adminSelect('القسم','department',[['','كل الأقسام'],...bookingDepartments().map(k=>[k,k])],'')}
      ${adminSelect('الفترة','period',[['','كل الفترات'],['month','هذا الشهر']],'')}
    </div><div id="admin-document-results">${adminDocumentsTable(docs)}</div>`,link(icon('plus')+' رفع مستند','admin-archive/upload','primary'))+
    '<p class="muted">يُسجّل فتح المستند أو تنزيله في سجل التدقيق.</p>';
}

async function adminUploadDocument(event) {
  event.preventDefault();
  const form=event.currentTarget;
  if (!isHospitalAdmin() || form.dataset.saving) return;
  const {patient,kind,title,date,file}=Object.fromEntries(new FormData(form));
  const error=$('#admin-upload-error');
  const mimeByExtension={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',dcm:'application/dicom'};
  const extension=file?.name.split('.').pop().toLowerCase();
  const mime=Object.hasOwn(mimeByExtension,extension)?mimeByExtension[extension]:null;
  if (!db.patients.some(p=>p.id===patient)||!adminDocumentKinds.includes(kind)||!title.trim()||!healthArchiveDate(date)||
      !mime||!file.size||file.size>10*1024*1024||(file.type&&file.type!==mime&&!(extension==='dcm'&&file.type==='application/octet-stream'))) {
    error.textContent='راجع بيانات المستند واختر ملفًا مدعومًا حتى 10 MB.';
    return;
  }
  const id='F'+crypto.randomUUID();
  const session=demoSession;
  form.dataset.saving='true';
  if (event.submitter) event.submitter.disabled=true;
  try {
    await saveAttachmentBytes(id,file.slice(0,file.size,mime));
    if (session!==demoSession || !isHospitalAdmin()) return;
    (db.adminDocuments ||= []).push({id,patient,kind,title:title.trim(),date,filename:file.name,mime,uploader:'admin'});
    log('رفع مستند إلى الأرشيف',id);
    if (form.isConnected) { location.hash='admin-archive'; toast('تم حفظ المستند.'); }
  } catch {
    error.textContent='تعذر حفظ الملف في هذا المتصفح.';
    delete form.dataset.saving;
    if (event.submitter) event.submitter.disabled=false;
  }
}

const adminLedgers = {
  suppliers:{title:'الموردون', add:'إضافة مورد', fields:[['name','اسم المورد'],['contact','بيانات التواصل','text',false]]},
  purchases:{title:'طلبات الشراء', add:'طلب شراء جديد', fields:[['item','الصنف'],['supplier','المورد','suppliers'],['quantity','الكمية','quantity'],['date','التاريخ','date']]},
  leave:{title:'الإجازات', add:'تسجيل إجازة', fields:[['doctor','الطبيب','doctor'],['start','من','date'],['end','إلى','date'],['reason','السبب','text',false]]},
  feedback:{title:'الشكاوى والتقييم', add:'تسجيل ملاحظة', fields:[['patient','المريض','patient'],['note','الملاحظة'],['date','التاريخ','date']]},
  referrals:{title:'الإحالات', add:'إضافة إحالة', fields:[['patient','المريض','patient'],['destination','الجهة المحال إليها'],['date','التاريخ','date']]},
  emergency:{title:'سجل الطوارئ الإداري', add:'تسجيل وصول للطوارئ', fields:[['patient','المريض','patient'],['date','تاريخ الوصول','date'],['note','ملاحظة إدارية','text',false]]},
  prices:{title:'الأسعار', add:'إضافة سعر', fields:[['service','الخدمة'],['amount','السعر بالجنيه','money']]},
  insurers:{title:'جهات التأمين', add:'إضافة جهة تأمين', fields:[['name','جهة التأمين'],['contact','التواصل','text',false]]},
  invoices:{title:'الفواتير', add:'فاتورة جديدة', fields:[['patient','المريض','patient'],['service','الخدمة'],['amount','المبلغ بالجنيه','money'],['insurer','التأمين','insurers',false]]},
  payments:{title:'المدفوعات', add:'تسجيل دفعة', fields:[['invoice','الفاتورة','invoice'],['amount','المبلغ بالجنيه','money'],['date','التاريخ','date']]}
};

const adminLedgerRows = key => db.adminLedgers?.[key] || [];
const adminPatientName = id => db.patients.find(p=>p.id===id)?.name || id;
const adminPaymentTotal = id => adminLedgerRows('payments').filter(p=>p.invoice===id).reduce((total,p)=>total+p.amount,0);
const adminInvoiceBalance = invoice => Math.round((invoice.amount-adminPaymentTotal(invoice.id))*100)/100;

function adminLedgerTable(key, showAction = true) {
  const {title,add,fields}=adminLedgers[key];
  const invoice=key==='invoices';
  const headers=fields.map(([,label])=>label);
  if (invoice) { headers.unshift('الرقم');headers.push('الحالة'); }
  const rows=adminLedgerRows(key).map(row=>{
    const cells=fields.map(([name,,type])=>esc(type==='patient'?adminPatientName(row[name]):row[name]||'—'));
    if (invoice) {
      cells.unshift(esc(row.id));
      cells.push(adminInvoiceBalance(row)>0?badge('مستحقة','amber'):badge('مدفوعة','emerald'));
    }
    return cells;
  });
  const action=showAction ? button(icon('plus')+' '+add,'admin-add-entry','primary',`data-key="${key}"`) : '';
  return adminSection(title,adminTable(headers,rows,`لا توجد ${title} مسجلة بعد.`),action);
}

function adminLedgerField([name,label,type,required=true]) {
  const attrs=required?'required':'';
  const choices={
    patient:()=>db.patients.map(p=>[p.id,p.name+' · '+p.id]),
    doctor:()=>Object.keys(bookingDirectory()).map(d=>[d,d]),
    suppliers:()=>adminLedgerRows('suppliers').map(row=>[row.name,row.name]),
    insurers:()=>adminLedgerRows('insurers').map(row=>[row.name,row.name]),
    invoice:()=>adminLedgerRows('invoices').filter(i=>adminInvoiceBalance(i)>0).map(i=>[i.id,i.id+' · '+adminPatientName(i.patient)])
  };
  if (Object.hasOwn(choices,type)) return adminSelect(label,name,[['',required?'اختر':'بدون'],...choices[type]()],'',attrs);
  if (type==='money'||type==='quantity') return field(label,name,'','number',attrs+' min="'+(type==='money'?'0.01':'1')+'" max="10000000" step="'+(type==='money'?'0.01':'1')+'"');
  if (type==='date') return field(label,name,adminToday(),'date',attrs);
  return field(label,name,'','text',attrs+' maxlength="140"');
}

function adminAddLedgerEntry(key) {
  if (!isHospitalAdmin() || !Object.hasOwn(adminLedgers,key)) return;
  const {add,fields}=adminLedgers[key];
  modal(add,`<form id="admin-ledger-form" class="form-grid">${fields.map(adminLedgerField).join('')}${adminFormFooter()}</form>`);
  $('#admin-ledger-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const data=new FormData(event.currentTarget);
    const values=Object.fromEntries(fields.map(([name,,type])=>{
      const input=String(data.get(name)??'').trim();
      return [name,type==='money'||type==='quantity'?Number(input):input];
    }));
    const error=$('#admin-form-error');
    if (fields.some(([name,,type,required=true])=>{
      const value=values[name];
      if (!value) return required;
      if (type==='date') return !healthArchiveDate(value);
      if (type==='money'||type==='quantity') return !Number.isFinite(value)||value<0.01||value>10000000||
        (type==='quantity'&&!Number.isInteger(value));
      if (type==='patient') return !db.patients.some(p=>p.id===value);
      if (type==='doctor') return !Object.hasOwn(bookingDirectory(),value);
      if (type==='suppliers'||type==='insurers') return !adminLedgerRows(type).some(row=>row.name===value);
      return value.length>140;
    }) || (key==='leave'&&values.end<values.start)) {
      error.textContent='راجع البيانات المطلوبة والتواريخ.';
      return;
    }
    if (key==='payments') {
      const invoice=adminLedgerRows('invoices').find(i=>i.id===values.invoice);
      if (!invoice || values.amount>adminInvoiceBalance(invoice)) {
        error.textContent='المبلغ أكبر من الرصيد المستحق على الفاتورة.';
        return;
      }
    }
    const id=(key==='invoices'?'INV-':'')+crypto.randomUUID().slice(0,12);
    ((db.adminLedgers ||= {})[key] ||= []).push({id,...values});
    log(add,id);
    closeModal();render();toast('تم الحفظ.');
  });
}

function adminBillingPage(tab) {
  const active=['prices','insurers','payments'].includes(tab)?tab:'';
  const invoices=adminLedgerRows('invoices').filter(i=>adminInvoiceBalance(i)>0);
  const today=adminToday();
  const collected=adminLedgerRows('payments').filter(p=>p.date===today).reduce((sum,p)=>sum+p.amount,0);
  return adminHeading('admin-billing','الفواتير والأسعار وجهات التأمين والمدفوعات.',
    button(icon('plus')+' فاتورة جديدة','admin-add-entry','primary','data-key="invoices"'))+
    adminSummary([['فواتير مستحقة',invoices.length,'الفواتير ذات رصيد متبقٍ'],
      ['مدفوعات اليوم',adminNumber(collected)+' ج.م','الدفعات المسجلة اليوم'],
      ['فواتير مرتبطة بالتأمين',invoices.filter(i=>i.insurer).length,'الفواتير المستحقة ذات جهة تأمين']])+
    adminTabs('admin-billing',[['','الفواتير'],['prices','الأسعار'],['insurers','جهات التأمين'],['payments','المدفوعات']],active)+
    adminLedgerTable(active||'invoices',!!active);
}

function adminHospitalPage(tab) {
  const active=['hours','notifications','backup'].includes(tab)?tab:'';
  const heading=adminHeading('admin-facilities','بيانات المستشفى وهيكله وساعات العمل والإشعارات والنسخ الاحتياطي.')+
    adminTabs('admin-facilities',[['','هيكل المستشفى'],['hours','ساعات العمل والحجز'],['notifications','الإشعارات'],['backup','النسخ الاحتياطي']],active);
  const sections={
    '':adminFacilitiesPage,
    hours:()=>adminSection('ساعات العمل والحجز',adminTable(['الطبيب','العيادة','أيام العمل','أوقات الحجز','الإجراء'],
      Object.entries(bookingDirectory()).map(([name,d])=>[esc(name),esc(d.clinic),esc(d.days.map(day=>bookingDayNames[day]).join('، ')),
        `<bdi>${esc(d.hours[0])}–${esc(d.hours.at(-1))}</bdi>`,link('تعديل','admin-doctor/'+encodeURIComponent(name),'secondary small')]))),
    notifications:()=>adminSection('تنبيهات التشغيل',adminAlerts()),
    backup:()=>adminSection('النسخ الاحتياطي المحلي','<p>تنزيل سجلات النسخة التجريبية بصيغة JSON. يتضمن التنزيل بيانات السجلات دون بيانات الدخول أو محتوى الملفات المرفوعة.</p>',
      button('تنزيل السجلات','admin-backup','secondary')+button('استعادة بيانات التجربة','reset','danger'))
  };
  return heading+sections[active]();
}

const adminReportCards = [
  ['bookings','تقرير الحجوزات','الحجوزات والزيارات حسب الفترة'],
  ['patients','المرضى الجدد','الملفات المسجلة خلال الفترة'],
  ['doctors','أداء الأطباء','الحجوزات والزيارات المعتمدة لكل طبيب'],
  ['beds','إشغال الأسرّة','الأسرّة وحالات الإشغال المسجلة'],
  ['stock','المخزون','الأرصدة وحد إعادة الطلب'],
  ['revenue','الإيرادات','المدفوعات المسجلة خلال الفترة']
];
let adminReportPeriod='month';
let adminReportDepartment='';

function adminReportData(key) {
  const today=adminToday();
  const start=adminReportPeriod==='month'?today.slice(0,7)+'-01':adminReportPeriod==='today'?today:'';
  const inPeriod=date=>!start || (date>=start&&date<=today);
  const directory=bookingDirectory();
  const inDepartment=doctor=>!adminReportDepartment||directory[doctor]?.department===adminReportDepartment;
  const appointments=db.appointments.filter(a=>inPeriod(a.date)&&inDepartment(a.doctor));
  const visits=db.visits.filter(v=>v.approved&&inPeriod(bookingDateFromVisit(v.date))&&inDepartment(v.doctor));
  switch (key) {
    case 'bookings': return [['المريض','الطبيب','الموعد','الحالة'],appointments.map(a=>[adminPatientName(a.patient),a.doctor,a.date+' · '+a.time,a.status])];
    case 'patients': return [['الاسم','رقم الملف','التسجيل'],db.patients.filter(p=>p.registeredDate&&inPeriod(p.registeredDate)&&inDepartment(p.doctor)).map(p=>[p.name,p.id,p.registeredDate])];
    case 'doctors': return [['الطبيب','الحجوزات','الزيارات المعتمدة'],Object.keys(directory).filter(inDepartment).map(name=>
      [name,appointments.filter(a=>a.doctor===name).length,visits.filter(v=>v.doctor===name).length])];
    case 'beds': return [['السرير','الموقع','الحالة'],adminBeds().map(b=>[b.name,adminFacilityPath(b),adminBedStates[b.state]||'—'])];
    case 'stock': return [['الصنف','الرصيد','حد إعادة الطلب'],adminInventory().map(i=>[i.name,i.quantity,i.minimum])];
    case 'revenue': return [['الفاتورة','التاريخ','المبلغ بالجنيه'],adminLedgerRows('payments').filter(p=>inPeriod(p.date)&&inDepartment(
      db.patients.find(person=>person.id===adminLedgerRows('invoices').find(i=>i.id===p.invoice)?.patient)?.doctor)).map(p=>[p.invoice,p.date,p.amount])];
    default: return [[],[]];
  }
}

function adminReportHub(tab) {
  const active=['audit','roles'].includes(tab)?tab:'';
  const heading=adminHeading('admin-reports','التقارير التشغيلية وسجل التدقيق وصلاحيات الأدوار.')+
    adminTabs('admin-reports',[['','التقارير'],['audit','سجل التدقيق'],['roles','الأدوار والصلاحيات']],active);
  if (active==='audit') return heading+adminSection('سجل التدقيق',adminTable(['الإجراء','المرجع','الدور','الوقت'],
    db.audit.map(row=>[esc(row.action),esc(row.resource),esc(row.role),esc(row.time)]),'لا توجد إجراءات مسجلة.'));
  if (active==='roles') return heading+adminSection('الأدوار والصلاحيات',adminTable(['الدور','الصفحات المتاحة'],Object.entries(allowed).map(([key,routes])=>
    [esc(roles[key]),routes.map(r=>esc(adminTitles[r]||shortNav[r]||navs.find(n=>n[0]===r)?.[2]||r)).join('، ')])));
  const confirmed=db.appointments.filter(a=>a.status==='مؤكد').length;
  return heading+adminSummary([['المرضى المسجلون',db.patients.length,'إجمالي الملفات'],
    ['الحجوزات المؤكدة',confirmed,'الحجوزات المسجلة'],['الأطباء في الدليل',Object.keys(bookingDirectory()).length,'إجمالي الدليل']])+
    `<div class="admin-filters">${adminSelect('الفترة','report-period',[['month','هذا الشهر'],['today','اليوم'],['all','كل الفترات']],adminReportPeriod,'id="report-period"')}
    ${adminSelect('القسم','report-department',[['','كل الأقسام'],...bookingDepartments().map(d=>[d,d])],adminReportDepartment,'id="report-department"')}</div>
    <div class="admin-report-grid">${adminReportCards.map(([key,title,detail])=>adminSection(title,`<p>${detail}</p>
      <div class="admin-quick-links">${[['view','عرض'],['pdf','PDF'],['csv','CSV لـ Excel']].map(([format,label])=>
        button(label,'admin-report-output','secondary',`data-key="${key}" data-format="${format}" aria-label="${label} · ${title}"`)).join('')}</div>`)).join('')}</div>
    <p class="muted">تقارير الأسرّة والمخزون تعرض الحالة المسجلة حاليًا.</p>`;
}

function adminDownload(name, data, type) {
  const url=URL.createObjectURL(new Blob([data],{type}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function adminReportOutput(key, format) {
  const report=adminReportCards.find(([id])=>id===key);
  if (!report) return;
  const [headers,rows]=adminReportData(key);
  if (format==='csv') {
    const csvCell=value=>{
      const text=String(value??'');
      const safe=/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)?"'"+text:text;
      return '"'+safe.replaceAll('"','""')+'"';
    };
    adminDownload('mnu333-'+key+'.csv','\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    log('تصدير تقرير',report[1]);
    return;
  }
  modal(report[1],`<div class="admin-printable"><h2>${report[1]}</h2>${adminTable(headers,rows.map(row=>row.map(esc)))}</div>`,
    button('طباعة / حفظ PDF','admin-print-report','primary')+button('إغلاق','close','secondary'));
  if (format==='pdf') window.print();
}

function bindAdminHub() {
  const editor=$('#admin-doctor-editor');
  if (editor) editHospitalDoctor(editor.dataset.doctor,editor);
  $('#admin-upload-form')?.addEventListener('submit',adminUploadDocument);
  const filters=$('#admin-document-filters');
  const filterDocuments=()=>{
    const query=filters.querySelector('[name=query]').value.trim().toLowerCase();
    const kind=filters.querySelector('[name=kind]').value;
    const department=filters.querySelector('[name=department]').value;
    const period=filters.querySelector('[name=period]').value;
    const directory=bookingDirectory();
    $('#admin-document-results').innerHTML=adminDocumentsTable(adminDocuments().filter(d=>
      [d.title,adminPatientName(d.patient),d.patient].some(value=>String(value??'').toLowerCase().includes(query)) &&
      (!kind||(d.kind||'مستند آخر')===kind) &&
      (!department||directory[db.patients.find(p=>p.id===d.patient)?.doctor]?.department===department) &&
      (!period||String(d.date).startsWith(adminToday().slice(0,7)))));
  };
  filters?.addEventListener('input',filterDocuments);
  for (const [id,update] of [['report-period',value=>{adminReportPeriod=value;}],['report-department',value=>{adminReportDepartment=value;}]]) {
    $('#'+id)?.addEventListener('change',event=>{update(event.target.value);render();$('#'+id)?.focus();});
  }
  const search=$('#admin-global-search');
  if (search && !search.dataset.bound) {
    search.dataset.bound='true';
    search.addEventListener('submit',event=>{
      event.preventDefault();
      const query=search.elements.term.value.trim().toLowerCase();
      if (query && isHospitalAdmin()) adminFind(query);
    });
  }
}

document.addEventListener('click',event=>{
  if (!isHospitalAdmin()) return;
  if (event.target.closest('[data-admin-search-link]')) closeModal();
  const action=event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action==='admin-add-entry') adminAddLedgerEntry(action.dataset.key);
  if (action.dataset.action==='admin-report-output') adminReportOutput(action.dataset.key,action.dataset.format);
  if (action.dataset.action==='admin-open-approved') {
    const {visit,patient,kind}=action.dataset;
    const report=adminDocuments().find(d=>d.text&&d.visit===visit&&d.patient===patient&&d.kind===kind);
    if (report) {
      log('عرض مستند معتمد',visit);
      modal(esc(report.title),`<p>${esc(report.text).replaceAll('\n','<br>')}</p>`);
    }
  }
  if (action.dataset.action==='admin-backup') {
    const records={...db};
    delete records.credentials;
    adminDownload('mnu333-admin-backup.json',JSON.stringify(records,null,2),'application/json');
  }
});
