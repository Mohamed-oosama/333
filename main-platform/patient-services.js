'use strict';

const patientServiceTitles = {
  'patient-services':'خدماتي', 'patient-billing':'الفواتير والمدفوعات',
  'patient-notices':'الإشعارات', 'patient-requests':'طلباتي', 'patient-journey':'رحلة الزيارة'
};
const patientService = (title, body) => healthArchivePanel(title,body);
const patientServiceEmpty = text => '<p class="health-archive-empty">'+text+'</p>';
const patientServiceHead = (route, sub, action='') => pageHead(patientServiceTitles[route],sub,action,'بوابة المريض');
const patientServiceWrap = body => '<div class="patient-service-stack">'+body+'</div>';
const patientSessionId = () => demoSession?.role==='patient' ? demoSession.patientId : null;
function patientServiceRecord(rows,id) {
  const patientId=patientSessionId();
  return patientId ? rows.find(row=>row.id===id&&row.patient===patientId) : undefined;
}
const patientServiceDate = date => date ? esc(healthArchiveDateLabel(date)) : '—';

function patientApprovedResults(id) {
  return (db.releasedResults||[]).filter(r=>r.patient===id&&r.approvedBy&&r.approvedAt&&
    db.visits.some(v=>v.id===r.visit&&v.patient===id&&v.approved&&v.doctor===r.approvedBy)).slice()
    .sort((a,b)=>b.date.localeCompare(a.date)||b.approvedAt.localeCompare(a.approvedAt));
}

function patientResultPanels(results, category) {
  const lab=results.filter(r=>r.kind==='lab');
  const groups=new Map();
  for (const result of lab) {
    const key=JSON.stringify([result.testCode,result.unit]);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(result);
  }
  const readings=[...groups.values()].map(group=>{
    const newest=group[0];
    return `<section class="patient-result-group"><h3>${esc(newest.label)} · <bdi>${esc(newest.unit)}</bdi></h3>
      ${link('تفاصيل أحدث نتيجة','patient-attachments/result/'+encodeURIComponent(newest.id),'secondary')}
      ${adminTable(['تاريخ العينة','القيمة','النطاق المرجعي المبلّغ','موقع القيمة من النطاق','المعتمد'],group.map(r=>{
        const hasRange=Number.isFinite(r.low)&&Number.isFinite(r.high);
        const position=!hasRange?'غير محدد':r.value<r.low?'أقل من النطاق':r.value>r.high?'أعلى من النطاق':'داخل النطاق';
        return [patientServiceDate(r.date),`<bdi>${esc(r.value)}</bdi>`,
          hasRange?`<bdi>${esc(r.low)}–${esc(r.high)}</bdi>`:'—',position,esc(r.approvedBy)];
      }))}${group.length>1?'<p class="muted">القياسات مرتبة من الأحدث للأقدم لنفس الفحص والوحدة.</p>':''}</section>`;
  }).join('');
  const reviewed=results.filter(r=>r.kind==='review').map(r=>`<article class="patient-service-row"><div>
    <a href="#patient-attachments/result/${encodeURIComponent(r.id)}"><strong>${esc(r.label)}</strong></a><p class="patient-result-note">${esc(r.text)}</p><small>راجعه واعتمده ${esc(r.approvedBy)} · ${patientServiceDate(r.approvedAt)}</small>
    </div>${badge('مراجعة الطبيب','teal')}</article>`).join('');
  return category==='values'?patientScreenPanel('القيم الرقمية للتحاليل',readings||patientScreenEmpty('لا توجد قياسات معتمدة بعد')):reviewed;
}

function patientPrescriptionPanels(reports) {
  const entries=reports.filter(r=>r.prescriptions?.length||r.medications);
  return patientScreenPanel('الروشتات والأدوية المشتركة',entries.length ? entries.map(r=>
    `<section class="patient-result-group"><h3>روشتة زيارة ${patientServiceDate(r.date)}</h3>
      ${r.visit?link('تفاصيل الروشتة','patient-attachments/prescription/'+encodeURIComponent(r.visit),'secondary'):''}
      ${r.prescriptions?.length?adminTable(['الدواء','الجرعة','التكرار','المدة','طريقة الاستخدام','تعليمات الطبيب'],
        r.prescriptions.map(row=>[row.label,row.dose,row.frequency,row.duration,row.route,row.instructions].map(value=>esc(value||'—')))):
        `<p class="patient-result-note">${esc(r.medications)}</p>`}</section>`
  ).join('') : patientScreenEmpty('ستظهر الروشتة هنا عندما يشاركها معك الطبيب'));
}

function doctorReleaseResult(id) {
  const session=demoSession;
  if (session?.role!=='doctor'||!doctorCanAccess(id)) return;
  const doctor=currentDoctor();
  const visits=db.visits.filter(v=>v.patient===id&&v.approved&&v.doctor===doctor);
  if (!visits.length) { toast('اعتمد زيارة للمريض أولًا.');return; }
  modal('مشاركة نتيجة مع المريض',`<form id="doctor-release-result" class="patient-service-form">
    ${adminSelect('الزيارة المعتمدة','visit',visits.map(v=>[v.id,healthArchiveDateLabel(v.date)+' · '+v.id]),visits.at(-1).id)}
    ${adminSelect('نوع المشاركة','kind',[['lab','قياس مختبر رقمي'],['review','تقرير مراجعة نتيجة مدعومة بالنماذج']], 'lab')}
    ${field('اسم النتيجة','label','','text','required maxlength="100"')}
    ${field('تاريخ الفحص','date',bookingDateKey(new Date()),'date','required')}
    <div class="patient-result-fields" id="doctor-release-lab">
      ${field('رمز الفحص من المختبر','testCode','','text','required maxlength="40"')}
      ${field('الوحدة','unit','','text','required maxlength="24"')}
      ${field('القيمة','value','','number','required step="any"')}
      ${field('أقل قيمة مرجعية (اختياري)','low','','number','step="any"')}
      ${field('أعلى قيمة مرجعية (اختياري)','high','','number','step="any"')}
    </div><label class="field" id="doctor-release-review" hidden><span>تفسير الطبيب المعتمد</span>
      <textarea name="text" rows="4" maxlength="1200" class="input" disabled></textarea></label>
    <label><input type="checkbox" name="approved" required> راجعت النتيجة وأوافق على مشاركتها مع المريض.</label>
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">اعتماد ومشاركة</button></form>`);
  const form=$('#doctor-release-result');
  form.elements.kind.addEventListener('change',()=>{
    const lab=form.elements.kind.value==='lab';
    $('#doctor-release-lab').hidden=!lab;
    $('#doctor-release-review').hidden=lab;
    $$('#doctor-release-lab input').forEach(input=>{input.disabled=!lab;});
    form.elements.text.disabled=lab;
    form.elements.text.required=!lab;
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (demoSession!==session||session.role!=='doctor') return;
    db=readLocalDatabase()||db;
    const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,value.trim()]));
    const {visit,kind,label,date,testCode,unit,text}=values;
    if (!doctorCanAccess(id)||!db.visits.some(v=>v.id===visit&&v.patient===id&&v.approved&&v.doctor===doctor)) return;
    const number=key=>values[key]!==undefined&&values[key]!==''?Number(values[key]):null;
    const value=number('value'),low=number('low'),high=number('high');
    if (!values.approved||!label||!healthArchiveDate(date)||!['lab','review'].includes(kind)||
      (kind==='lab'&&(!testCode||!unit||!Number.isFinite(value)||(low===null)!==(high===null)||
        (low!==null&&(!Number.isFinite(low)||!Number.isFinite(high)||low>high))))||(kind==='review'&&!text)) {
      form.querySelector('[role=alert]').textContent='راجع بيانات النتيجة والوحدة والنطاق المرجعي.';
      return;
    }
    const entry={id:'RESULT-'+crypto.randomUUID(),patient:id,visit,kind,label,date,
      approvedBy:doctor,approvedAt:new Date().toISOString(),...(kind==='lab'?{testCode:testCode.toUpperCase(),unit,value,low,high}:{text})};
    (db.releasedResults ||= []).push(entry);
    log('اعتماد ومشاركة نتيجة',entry.id);
    closeModal();toast('تمت مشاركة النتيجة.');
  });
}

function adminPatientRequestsPage() {
  const requests=(db.patientRequests||[]).slice().reverse();
  return adminHeading('admin-patient-requests','طلبات المرضى والشكاوى ومتابعة الردود.')+adminSection('الطلبات المسجلة',
    adminTable(['المريض','الطلب','الحالة','الإجراء'],requests.map(item=>[
      esc(adminPatientName(item.patient)),esc(item.kind),esc(item.status),
      `<button class="button secondary small" data-admin-patient-request="${esc(item.id)}">فتح الطلب</button>`
    ]),'لا توجد طلبات مسجلة.'));
}

function adminReviewPatientRequest(id) {
  if (!isHospitalAdmin()) return;
  const request=(db.patientRequests||[]).find(item=>item.id===id);
  if (!request) return;
  const states=['قيد المراجعة','مقبول','مكتمل','مرفوض'];
  modal(esc(request.kind),`<form id="admin-patient-request" class="patient-service-form"><p>${esc(request.detail)}</p>
    ${request.feedbackType?`<p>${esc(request.feedbackType)} · ${esc(request.department)} · ${request.callback?'يرغب في التواصل':'بدون طلب تواصل'}</p>`:''}
    ${adminSelect('الحالة','status',states.map(value=>[value,value]),request.status)}
    <label class="field"><span>رد يظهر للمريض</span><textarea name="reply" rows="3" maxlength="500" class="input">${esc(request.reply||'')}</textarea></label>
    <button class="button primary" type="submit">حفظ الرد</button></form>`);
  $('#admin-patient-request').addEventListener('submit',event=>{
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    db=readLocalDatabase()||db;
    const current=(db.patientRequests||[]).find(item=>item.id===id);
    const {status,reply}=Object.fromEntries(new FormData(event.target));
    if (!current||!states.includes(status)||reply.length>500) return;
    Object.assign(current,{status,reply:reply.trim(),updatedAt:new Date().toISOString()});
    log('تحديث طلب مريض',id);closeModal();render();toast('تم حفظ الرد.');
  });
}

function patientServicesPage() {
  const groups=[
    ['صحتي',[['الأرشيف الطبي والفحوصات','patient-attachments'],['تعليمات الطبيب والروشتات','patient-reports'],
      ['المختبر والأشعة','patient-diagnostics'],['الرعاية عن بُعد والمنزلية','patient-care']]],
    ['المواعيد والزيارات',[['مواعيدي ورحلة الزيارة','appointments'],['دليل الأطباء','patient-doctors'],['قائمة انتظار المواعيد','appointment-waitlist']]],
    ['الحساب والتواصل',[['الفواتير والمدفوعات','patient-billing'],['التأمين والتغطية','patient-insurance'],
      ['الإشعارات','patient-notices'],['الطلبات والشكاوى','patient-requests'],['رسائل الاستقبال','patient-messages'],
      ['الأسرة والتفويض','patient-family'],['بياناتي','patient-profile']]]
  ];
  return patientServiceHead('patient-services','اختار الخدمة اللي تحتاجها من حسابك.')+
    `<div class="patient-service-grid">${groups.map(([title,items])=>patientService(title,
      '<div class="patient-service-links">'+items.map(([label,route])=>link(label,route,'secondary')).join('')+'</div>')).join('')}</div>`+
    patientServiceWrap(patientStaySummary());
}

function patientStaySummary() {
  const stays = receptionStays().filter(stay=>stay.patient===patientSessionId()).slice().reverse();
  const stayRows = records=>records.map(stay=>{
    const bed=adminBeds().find(item=>item.id===stay.bed);
    return deskRow(bed?adminFacilityPath(bed):'الموقع غير مسجل',
      'دخول '+healthArchiveDateLabel(stay.admitted)+(stay.discharge?' · خروج '+healthArchiveDateLabel(stay.discharge):''));
  }).join('');
  const past = stays.filter(stay=>stay.discharge);
  return patientScreenPanel('إقامتي الحالية',stayRows(stays.filter(stay=>!stay.discharge))||
    '<div class="patient-screen-empty patient-stay-empty"><p>لا توجد إقامة حالية مسجلة في ملفك</p></div>')+
    (past.length?patientScreenPanel('الإقامات السابقة',stayRows(past)):'');
}

function patientVisitDate(date,time) {
  const label = esc(healthArchiveDateLabel(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  return label+(time?` · <bdi>${esc(time)}</bdi>`:'');
}

function patientVisitRelated(visit) {
  if (!visit) return patientScreenEmpty('لا نتائج أو تعليمات مشاركة بعد');
  const visits = db.visits.filter(row=>row.patient===visit.patient&&row.date===visit.date&&row.approved);
  const reports = db.sharedReports.filter(row=>row.patient===visit.patient&&
    (row.visit===visit.id||(!row.visit&&row.date===visit.date&&visits.length===1)));
  const notes = reports.map(row=>row.instructions||row.plan).filter(Boolean).map(note=>`<p class="patient-shared-plan">${esc(note)}</p>`).join('');
  const prescriptions = reports.some(row=>row.medications||row.prescriptions?.length)?link('عرض الروشتات المشتركة','patient-reports','secondary'):'';
  const files = db.attachments.filter(row=>row.patient===visit.patient&&row.visit===visit.id).map(healthArchiveFileRow).join('');
  const results = patientApprovedResults(visit.patient).filter(row=>row.visit===visit.id);
  return notes+prescriptions+files+patientResultPanels(results,'reports')+
    (results.some(row=>row.kind==='lab')?patientResultPanels(results,'values'):'')||
    patientScreenEmpty('لا نتائج أو تعليمات مشاركة بعد');
}

function patientVisitOverview(record, visit, doctor, status, bookingId) {
  const followup = doctor&&doctor.active!==false?link('حجز متابعة','appointments/book/'+encodeURIComponent(record.doctor),'primary'):'';
  const rating = status==='تمت الزيارة'?link('قيّم الزيارة',patientBookingRoute(bookingId||visit.id,bookingId?'rating':'clinical-rating'),'secondary'):'';
  const actions = `<div class="patient-screen-actions">${followup}<button type="button" class="button secondary"
    data-patient-command="visit-report" data-visit="${esc(visit?.id||'')}" data-booking="${esc(bookingId||'')}">طلب تقرير الزيارة</button>${rating}</div>`;
  return `<div class="patient-screen"><p><a href="#appointments">مواعيدي</a> / تفاصيل الزيارة</p>
    ${patientScreenHeading(esc([record.type||'زيارة سريرية',doctor?.specialty].filter(Boolean).join(' ')))}
    <div class="patient-two patient-visit-layout">${patientScreenPanel(esc(record.doctor||'العيادة'),
      `<div><p>${patientVisitDate(record.date,record.time)}</p><p>${esc(doctor?.location||doctor?.clinic||'الموقع غير مسجل')}</p></div>
      ${bookingId?patientBookingLabel(bookingId):''}${actions}`,
      badge(esc(status),'teal'))}
    ${patientScreenPanel('مرتبط بالزيارة',patientVisitRelated(visit))}</div></div>`;
}

function patientJourneyPage(id, view) {
  if (view==='clinical'||view==='clinical-rating') {
    const clinical = patientServiceRecord(db.visits,id);
    if (clinical?.approved&&view==='clinical-rating') return patientRatingPage(clinical,'clinical');
    if (clinical?.approved) return patientVisitOverview(clinical,clinical,bookingDirectory()[clinical.doctor],'تمت الزيارة');
  }
  const a=patientServiceRecord(db.appointments,id);
  const heading=patientServiceHead('patient-journey','تابع حالة الحجز والخطوة التالية.',link('مواعيدي','appointments','secondary'));
  if (!a) return heading+patientServiceWrap(patientService('الموعد',patientServiceEmpty('الموعد غير متاح في ملفك.')));
  const doctor=bookingDirectory()[a.doctor];
  if (view==='rating'&&a.status==='مكتمل') return patientRatingPage(a,'booking');
  if (a.status==='مؤكد'&&canEditBooking(a)&&view==='precheck') return patientPrecheckPage(a);
  if (a.status==='مؤكد'&&canEditBooking(a)&&view==='prepare') return patientPreparationPage(a);
  if (a.status==='مؤكد'&&canEditBooking(a)&&view!=='details') return patientBookingReceipt(a);
  if (a.status==='بانتظار التأكيد'&&canEditBooking(a)&&view==='receipt') return patientBookingReceipt(a);
  const visit=db.visits.find(v=>v.patient===a.patient&&v.appointmentId===a.id&&v.approved);
  if (a.status==='مكتمل'||(!canEditBooking(a)&&a.status==='مؤكد')) {
    return patientVisitOverview(a,visit,doctor,a.status==='مكتمل'?'تمت الزيارة':'موعد سابق',a.id);
  }
  const rank=a.status==='مكتمل'?5:a.queueState==='in-consultation'?4:a.queueState==='called'?3:
    a.status==='تم تسجيل الوصول'?2:a.status==='مؤكد'?1:0;
  const steps=['طلب الموعد','تأكيد الحجز','تسجيل الوصول','النداء','داخل الكشف','اكتملت الزيارة'];
  const times=[a.createdAt,a.confirmedAt,a.arrivalAt,a.calledAt,a.consultationAt,a.completedAt||visit?.approvedAt];
  const timeline=a.status==='لم يحضر'?patientServiceEmpty('الاستقبال سجّل عدم الحضور. يمكنك حجز موعد جديد.'):
    a.status==='ملغي'?patientServiceEmpty('تم إلغاء الموعد. يمكنك حجز موعد جديد من مواعيدي.'):
    `<ol class="patient-journey">${steps.map((step,index)=>a.source==='walk-in'&&index<2?'':`<li ${index===rank?'aria-current="step"':''} class="${index<=rank?'reached':''}">
      <strong>${step}</strong><small>${times[index]?esc(new Date(times[index]).toLocaleString('ar-EG')):index<rank?'تم':index===rank?'الحالة الحالية':'في انتظار التحديث'}</small></li>`).join('')}</ol>`;
  const next=a.status==='لم يحضر'?'اتسجل عدم الحضور.':a.status==='ملغي'?'الموعد ملغي.':rank===0?'استنى تأكيد الاستقبال.':rank===1?'راجع الاستقبال لتسجيل وصولك عند الحضور.':
    rank===2?'استنى النداء عند العيادة.':rank===3?'اتجه إلى العيادة بعد النداء.':rank===4?'الكشف جارٍ.':'راجع الأرشيف لما الطبيب يشارك مستندات الزيارة.';
  const details=`<dl class="patient-service-facts">
    <div><dt>${a.source==='walk-in'?'رقم الزيارة':'رقم الحجز'}</dt><dd><bdi>${esc(a.id)}</bdi></dd></div>
    <div><dt>الطبيب</dt><dd>${esc(a.doctor)}</dd></div>
    <div><dt>${a.source==='walk-in'?'تاريخ الوصول':'الموعد'}</dt><dd>${patientServiceDate(a.date)} · <bdi>${esc(a.time)}</bdi></dd></div>
    <div><dt>العيادة والمكان</dt><dd>${esc([doctor?.clinic,doctor?.branch,doctor?.location].filter(Boolean).join(' · ')||'غير مسجل')}</dd></div>
    ${a.reason?`<div><dt>سبب الزيارة</dt><dd>${esc(a.reason)}</dd></div>`:''}
    ${a.queueNumber?`<div><dt>رقم الانتظار</dt><dd><bdi>A${esc(a.queueNumber)}</bdi></dd></div>`:''}</dl>
    <p>${next}</p>${a.transfers?.length?'<p>تم تحويلك إلى '+esc(doctor?.clinic||a.doctor)+'.</p>':''}<div class="patient-service-links">
      ${canEditBooking(a)?button('تعديل الحجز','edit-booking','secondary',`data-id="${esc(a.id)}"`)+button('إلغاء الموعد','cancel-booking','secondary',`data-id="${esc(a.id)}"`):''}
      ${a.status==='مؤكد'&&canEditBooking(a)?`<button class="button secondary" data-patient-service="calendar" data-id="${esc(a.id)}">أضف للتقويم</button>`:''}
      ${a.status==='مؤكد'&&a.date===receptionToday()?deskAction('رمز وصول للكشك','kiosk-pass',a.id):''}
      ${visit?link('الأرشيف الطبي','patient-attachments','secondary'):''}</div>`;
  return heading+patientServiceWrap(patientService('تفاصيل الموعد',details)+patientService('خطوات الزيارة',timeline));
}

function patientBillingPage(id) {
  const invoices=adminLedgerRows('invoices').filter(i=>i.patient===patientSessionId()).slice().reverse();
  const heading=patientServiceHead('patient-billing','الفواتير والإيصالات المسجلة لك في المستشفى.',link('كل الخدمات','patient-services','secondary'));
  if (id) {
    const invoice=invoices.find(i=>i.id===id);
    if (!invoice) return heading+patientServiceWrap(patientService('الفاتورة',patientServiceEmpty('الفاتورة غير متاحة في ملفك.')));
    const lines=invoice.lines?.length ? invoice.lines : [{service:invoice.service,amount:invoice.amount}];
    const payments=adminLedgerRows('payments').filter(p=>p.invoice===invoice.id);
    const refunds=deskRows('refunds').filter(row=>row.invoice===invoice.id);
    return heading+patientServiceWrap(link('رجوع للفواتير','patient-billing','secondary')+
      patientService('تفاصيل الفاتورة '+esc(invoice.id),`<div class="patient-receipt">
        <p>${esc(patient().name)} · ${patientServiceDate(invoice.date)}</p>
        ${adminTable(['الخدمة','المبلغ'],lines.map(i=>[esc(i.service),esc(receptionMoney(i.amount))]))}
        <p>الإجمالي ${esc(receptionMoney(invoice.amount))} · المتبقي ${esc(receptionMoney(adminInvoiceBalance(invoice)))} · التأمين ${esc(invoice.insurer||'غير مسجل')}</p>
        <h3>حركات الفاتورة</h3>${adminTable(['التاريخ','المبلغ','الحركة'],[
          ...payments.map(p=>[patientServiceDate(p.date),esc(receptionMoney(p.amount)),esc(p.method||'دفعة')]),
          ...refunds.map(p=>[patientServiceDate(p.date),esc(receptionMoney(p.amount)),'استرداد تجريبي'])
        ])}
      </div><div class="patient-service-links"><button class="button secondary" data-patient-service="print">طباعة / حفظ PDF</button>
      ${link(adminInvoiceBalance(invoice)>0?'طرق الدفع':'عرض حالة الدفع','patient-pay/'+encodeURIComponent(invoice.id),'primary')}</div>`));
  }
  const total=invoices.reduce((sum,i)=>sum+adminInvoiceBalance(i),0);
  return heading+patientServiceWrap(patientService('المبالغ المستحقة',`<strong>${esc(receptionMoney(total))}</strong>`)+
    patientService('فواتيري',invoices.length ? invoices.map(i=>{
      const balance=adminInvoiceBalance(i);
      return `<article class="patient-service-row"><div><strong>${esc(i.service)}</strong><p>${esc(i.id)} · ${esc(receptionMoney(i.amount))}</p></div>
        ${badge(balance<=0?'مدفوعة':balance<i.amount?'مدفوعة جزئيًا':'مستحقة',balance<=0?'emerald':'amber')}
        ${link('التفاصيل والإيصال','patient-billing/'+encodeURIComponent(i.id),'secondary small')}</article>`;
    }).join('') : patientServiceEmpty('لا توجد فواتير مسجلة في ملفك.')));
}

const patientRequestKinds=['استخراج تقرير أو نسخة من الملف','طلب فحص','تصحيح بيانات طبية','استفسار فاتورة أو تأمين','تجديد روشتة','إحالة أو رأي ثانٍ',
  'رعاية منزلية','استشارة عن بُعد','شكوى أو اقتراح','مشاركة مستند طبي'];

function savePatientRequest(kind,detail,metadata={}) {
  const id=patientSessionId();
  if (!id||!patientRequestKinds.includes(kind)||!detail?.trim()||detail.length>400) return null;
  db=readLocalDatabase()||db;
  if (!db.patients.some(row=>row.id===id)) return null;
  const request={...metadata,id:'REQ-'+crypto.randomUUID().slice(0,12),patient:id,kind,detail:detail.trim(),
    date:new Date().toISOString(),status:'قيد المراجعة'};
  (db.patientRequests ||= []).push(request);
  if (log('إرسال طلب مريض',request.id)) return request;
  db.patientRequests.pop();
  db.audit.shift();
  return null;
}

function patientNoticeEntries(id) {
  return [
    ...patientReminders(id),
    ...appointmentWaitNotices(id),
    ...patientDeskNotices(id),
    ...db.appointments.filter(a=>a.patient===id).flatMap(a=>(a.transfers||[]).map(transfer=>({
      key:'transfer:'+a.id+':'+transfer.at+':'+transfer.to,title:'تحديث العيادة',
      detail:'تم تحويل الزيارة إلى '+transfer.to,date:transfer.at,route:'patient-journey/'+encodeURIComponent(a.id)
    }))),
    ...db.appointments.filter(a=>a.patient===id).map(a=>({
      key:'booking:'+a.id+':'+a.status+':'+a.date+':'+a.time+':'+(a.queueState||''),title:'موعد '+a.doctor,
      detail:[a.status,receptionQueueStates[a.queueState]?.label,healthArchiveDateLabel(a.date),a.time].filter(Boolean).join(' · '),date:a.noShowAt||a.completedAt||a.calledAt||a.arrivalAt||a.date,
      route:'patient-journey/'+encodeURIComponent(a.id)
    })),
    ...db.sharedReports.filter(r=>r.patient===id).map((r,index)=>({
      key:'report:'+(r.visit||r.date+':'+index),title:'تعليمات متابعة من الطبيب',detail:'تعليمات متاحة في ملفك.',date:r.date,route:'patient-reports'
    })),
    ...adminLedgerRows('invoices').filter(i=>i.patient===id).map(i=>({
      key:'invoice:'+i.id+':'+adminInvoiceBalance(i),title:'تحديث فاتورة',detail:i.id+' · المتبقي '+receptionMoney(adminInvoiceBalance(i)),date:i.date,
      route:'patient-billing/'+encodeURIComponent(i.id)
    })),
    ...(db.patientRequests||[]).filter(r=>r.patient===id).map(r=>({
      key:'request:'+r.id+':'+(r.updatedAt||r.status),title:r.kind,detail:r.status,date:r.updatedAt||r.date,route:'patient-requests'
    })),
    ...patientApprovedResults(id).map(r=>({
      key:'result:'+r.id,title:r.kind==='lab'?'نتيجة مختبر معتمدة':'تقرير مراجعة معتمد',detail:r.label,date:r.approvedAt,route:'patient-attachments/tests'
    }))
  ].sort((a,b)=>(healthArchiveDate(b.date)||0)-(healthArchiveDate(a.date)||0));
}

document.addEventListener('submit',event=>{
  const id=patientSessionId();
  if (!id||event.target.id!=='patient-service-request') return;
  event.preventDefault();
  const {kind,detail}=Object.fromEntries(new FormData(event.target));
  if (!patientRequestKinds.includes(kind)||!detail?.trim()||detail.length>400) {
    event.target.querySelector('[role=alert]').textContent='اختار نوع الطلب واكتب تفاصيله.';
    return;
  }
  const request=savePatientRequest(kind,detail);
  if (!request) {
    event.target.querySelector('[role=alert]').textContent='تعذّر حفظ الطلب. تحقق من إتاحة التخزين وأعد المحاولة.';
    return;
  }
  if ($('#modal-root .modal')?.contains(event.target)) closeModal();
  location.hash='patient-requests/sent/'+encodeURIComponent(request.id);
});

document.addEventListener('click',event=>{
  const release=event.target.closest('[data-doctor-release]');
  if (release) { doctorReleaseResult(release.dataset.doctorRelease);return; }
  const request=event.target.closest('[data-admin-patient-request]');
  if (request) { adminReviewPatientRequest(request.dataset.adminPatientRequest);return; }
  const id=patientSessionId();
  if (!id) return;
  const control=event.target.closest('[data-patient-service],[data-patient-notice]');
  if (!control) return;
  const {patientService:action,patientNotice}=control.dataset;
  if (action==='print'&&$('.patient-receipt')) window.print();
  if (action==='read-all'||patientNotice) {
    db=readLocalDatabase()||db;
    const keys=patientNoticeEntries(id).filter(item=>action==='read-all'||item.key===patientNotice).map(item=>item.key);
    const read=(db.patientNoticeRead ||= {});
    read[id]=[...new Set([...(read[id]||[]),...keys])];
    save();
    if (action==='read-all') render();
  }
  if (action==='calendar') {
    const a=patientServiceRecord(db.appointments,control.dataset.id);
    if (!a||!canEditBooking(a)||a.status!=='مؤكد') return;
    const clean=value=>String(value||'').replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replace(/[;,]/g,'\\$&');
    const stamp=value=>value.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    const start=a.date.replaceAll('-','')+'T'+a.time.replace(':','')+'00';
    const contents=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//'+HOSPITAL_BRAND_NAME+'//Appointments//AR','BEGIN:VEVENT',
      'UID:'+clean(a.id)+'@mnu333.demo','DTSTAMP:'+stamp(new Date()),'DTSTART;TZID=Africa/Cairo:'+start,
      'SUMMARY:'+clean('موعد · '+a.doctor),'LOCATION:'+clean(bookingDirectory()[a.doctor]?.location),
      'END:VEVENT','END:VCALENDAR',''].join('\r\n');
    adminDownload('mnuh333-appointment.ics',contents,'text/calendar;charset=utf-8');
  }
});
