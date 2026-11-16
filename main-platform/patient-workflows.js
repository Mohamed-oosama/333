'use strict';

const patientRatingTopics=['الاحترام','وضوح الشرح','وقت الانتظار','نظافة العيادة'];

function patientRatingPage(visit,source) {
  const saved=myDeskRows('visitRatings').find(row=>row.visit===visit.id&&row.source===source);
  const route=patientBookingRoute(visit.id,source==='clinical'?'clinical':'');
  const body=saved?patientScreenEmpty('شكرًا، تم حفظ تقييمك.',link('تفاصيل الزيارة',route,'secondary')):
    `<form id="patient-rating" class="patient-service-form" data-id="${esc(visit.id)}" data-source="${source}">
      <div class="patient-stars" role="group" aria-label="تقييم من خمس نجوم">${[1,2,3,4,5].map(value=>`<label>
        <input type="radio" name="score" value="${value}" aria-label="${value} من 5" required><span aria-hidden="true">★</span></label>`).join('')}</div>
      <div class="patient-screen-pills">${patientRatingTopics.map((topic,index)=>`<label class="patient-choice">
        <input type="checkbox" name="topic" value="${index}"><span>${topic}</span></label>`).join('')}</div>
      ${deskText('تعليق (اختياري)','comment',false)}<p class="form-error" role="alert"></p>
      <button type="submit" class="button primary">إرسال التقييم</button></form>`;
  return `<div class="patient-screen">${patientScreenPanel('',`<h1>كيف كانت زيارتك مع ${esc(visit.doctor||'الطبيب')}؟</h1>
    <p>${patientServiceDate(visit.date)}</p>${body}`,'','patient-centered-card')}</div>`;
}

function patientRequestReceipt(id,tracking=false) {
  const row=patientServiceRecord(db.patientRequests||[],id);
  const actions='<div class="patient-screen-actions">'+(row&&!tracking?
    link('متابعة الطلب','patient-requests/track/'+encodeURIComponent(row.id),'primary'):
    link('كل الطلبات','patient-requests/requests','primary'))+link('الرئيسية','portal','secondary')+'</div>';
  const details=row?`<p>${esc(row.kind)}</p><div class="patient-info-box"><p>رقم الطلب</p>
    <strong class="patient-booking-number"><bdi>${esc(row.id)}</bdi></strong><p>الحالة · ${esc(row.status)}</p></div>
    ${tracking?`<p class="patient-shared-plan">${esc(row.detail)}</p>${row.reply?`<p>رد الإدارة · ${esc(row.reply)}</p>`:''}`:''}`:patientScreenEmpty('الطلب غير متاح في ملفك');
  return `<div class="patient-screen">${patientScreenPanel('',(row&&!tracking?`<span class="patient-success-icon" aria-hidden="true">${icon('check')}</span>`:'')+
    `<h1>${row?(tracking?'متابعة الطلب':'تم إرسال طلبك'):'متابعة الطلب'}</h1>`+details+actions,'','patient-centered-card')}</div>`;
}

function patientMedicationsPage() {
  const reports=db.sharedReports.filter(row=>row.patient===patientSessionId()&&(row.medications||row.prescriptions?.length));
  const current=[];
  const history=[];
  for (const report of reports.slice().reverse()) {
    const visit=db.visits.find(row=>row.id===report.visit&&row.patient===report.patient);
    for (const drug of report.prescriptions||[]) {
      const duration=String(drug.duration||'').trim().match(/^(\d+)\s*(?:يوم|أيام|days?)$/i);
      const start=healthArchiveDate(report.date);
      const days=duration&&start?Number(duration[1])-Math.floor((healthArchiveDate(receptionToday())-start)/86400000):null;
      const entry=deskRow(drug.label,[drug.dose,drug.frequency,visit?.doctor||report.doctor].filter(Boolean).join(' · '),
        days>0?'متبقي '+days+' أيام':'',patientRenewalButton(drug.label||''));
      (days>0?current:history).push(entry);
    }
    if (!report.prescriptions?.length&&report.medications) history.push(deskRow('روشتة '+healthArchiveDateLabel(report.date),report.medications));
  }
  return '<section class="patient-screen">'+patientScreenHeading('أدويتي',patientRenewalButton('','primary'))+
    patientScreenPanel('الأدوية الحالية',current.join('')||patientScreenEmpty('تظهر هنا الأدوية المشتركة ذات المدة المسجلة'))+
    patientScreenPanel('الروشتات السابقة',history.join('')||patientScreenEmpty('لا توجد روشتات بعد'))+'</section>';
}

function patientRenewalButton(name,tone='secondary') {
  return `<button type="button" class="button ${tone}" data-patient-command="renew" data-name="${esc(name)}">طلب تجديد روشتة</button>`;
}

function patientSupportContent() {
  const hospital=hospitalProfile();
  const number=String(hospital.phone||'').replace(/[\s()-]/g,'');
  const phone=/^\+?\d{6,16}$/.test(number)?'tel:'+number:'';
  const cards=[
    ['اتصال بالاستقبال',hospital.phone||'رقم الاستقبال غير مسجل',phone],
    ['محادثة مع الاستقبال','تابع رسائلك داخل البوابة','#patient-messages'],
    ['الأسئلة الشائعة','الحجز، النتائج، الفواتير','#patient-requests/faq'],
    ['موقع المستشفى',hospital.address||'العنوان غير مسجل',hospital.address?'#patient-requests/location':'']
  ];
  return `<section class="patient-emergency-banner"><div><h2>حالة طارئة؟</h2><p>اتصل بالإسعاف فورًا</p></div>
    <div class="patient-screen-actions"><a class="button danger" href="tel:123">اتصل بالإسعاف <bdi>123</bdi></a>
    ${link('دليل الطوارئ','patient-emergency','secondary')}</div></section>
    <div class="patient-four">${cards.map(([title,detail,href])=>href?
      `<a class="patient-screen-panel patient-shortcut" href="${href}"><strong>${title}</strong><span>${esc(detail)}</span></a>`:
      `<div class="patient-screen-panel patient-shortcut"><strong>${title}</strong><span>${esc(detail)}</span></div>`).join('')}</div>`;
}

function patientSupportDetail(view) {
  const body=view==='faq'?[
    ['أين أتابع حجزي؟','من مواعيدي تقدر تعرض حالة الحجز أو تغيّر موعده.','appointments'],
    ['أين تظهر النتائج؟','تظهر النتائج التي تُتاح لك في صحتي.','patient-attachments/tests'],
    ['أين أجد الفاتورة؟','تظهر الفواتير والإيصالات في حسابي.','patient-billing']
  ].map(([title,detail,route])=>deskRow(title,detail,'',link('افتح القسم',route,'secondary small'))).join(''):
    `<p>${esc(hospitalProfile().address||'العنوان غير مسجل')}</p>`;
  return '<section class="patient-screen">'+patientScreenPills(patientInboxNav,'support','الطلبات والرسائل')+
    patientScreenHeading(view==='faq'?'الأسئلة الشائعة':'موقع المستشفى',link('الدعم والتواصل','patient-requests/support','secondary'))+
    patientScreenPanel('',body)+'</section>';
}

function bindPatientWorkflows() {
  $('#patient-payment')?.addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget;
    deskRefresh();
    patientPayPreview(form.dataset.id,form.elements.method.value);
  });
  const precheck=$('#patient-precheck-form');
  if (precheck) deskSubmit('#patient-precheck-form',deskPatient,values=>{
    const row=patientServiceRecord(db.appointments,precheck.dataset.id);
    if (!canEditBooking(row)||row.status!=='مؤكد') return 'الموعد غير متاح. افتح مواعيدي للتحقق من حالته.';
    if (!['identity','insurance','medication','consent'].every(key=>values[key]==='on')) return 'راجع جميع الخطوات أولًا.';
    row.precheck={at:deskNow()};
    log('تجهيز الزيارة قبل الوصول',row.id);
  });
  const rating=$('#patient-rating');
  if (rating) {
    rating.addEventListener('change',()=>{
      const score=Number(rating.elements.score.value);
      rating.querySelectorAll('[name=score]').forEach(input=>input.parentElement.classList.toggle('selected',Number(input.value)<=score));
    });
    deskSubmit('#patient-rating',deskPatient,({score,comment})=>{
      const {source,id}=rating.dataset;
      const row=patientServiceRecord(source==='clinical'?db.visits:db.appointments,id);
      if (!(source==='clinical'?row?.approved:row?.status==='مكتمل')) return 'التقييم متاح للزيارة المكتملة.';
      if (myDeskRows('visitRatings').some(item=>item.visit===id&&item.source===source)) return 'تم حفظ تقييم هذه الزيارة بالفعل.';
      if (!/^[1-5]$/.test(score)||comment.length>500) return 'اختر عدد النجوم وراجع التعليق.';
      const topics=new FormData(rating).getAll('topic').map(value=>patientRatingTopics[Number(value)]).filter(Boolean);
      deskAdd('visitRatings',{patient:deskPatient(),visit:id,source,score:Number(score),topics,comment});
    });
  }
}
