'use strict';

const receptionNavigation = [
  ['dashboard','grid','لوحة الاستقبال'],['reception-checkin','clock','مكتب الاستقبال'],
  ['patients','users','المرضى'],['appointments','calendar','الحجوزات والجداول'],
  ['reception-billing','file','الحسابات والمدفوعات'],['reception-admissions','plus','الإقامة'],
  ['reception-reports','pulse','التقارير']
];
const receptionNavParent = {queue:'reception-checkin','reception-file':'patients','reception-schedule':'appointments'};
const receptionStates = {'مؤكد':'amber','مكتمل':'emerald','ملغي':'rose','تم تسجيل الوصول':'sky','بانتظار التأكيد':'gray'};
const receptionMoney = value => new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(value)+' ج.م';
const receptionGuard = () => role==='reception' && demoSession?.role==='reception' &&
  (!demoSession.staffId || !!activeReceptionStaff(demoSession));
function receptionRefreshRecords() {
  if (!receptionGuard()) return false;
  db=readLocalDatabase() || db;
  return true;
}
const receptionActions = () => button(icon('plus')+' تسجيل مريض','new-patient','primary')+button('حجز موعد','book','secondary');
const receptionBadge = status => badge(esc(status),receptionStates[status] || 'gray');
const receptionEmpty = text => `<p class="reception-empty">${text}</p>`;
const receptionVisitsToday = () => db.appointments.filter(a=>(a.queueDate||a.date)===receptionToday() && (a.queueNumber||a.status==='تم تسجيل الوصول'));
const receptionEmergency = patient => adminLedgerRows('emergency').some(e=>e.patient===patient&&e.date===receptionToday());
const receptionTable = (headers,rows,empty) => adminTable(headers,rows,empty);
let receptionDepartment='';
let receptionReportStart='';
let receptionReportEnd='';
let receptionReportClinic='';
let receptionDeskPatient='';

function receptionOverview() {
  const today=receptionToday();
  const {appointments,metrics}=receptionStats(today);
  const queue=receptionVisitsToday();
  const summary=new Map(metrics);
  const waiting=queue.filter(a=>a.status==='تم تسجيل الوصول'&&(!a.queueState||a.queueState==='waiting'));
  const clinicRows=Object.entries(bookingDirectory()).map(([name,d])=>{
    const active=appointments.filter(a=>a.doctor===name&&a.status!=='ملغي');
    return {name,clinic:d.clinic,count:active.length,capacity:d.hours.length,waiting:waiting.filter(a=>a.doctor===name).length};
  }).filter(row=>row.count||row.waiting).sort((a,b)=>b.count-a.count);
  const clinics=clinicRows.map(({name,clinic,count,capacity,waiting:queued})=>`<div class="reception-load">
    <div><strong>${esc(clinic+' · '+name)}</strong><span>${count} من ${capacity} · ${queued} في الانتظار</span></div>
    <progress value="${Math.min(count,capacity)}" max="${Math.max(capacity,1)}" aria-label="${esc(clinic)}"></progress></div>`).join('');
  const emergency=waiting.filter(a=>receptionEmergency(a.patient)).length;
  return receptionPageHead('dashboard','ملخص العمل اليومي · '+esc(receptionDate(today)),receptionActions()+link('تسجيل وصول','reception-checkin','secondary'))+
    receptionMetrics(['مرضى اليوم','ملفات جديدة','داخل العيادات','في الانتظار','حجوزات قادمة'].map(label=>[label,
      label==='داخل العيادات'?queue.filter(a=>a.status==='تم تسجيل الوصول'&&a.queueState==='in-consultation').length:
      label==='حجوزات قادمة'?db.appointments.filter(canEditBooking).length:summary.get(label)]))+
    receptionMetrics([['كشوف مكتملة',summary.get('كشوف مكتملة')],['مواعيد ملغاة',summary.get('مواعيد ملغاة')],['حالات طوارئ',adminLedgerRows('emergency').filter(e=>e.date===today).length]])+
    '<div class="reception-grid">'+receptionCard('تنبيهات تحتاج إجراء',(emergency?receptionRow('حالات طوارئ بانتظار الكشف',String(emergency),link('عرض الدور','reception-checkin','secondary small')):'')+receptionNotices())+
    receptionCard('الحجوزات والانتظار حسب العيادة',clinics||receptionEmpty('لا توجد حجوزات نشطة اليوم.'))+'</div>';
}

function receptionDesk(rawPatient) {
  const today=receptionToday();
  if (receptionDeskPatient!==(rawPatient||'')) {
    receptionDeskPatient=rawPatient||'';
    receptionBookingQuery=receptionPerson(receptionDeskPatient)?.id||'';
  }
  const term=receptionBookingQuery;
  const matches=a=>receptionSearchText(a.id)===receptionSearchText(term)||receptionMatches(receptionPerson(a.patient)||{id:a.patient},term,false);
  const queue=receptionVisitsToday();
  const arrivals=db.appointments.filter(a=>a.date===today&&['بانتظار التأكيد','مؤكد'].includes(a.status)&&matches(a)).sort(receptionBookingOrder);
  const states=Object.entries(receptionQueueStates).map(([key,{label}])=>[label,queue.filter(a=>
    (a.status==='مكتمل'?'completed':a.queueState||'waiting')===key).length]);
  const queueRows=queue.filter(matches).sort((a,b)=>Number(receptionEmergency(b.patient))-Number(receptionEmergency(a.patient))||
    (a.queueNumber||0)-(b.queueNumber||0)).map(a=>{
    const state=a.status==='مكتمل'?receptionQueueStates.completed:receptionQueueStates[a.queueState]||receptionQueueStates.waiting;
    const minutes=Math.max(0,Math.floor(((Date.parse(a.completedAt)||Date.now())-Date.parse(a.arrivalAt))/60000));
    return receptionRow(`<bdi class="reception-ticket ${receptionEmergency(a.patient)?'urgent':''}">${esc(a.queueNumber?'A'+a.queueNumber:'—')}</bdi> ${esc(receptionPerson(a.patient)?.name||a.patient)}`,
      esc(receptionClinic(a)+' · '+a.doctor+(Number.isFinite(minutes)?' · منذ '+minutes+' د':'')),
      badge(state.label,a.queueState==='in-consultation'?'emerald':a.queueState==='called'?'sky':'amber')+
      (a.status==='تم تسجيل الوصول'&&state.next?button(state.action,'reception-queue-next','secondary small',receptionIdAttr(a)):''));
  });
  return receptionPageHead('reception-checkin','تسجيل الوصول وقائمة الانتظار في شاشة واحدة · '+esc(receptionDate(today)),receptionActions())+
    `<label class="field reception-search"><span>بحث موحد</span><input id="reception-booking-search" class="input" type="search" placeholder="الاسم، رقم الملف، الهاتف أو رقم الحجز" value="${esc(term)}"></label>`+
    receptionMetrics(states)+'<div class="reception-grid">'+receptionCard('حجوزات اليوم بانتظار الوصول',
      receptionRows(arrivals.map(a=>receptionRow(esc(receptionPerson(a.patient)?.name||a.patient),
        esc([a.patient,receptionClinic(a),a.doctor,a.time].join(' · ')),
        a.status==='مؤكد'?button('تسجيل وصول','reception-verify','primary small',receptionIdAttr(a)):
          button('تأكيد الحجز','confirm-appointment','secondary small',receptionIdAttr(a)))))+
      '<p class="reception-walk-in">مريض بدون حجز؟ <a href="#patients">ابحث عن ملفه</a> أو سجّل مريضًا جديدًا.</p>')+
    receptionCard('قائمة الانتظار الحية','<p class="muted">الطوارئ أولًا، ثم حسب وقت الوصول.</p>'+receptionRows(queueRows))+'</div>';
}

function receptionBookingRow(a) {
  return receptionRow(esc(receptionPerson(a.patient)?.name||a.patient),
    esc([a.patient,receptionClinic(a),receptionDate(a.date),a.time].join(' · ')),
    receptionBadge(a.status)+(a.status==='بانتظار التأكيد'&&a.date>=receptionToday()?button('تأكيد','confirm-appointment','primary small',receptionIdAttr(a)):'')+
    (canEditBooking(a)?button('تعديل','edit-booking','secondary small',receptionIdAttr(a))+
      button('إلغاء','cancel-booking','secondary small',receptionIdAttr(a)):''));
}

function receptionTimetable(section) {
  const schedule=section==='schedule';
  const date=receptionScheduleDate||receptionToday();
  const directory=bookingDirectory();
  const bookings=db.appointments.filter(a=>a.date===date&&(!receptionDepartment||directory[a.doctor]?.department===receptionDepartment))
    .sort(receptionBookingOrder);
  const active=Object.entries(directory).filter(([,d])=>!receptionDepartment||d.department===receptionDepartment);
  const weekday=new Date(date+'T12:00:00').getDay();
  const doctors=active.filter(([name,d])=>(d.active!==false&&d.days.includes(weekday))||bookings.some(a=>a.doctor===name&&a.status!=='ملغي'));
  const entries=doctors.map(([name,d])=>{
    const reserved=bookings.filter(a=>a.doctor===name&&a.status!=='ملغي');
    const available=new Set(availableBookingTimes(name,null,date));
    const slots=[...new Set([...d.hours,...reserved.map(a=>a.time)])].sort().map(time=>{
      const occupied=reserved.some(a=>a.time===time);
      if (available.has(time)) return button(esc(time),'reception-book-slot','secondary small reception-slot',
        `data-doctor="${esc(name)}" data-date="${esc(date)}" data-time="${esc(time)}" aria-label="${esc('حجز '+name+' الساعة '+time)}"`);
      return `<span class="reception-slot unavailable"><bdi>${esc(time)}</bdi> · ${occupied?'محجوز':'غير متاح'}</span>`;
    }).join('');
    return receptionCard(esc(name),`<p class="muted">${esc([d.clinic,d.location,d.days.map(day=>bookingDayNames[day]).join('، ')].join(' · '))}</p>
      <div class="reception-actions">${slots}</div>`,badge(reserved.length+' حجز','gray'));
  }).join('');
  const list=receptionCard('المواعيد المسجلة',receptionRows(bookings.map(receptionBookingRow)));
  return receptionPageHead('appointments','تابع المواعيد واختر وقت الحجز من جدول الأطباء.',button(icon('plus')+' حجز موعد','book','primary'))+
    '<div class="reception-toolbar">'+adminTabs('appointments',[['','الحجوزات'],['schedule','جدول الأطباء']],schedule?'schedule':'')+
    '<div class="reception-actions">'+field('التاريخ','date',date,'date','id="reception-schedule-date"')+
    adminSelect('التخصص','department',[['','كل التخصصات'],...new Set(Object.values(directory).map(d=>d.department))].map(v=>Array.isArray(v)?v:[v,v]),
      receptionDepartment,'id="reception-department"')+'</div></div>'+
    (schedule?'<div class="reception-grid reception-wide"><div class="reception-stack">'+(entries||receptionCard('جدول الأطباء',receptionEmpty('لا توجد عيادات مجدولة لهذا اليوم. اختار تاريخًا آخر.')))+
      '</div>'+list+'</div>':list);
}

function receptionFile(id, tab) {
  const p=receptionPerson(id);
  if (!p) return receptionPageHead('reception-file','الملف غير متاح.',link('المرضى','patients','secondary'));
  const active=['details','bookings','invoices'].includes(tab)?tab:'';
  const appointments=db.appointments.filter(a=>a.patient===p.id).sort(receptionBookingOrder).reverse();
  const visits=db.visits.filter(v=>v.patient===p.id&&v.approved);
  const visitRows=visits.filter(v=>!appointments.some(a=>a.id===v.appointmentId)).map(v=>({date:bookingDateFromVisit(v.date),doctor:v.doctor,status:'مكتمل',type:'زيارة معتمدة'}));
  const next=appointments.filter(canEditBooking).at(-1);
  const last=[...visits.map(v=>bookingDateFromVisit(v.date)),...appointments.filter(a=>a.status==='مكتمل').map(a=>a.date)].filter(Boolean).sort().at(-1);
  const info=entries=>'<dl class="reception-details">'+entries.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'—')}</dd></div>`).join('')+'</dl>';
  const panels={
    '':()=>receptionCard('سجل الزيارات','<p class="muted">البيانات الإدارية للزيارات والحجوزات.</p>'+
      receptionTable(['التاريخ','التخصص','الطبيب','نوع الزيارة','الحالة','الفاتورة'],[...appointments,...visitRows].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(a=>{
        const invoice=a.id&&adminLedgerRows('invoices').find(i=>i.appointment===a.id);
        return [esc(receptionDate(a.date)),esc(bookingDirectory()[a.doctor]?.department||'—'),esc(a.doctor||'—'),
          esc(a.type||'زيارة'),receptionBadge(a.status),esc(invoice?.id||'—')];
      }),'لا توجد زيارات أو حجوزات مسجلة.')),
    details:()=>receptionCard('البيانات الإدارية',info([['الهاتف',p.phone],['البريد',p.email],['تاريخ الميلاد',receptionDate(p.birthDate)],['العنوان',p.address],['جهة التأمين',p.insurer]])),
    bookings:()=>receptionCard('الحجوزات',receptionRows(appointments.map(receptionBookingRow))),
    invoices:()=>receptionCard('الفواتير',receptionInvoiceList(adminLedgerRows('invoices').filter(i=>i.patient===p.id)),link('الحسابات','reception-billing','secondary small'))
  };
  return `<nav class="reception-breadcrumb" aria-label="مسار الصفحة"><a href="#patients">المرضى</a> / ${esc(p.name)}</nav>
    <header class="reception-file-head card"><div>${personAvatar(p,true)}<div><h1>${esc(p.name)}</h1>
      <p><bdi>${esc(p.id)}</bdi> · الهاتف ${esc(p.phone||'—')} · التأمين ${esc(p.insurer||'—')}</p></div></div>
      <div class="reception-actions">${button('بطاقة المريض','reception-card','secondary',receptionIdAttr(p))}
      ${link('تسجيل وصول','reception-checkin/'+encodeURIComponent(p.id),'secondary')}
      ${button(icon('plus')+' حجز موعد','reception-book-person','primary',receptionIdAttr(p))}</div></header>
    <div class="reception-grid reception-wide"><div class="reception-stack">
      ${adminTabs('reception-file/'+encodeURIComponent(p.id),[['','الزيارات'],['details','البيانات'],['bookings','الحجوزات'],['invoices','الفواتير']],active)}
      ${panels[active]()}</div><div class="reception-stack">
      ${receptionCard('جهة الطوارئ',info([['الاسم',p.emergencyName],['صلة القرابة',p.emergencyRelation],['الهاتف',p.emergencyPhone]]))}
      ${receptionCard('حالة الملف',info([['آخر زيارة',receptionDate(last)],['الموعد القادم',next?receptionDate(next.date)+' · '+next.time:'—'],['الطبيب المتابع',p.doctor]]))}</div></div>`;
}

function receptionInvoiceList(invoices) {
  return receptionRows([...invoices].reverse().map(i=>{
    const balance=adminInvoiceBalance(i);
    const paid=balance<=0;
    return receptionRow(esc(receptionPerson(i.patient)?.name||i.patient),
      esc(i.id+' · '+receptionMoney(i.amount)+' · المتبقي '+receptionMoney(balance)),
      badge(paid?'مدفوعة':balance<i.amount?'مدفوعة جزئيًا':'مستحقة',paid?'emerald':'amber')+
      button(paid?'الإيصال':'تسجيل دفعة','reception-invoice','secondary small',receptionIdAttr(i)));
  }));
}

const receptionPaymentMethods=['نقدي','بطاقة','تأمين'];

function receptionBilling() {
  const invoices=adminLedgerRows('invoices');
  const due=invoices.filter(i=>adminInvoiceBalance(i)>0);
  const today=adminLedgerRows('payments').filter(p=>p.date===receptionToday()).reduce((sum,p)=>sum+p.amount,0);
  const prices=adminLedgerRows('prices');
  return receptionPageHead('reception-billing','فواتير الكشف ورسوم الخدمات وتسجيل المدفوعات.',
    '<a class="button primary" href="#reception-billing" data-reception-focus="reception-invoice-form">+ فاتورة جديدة</a>')+
    receptionMetrics([['المدفوع اليوم',receptionMoney(today)],['المبالغ المستحقة',receptionMoney(due.reduce((n,i)=>n+adminInvoiceBalance(i),0))],['فواتير غير مكتملة',due.length]])+
    '<div class="reception-grid reception-wide">'+receptionCard('فاتورة جديدة',`<form id="reception-invoice-form" class="reception-form">
      ${adminSelect('المريض','patient',[['','اختر المريض'],...db.patients.map(p=>[p.id,p.name+' · '+p.id])],'','required')}
      <label class="field"><span>الحجز المرتبط (اختياري)</span><select class="input" name="appointment"><option value="">بدون حجز مرتبط</option></select></label>
      ${prices.length?adminSelect('خدمة من قائمة الأسعار','price',[['','إدخال خدمة يدويًا'],...prices.map(p=>[p.id,p.service+' · '+receptionMoney(p.amount)])],''):''}
      <div class="reception-service-lines"><div class="reception-service-line">
        ${field('الخدمة','service','','text','required maxlength="100"')}
        ${field('الرسوم','amount','','number','required min="0.01" max="10000000" step="0.01"')}</div></div>
      <button type="button" class="button secondary small" data-reception-action="add-line">+ إضافة خدمة</button>
      <p class="reception-total"><strong>الإجمالي</strong><output id="reception-total">٠ ج.م</output></p>
      <fieldset class="reception-payment-methods"><legend>طريقة الدفع</legend>${receptionPaymentMethods.map((method,index)=>
        `<label><input type="radio" name="method" value="${method}" ${index===0?'checked':''}> <span>${method}</span></label>`).join('')}</fieldset>
      <div class="reception-service-line">${field('المدفوع','paid',0,'number','required min="0" step="0.01"')}
      <label class="field"><span>المتبقي</span><output class="input" id="reception-balance">٠ ج.م</output></label></div>
      <p role="alert" class="form-error" id="reception-invoice-error"></p>
      <button type="submit" class="button primary full">حفظ الفاتورة وعرض الإيصال</button></form>`)+
    receptionCard('آخر الفواتير',receptionInvoiceList(invoices))+'</div>';
}

function receptionReceipt(invoice, payment) {
  const lines=invoice.lines || [{service:invoice.service,amount:invoice.amount}];
  modal('إيصال الفاتورة',`<article class="reception-print-card">
    <strong>${esc(hospitalProfile().name)}</strong><h2>${esc(invoice.id)}</h2>
    <p>${esc(receptionPerson(invoice.patient)?.name||invoice.patient)}</p>
    ${receptionTable(['الخدمة','الرسوم'],lines.map(line=>[esc(line.service),receptionMoney(line.amount)]))}
    <p>الإجمالي ${receptionMoney(invoice.amount)} · المدفوع ${receptionMoney(adminPaymentTotal(invoice.id))} · المتبقي ${receptionMoney(adminInvoiceBalance(invoice))}</p>
    ${payment?`<p>الدفعة الحالية ${receptionMoney(payment.amount)} · ${esc(payment.method)}</p>`:''}</article>`,
    button('طباعة الإيصال','reception-print','primary')+button('إغلاق','close','secondary'));
}

function receptionPostPayment(invoice,amount,method) {
  const payment={id:crypto.randomUUID(),invoice:invoice.id,amount,method,date:receptionToday()};
  ((db.adminLedgers ||= {}).payments ||= []).push(payment);
  log('تسجيل دفعة في الاستقبال',invoice.id);
  return payment;
}

function receptionInvoiceDialog(id) {
  const invoice=adminLedgerRows('invoices').find(i=>i.id===id);
  if (!invoice) return;
  if (adminInvoiceBalance(invoice)<=0) { receptionReceipt(invoice); return; }
  modal('تسجيل دفعة',`<form id="reception-payment" class="reception-form">
    <p>المتبقي ${receptionMoney(adminInvoiceBalance(invoice))}</p>
    ${field('المبلغ','amount',adminInvoiceBalance(invoice),'number','required min="0.01" step="0.01"')}
    ${adminSelect('طريقة الدفع','method',receptionPaymentMethods.map(m=>[m,m]),'نقدي')}
    <p class="form-error" role="alert"></p><button class="button primary" type="submit">حفظ الدفعة</button></form>`);
  $('#reception-payment').addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const form=event.currentTarget, amount=Number(form.elements.amount.value), method=form.elements.method.value;
    const current=adminLedgerRows('invoices').find(i=>i.id===id);
    if (!current||!Number.isFinite(amount)||amount<=0||amount>adminInvoiceBalance(current)||!receptionPaymentMethods.includes(method)) {
      form.querySelector('[role=alert]').textContent='راجع مبلغ الدفعة وطريقة الدفع.';return;
    }
    const payment=receptionPostPayment(current,amount,method);
    closeModal();render();receptionReceipt(current,payment);
  });
}

const receptionStays = () => db.receptionStays || [];
const receptionActiveStays = () => receptionStays().filter(s=>!s.discharge);
const receptionFreeBeds = () => adminBeds().filter(b=>b.state==='available'&&!receptionActiveStays().some(s=>s.bed===b.id));
const receptionBedName = bed => bed ? adminFacilityPath(bed) : 'سرير غير موجود';

function receptionAdmissions() {
  const beds=adminBeds();
  const free=receptionFreeBeds();
  const active=receptionActiveStays();
  const bedMap=beds.map(b=>{
    const state=active.some(s=>s.bed===b.id)?'occupied':b.state;
    return `<div class="reception-bed ${state}"><strong>${esc(b.name)}</strong><span>${esc(adminBedStates[state]||'غير متاح')}</span>
      <small>${esc(receptionBedName(b))}</small></div>`;
  }).join('');
  const admission=free.length?`<form id="reception-admission" class="reception-form">
    ${adminSelect('المريض','patient',[['','اختر المريض'],...db.patients.filter(p=>!active.some(s=>s.patient===p.id)).map(p=>[p.id,p.name+' · '+p.id])],'','required')}
    ${adminSelect('القسم والغرفة والسرير','bed',[['','اختر سريرًا متاحًا'],...free.map(b=>[b.id,receptionBedName(b)])],'','required')}
    <p class="form-error" role="alert"></p><button type="submit" class="button primary full">تأكيد الدخول</button></form>`:
    receptionEmpty(beds.length?'لا توجد أسرّة متاحة حاليًا.':'أضف أقسام الإقامة والأسرّة من إدارة المستشفى لتفعيل تسجيل الدخول.');
  return receptionPageHead('reception-admissions','تسجيل دخول المرضى ونقلهم وخروجهم الإداري.')+
    '<div class="reception-grid reception-admission-grid">'+receptionCard('تسجيل دخول مريض',admission)+
    receptionCard('خريطة الأسرّة',bedMap?'<div class="reception-bed-map">'+bedMap+'</div>':receptionEmpty('لا توجد أسرّة مسجلة.'))+'</div>'+
    receptionCard('المقيمون حاليًا',receptionRows(active.map(s=>{
      const balance=adminLedgerRows('invoices').filter(i=>i.patient===s.patient).reduce((sum,i)=>sum+adminInvoiceBalance(i),0);
      return receptionRow(esc(receptionPerson(s.patient)?.name||s.patient),
        esc(receptionBedName(beds.find(b=>b.id===s.bed))+' · '+(balance>0?'المستحق '+receptionMoney(balance):'لا يوجد رصيد مستحق')),
        (free.length?button('تحويل لقسم','reception-stay-transfer','secondary small',receptionIdAttr(s)):'')+
        button('خروج إداري','reception-stay-discharge','primary small',receptionIdAttr(s)));
    })));
}

function receptionChangeStay(id,transfer) {
  const stay=receptionActiveStays().find(s=>s.id===id);
  if (!stay) return;
  const title=transfer?'تحويل لقسم':'تأكيد الخروج الإداري';
  modal(title,`<form id="reception-stay-change" class="reception-form"><p>${esc(receptionPerson(stay.patient)?.name||stay.patient)}</p>
    ${transfer?adminSelect('السرير الجديد','bed',[['','اختر'],...receptionFreeBeds().map(b=>[b.id,receptionBedName(b)])],'','required'):
      '<p>سيُسجّل الخروج ويصبح السرير متاحًا من جديد.</p>'}
    <p class="form-error" role="alert"></p><button class="button primary" type="submit">${title}</button></form>`);
  $('#reception-stay-change').addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const form=event.currentTarget;
    const current=receptionActiveStays().find(s=>s.id===id);
    if (!current || current.bed!==stay.bed) { form.querySelector('[role=alert]').textContent='اتغيّرت حالة الإقامة. افتح السجل من جديد.';return; }
    const next=transfer?receptionFreeBeds().find(b=>b.id===form.elements.bed.value):null;
    if (transfer&&!next) { form.querySelector('[role=alert]').textContent='السرير لم يعد متاحًا.';return; }
    const bed=adminBeds().find(b=>b.id===current.bed);
    if (bed?.state==='occupied') bed.state='available';
    if (next) { next.state='occupied';current.bed=next.id; }
    else current.discharge=new Date().toISOString();
    log(title,current.patient);closeModal();render();toast('تم الحفظ.');
  });
}

function receptionReportData() {
  const end=receptionReportEnd||receptionToday();
  const before=healthArchiveDate(end)||new Date();
  before.setDate(before.getDate()-6);
  const start=receptionReportStart||bookingDateKey(before);
  const first=healthArchiveDate(start), last=healthArchiveDate(end);
  const length=first&&last?Math.round((last-first)/86400000)+1:0;
  const valid=length>0&&length<=366;
  const appointments=valid?db.appointments.filter(a=>a.date>=start&&a.date<=end&&(!receptionReportClinic||receptionClinic(a)===receptionReportClinic)):[];
  const completed=appointments.filter(a=>a.status==='مكتمل');
  const visits=valid?db.visits.filter(v=>v.approved&&!db.appointments.some(a=>a.id===v.appointmentId)).map(v=>({...v,date:bookingDateFromVisit(v.date)}))
    .filter(v=>v.date>=start&&v.date<=end&&(!receptionReportClinic||receptionClinic(v)===receptionReportClinic)):[];
  const records=[...completed,...visits];
  const waits=appointments.map(a=>(Date.parse(a.calledAt)-Date.parse(a.arrivalAt))/60000).filter(n=>Number.isFinite(n)&&n>=0);
  const cancelled=appointments.filter(a=>a.status==='ملغي').length;
  const past=appointments.filter(a=>a.status!=='ملغي'&&a.date<receptionToday());
  const missed=past.filter(a=>['مؤكد','لم يحضر'].includes(a.status)&&!a.arrivalAt).length;
  const invoices=adminLedgerRows('invoices');
  const revenues=valid?adminLedgerRows('payments').filter(p=>p.date>=start&&p.date<=end&&(!receptionReportClinic||
    appointments.some(a=>a.id===invoices.find(i=>i.id===p.invoice)?.appointment))).reduce((n,p)=>n+p.amount,0):0;
  const days=new Map();
  for (const a of [...appointments.filter(a=>a.status!=='ملغي'),...visits]) {
    if (!days.has(a.date)) days.set(a.date,new Set());
    days.get(a.date).add(a.patient);
  }
  const daily=valid?Array.from({length},(_,i)=>{
    const date=new Date(first);
    date.setDate(date.getDate()+i);
    const key=bookingDateKey(date);
    return [key,days.get(key)?.size||0];
  }):[];
  const directory=bookingDirectory();
  const departments=new Map();
  for (const visit of records) {
    const name=visit.doctor||'غير محدد';
    const specialty=directory[name]?.department||'غير محدد';
    const doctors=departments.get(specialty)||new Map();
    doctors.set(name,(doctors.get(name)||0)+1);
    departments.set(specialty,doctors);
  }
  const groups=[...departments].map(([specialty,doctors])=>[specialty,[...doctors].sort((a,b)=>b[1]-a[1])[0][0],
    [...doctors.values()].reduce((n,count)=>n+count,0)]).sort((a,b)=>b[2]-a[2]);
  const metrics=[['متوسط وقت الانتظار',waits.length?Math.round(waits.reduce((a,b)=>a+b,0)/waits.length)+' د':'—'],
    ['نسبة عدم الحضور',past.length?Math.round(100*missed/past.length)+'٪':'—'],['الإيرادات',receptionMoney(revenues)],['حجوزات ملغاة',cancelled]];
  return {start,end,valid,daily,groups,metrics};
}

function receptionAnalytics() {
  const {start,end,valid,daily,groups,metrics}=receptionReportData();
  const max=Math.max(1,...daily.map(([,n])=>n));
  const chart=valid?`<div class="reception-chart" role="list" aria-label="عدد المرضى في الأيام المحددة">${daily.map(([date,n])=>
    `<div role="listitem" aria-label="${esc(receptionDate(date))}، ${n}"><div class="reception-bar-track" aria-hidden="true">
      <div style="--bar:${n/max*100}%"><b>${n}</b></div></div><small>${esc(healthArchiveDateLabel(date,{day:'numeric',month:'short'}))}</small></div>`).join('')}</div>`:
    receptionEmpty('اختر فترة صحيحة لا تتجاوز سنة.');
  return receptionPageHead('reception-reports','تحليل الحجوزات والزيارات والمدفوعات خلال فترة محددة.',
    button('تصدير PDF','reception-print','secondary')+'<button class="button primary" data-reception-action="csv">CSV لـ Excel</button>')+
    `<div class="reception-actions">${field('من','from',start,'date','id="reception-report-start"')}
    ${field('إلى','to',end,'date','id="reception-report-end"')}
    ${adminSelect('العيادة','clinic',[['','كل العيادات'],...[...new Set(Object.values(bookingDirectory()).map(d=>d.clinic))].map(c=>[c,c])],
      receptionReportClinic,'id="reception-report-clinic"')}</div>
    <div class="reception-printable reception-stack">${valid?receptionMetrics(metrics):''}
      <div class="reception-grid reception-wide">${receptionCard('عدد المرضى يوميًا',chart)}
      ${receptionCard('الزيارات حسب التخصص',receptionTable(['التخصص','الطبيب الأكثر استقبالًا','الزيارات'],
        groups.map(row=>row.map(esc)),'لا توجد زيارات مكتملة في هذه الفترة.'))}</div></div>`;
}

function bindReceptionInvoiceForm(form) {
  const lines=form.querySelector('.reception-service-lines');
  const total=()=>[...form.querySelectorAll('[name=amount]')].reduce((n,input)=>n+Math.round(Number(input.value)*100),0)/100;
  const update=()=>{
    $('#reception-total').textContent=receptionMoney(total());
    $('#reception-balance').textContent=receptionMoney(Math.max(0,total()-Number(form.elements.paid.value)));
    form.elements.paid.max=total();
  };
  form.addEventListener('input',update);
  form.elements.patient.addEventListener('change',()=>{
    const appointments=db.appointments.filter(a=>a.patient===form.elements.patient.value&&a.status!=='ملغي').sort(receptionBookingOrder).reverse();
    form.elements.appointment.replaceChildren(new Option('بدون حجز مرتبط',''),...appointments.map(a=>new Option(
      [receptionDate(a.date),a.time,a.doctor].join(' · '),a.id)));
  });
  form.elements.price?.addEventListener('change',()=>{
    const price=adminLedgerRows('prices').find(p=>p.id===form.elements.price.value);
    if (!price) return;
    const line=lines.lastElementChild;
    line.querySelector('[name=service]').value=price.service;
    line.querySelector('[name=amount]').value=price.amount;
    update();
  });
  form.addEventListener('click',event=>{
    const action=event.target.closest('[data-reception-action]')?.dataset.receptionAction;
    if (action==='remove-line') { event.target.closest('.reception-service-line').remove();update(); }
    if (action==='add-line') {
      lines.insertAdjacentHTML('beforeend',`<div class="reception-service-line">
        ${field('الخدمة','service','','text','required maxlength="100"')}
        ${field('الرسوم','amount','','number','required min="0.01" max="10000000" step="0.01"')}
        <button type="button" class="button secondary small" data-reception-action="remove-line">إزالة الخدمة</button></div>`);
      lines.lastElementChild.querySelector('[name=service]').focus();
    }
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const {patient,appointment,method}=Object.fromEntries(new FormData(form));
    const paid=Number(form.elements.paid.value);
    const items=[...lines.children].map(line=>({service:line.querySelector('[name=service]').value.trim(),amount:Number(line.querySelector('[name=amount]').value)}));
    const amount=total(), error=$('#reception-invoice-error');
    if (!receptionPerson(patient)||!receptionPaymentMethods.includes(method)||!Number.isFinite(amount)||amount<=0||amount>10000000||
      !Number.isFinite(paid)||paid<0||paid>amount||items.some(i=>!i.service||!Number.isFinite(i.amount)||i.amount<=0)||
      (appointment&&!db.appointments.some(a=>a.id===appointment&&a.patient===patient&&a.status!=='ملغي'))) {
      error.textContent='راجع المريض والخدمات والمبلغ المدفوع.';return;
    }
    if (appointment&&adminLedgerRows('invoices').some(i=>i.appointment===appointment)) {
      error.textContent='الحجز مرتبط بالفعل بفاتورة. سجّل دفعة من قائمة الفواتير.';return;
    }
    const invoice={id:'INV-'+crypto.randomUUID().slice(0,12),patient,appointment,service:items.map(i=>i.service).join('، '),
      lines:items,amount,insurer:method==='تأمين'?receptionPerson(patient).insurer||'':'',date:receptionToday()};
    ((db.adminLedgers ||= {}).invoices ||= []).push(invoice);
    const payment=paid>0?receptionPostPayment(invoice,paid,method):null;
    log('إنشاء فاتورة من الاستقبال',invoice.id);
    render();receptionReceipt(invoice,payment);
  });
}

function bindReceptionScreens() {
  for (const [id,update] of [
    ['reception-department',v=>{receptionDepartment=v;}],['reception-report-start',v=>{receptionReportStart=v;}],
    ['reception-report-end',v=>{receptionReportEnd=v;}],['reception-report-clinic',v=>{receptionReportClinic=v;}]
  ]) $('#'+id)?.addEventListener('change',event=>{update(event.target.value);render();$('#'+id)?.focus();});
  const invoice=$('#reception-invoice-form');
  if (invoice) bindReceptionInvoiceForm(invoice);
  $('#reception-admission')?.addEventListener('submit',event=>{
    event.preventDefault();
    if (!receptionRefreshRecords()) return;
    const form=event.currentTarget;
    const {patient,bed}=Object.fromEntries(new FormData(form));
    const target=receptionFreeBeds().find(b=>b.id===bed);
    if (!target||!receptionPerson(patient)||receptionActiveStays().some(s=>s.patient===patient)) {
      form.querySelector('[role=alert]').textContent='راجع المريض وتوافر السرير.';return;
    }
    (db.receptionStays ||= []).push({id:crypto.randomUUID(),patient,bed,admitted:new Date().toISOString()});
    target.state='occupied';
    log('تسجيل دخول للإقامة',patient);render();toast('تم تسجيل الدخول.');
  });
}

document.addEventListener('click',event=>{
  if (!receptionGuard()) return;
  const focus=event.target.closest('[data-reception-focus]');
  if (focus) { event.preventDefault();document.getElementById(focus.dataset.receptionFocus)?.querySelector('select')?.focus(); }
  const el=event.target.closest('[data-action]');
  const action=el?.dataset.action;
  if (action==='reception-invoice') receptionInvoiceDialog(el.dataset.id);
  if (action==='reception-stay-transfer'||action==='reception-stay-discharge') receptionChangeStay(el.dataset.id,action==='reception-stay-transfer');
  if (event.target.closest('[data-reception-action="csv"]') && $('#main')?.dataset.route==='reception-reports') {
    const {start,end,valid,daily,groups,metrics}=receptionReportData();
    if (!valid) { toast('اختار فترة صحيحة أولًا.');return; }
    const safe=value=>{
      const text=String(value);
      return '"'+(/^[\s]*[=+@-]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';
    };
    const rows=[['الفترة',start,end],...metrics,[],['التاريخ','عدد المرضى'],...daily,[],['التخصص','الطبيب الأكثر استقبالًا','الزيارات'],...groups];
    adminDownload('mnu333-reception.csv','\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    log('تصدير تقرير الاستقبال',start+' – '+end);
  }
});
