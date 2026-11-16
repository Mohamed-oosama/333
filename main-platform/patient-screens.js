'use strict';

const patientPortalNav = [
  ['portal','grid','الرئيسية'], ['appointments','calendar','مواعيدي'],
  ['patient-attachments','file','صحتي'], ['patient-requests','bell','طلباتي ورسائلي','طلباتي'],
  ['patient-profile','user','حسابي']
];
const patientPortalParents = {
  'patient-doctors':'appointments', 'patient-journey':'appointments', 'appointment-waitlist':'appointments',
  'patient-reports':'patient-attachments', 'patient-diagnostics':'patient-attachments',
  'patient-messages':'patient-requests', 'patient-notices':'patient-requests', 'patient-care':'patient-requests',
  'patient-services':'patient-requests', 'patient-family':'patient-profile', 'patient-billing':'patient-profile',
  'patient-insurance':'patient-profile', 'patient-pay':'patient-profile'
};

const patientScreenHeading = (title, actions='') => `<header class="patient-screen-heading"><h1>${title}</h1>${actions}</header>`;
const patientScreenPanel = (title, body, actions='', cls='') => `<section class="patient-screen-panel ${cls}">
  ${title ? `<header class="patient-panel-heading"><h2>${title}</h2>${actions}</header>` : ''}${body}</section>`;
const patientScreenEmpty = (message,action='') => `<div class="patient-screen-empty"><p>${message}</p>${action}</div>`;
const patientScreenPills = (items, selected, label) => `<nav class="patient-screen-pills" aria-label="${label}">${items.map(([id,title,route])=>
  `<a class="patient-pill" href="#${route}"${id===selected?' aria-current="page"':''}>${title}</a>`).join('')}</nav>`;
const patientShortDate = value => esc(healthArchiveDateLabel(value,{day:'numeric',month:'long'}));
const patientInvoiceRows = () => adminLedgerRows('invoices').filter(row=>row.patient===patientSessionId()).slice().reverse();

function patientAppointmentGroups() {
  const rows = db.appointments.filter(row=>row.patient===patientSessionId());
  const isUpcoming = row=>canEditBooking(row)||row.status==='تم تسجيل الوصول';
  const order = (a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
  return {upcoming:rows.filter(isUpcoming).sort(order), past:rows.filter(row=>!isUpcoming(row)).sort((a,b)=>order(b,a))};
}

function patientNoticeRow(item, isRead, showAction=false) {
  return `<article class="patient-screen-record">
    <div>${showAction?`<strong>${esc(item.title)}</strong>`:`<a class="patient-record-title" href="#${item.route}" data-patient-notice="${esc(item.key)}">${esc(item.title)}</a>`}
    <p>${esc(item.detail)}${item.key.startsWith('booking:')?'':' · '+patientShortDate(item.date)}</p></div>
    <div class="patient-screen-actions">${isRead?'':'<span class="patient-new">جديد</span>'}
      ${showAction?`<a class="button secondary" href="#${item.route}" data-patient-notice="${esc(item.key)}" aria-label="عرض ${esc(item.title)}">عرض</a>`:''}</div></article>`;
}

function portal() {
  const p = patient();
  const {upcoming,past} = patientAppointmentGroups();
  const next = upcoming[0];
  const last = [...past.filter(row=>row.status==='مكتمل'), ...db.visits.filter(row=>row.patient===p.id&&row.approved)]
    .sort((a,b)=>(healthArchiveDate(b.date)||0)-(healthArchiveDate(a.date)||0))[0];
  const directory = bookingDirectory();
  const provider = [next?.doctor,last?.doctor,p.doctor].find(name=>directory[name]&& (next || directory[name].active!==false));
  const clinic = directory[provider];
  const code = patientBookingCode(next,'patient-home-code');
  const actions = next
    ? `<div class="patient-screen-actions">${code?link(next.precheck?'راجع تجهيز زيارتك':'سجل حضورك مسبقًا',patientBookingRoute(next.id,'precheck'),'primary')+
      link('عرض الكود',patientBookingRoute(next.id,'receipt'),'secondary')+
      link('قبل موعدك',patientBookingRoute(next.id,'prepare'),'secondary'):link('تفاصيل الموعد',patientBookingRoute(next.id),'primary')}
      ${canEditBooking(next)?button('إعادة جدولة','edit-booking','secondary',`data-id="${esc(next.id)}"`):''}</div>`
    : `<div class="patient-screen-actions">${link('طبيب آخر','patient-doctors','secondary')}${provider?link('احجز متابعة','appointments/book/'+encodeURIComponent(provider),'primary'):link('احجز موعد','appointments','primary')}</div>`;
  const notices = patientNoticeEntries(p.id).filter(item=>!db.patientNoticeRead?.[p.id]?.includes(item.key));
  const reports = db.sharedReports.filter(row=>row.patient===p.id).slice(-2).reverse();
  const balance = patientInvoiceRows().reduce((total,row)=>total+adminInvoiceBalance(row),0);
  const quick = [
    ['احجز موعد',code?'':'بالتخصص أو الطبيب','appointments/new'], ['نتائجي',code?'':'تحاليل وأشعة','patient-attachments/tests'],
    code?['أدويتي','','patient-attachments/medications']:['رسالة للاستقبال','أو اطلب تقرير','patient-requests'],
    ['الفواتير',code?'':balance?receptionMoney(balance):'لا مبالغ مستحقة','patient-billing']
  ];
  return `<div class="patient-screen">
    <header class="patient-greeting"><p>أهلًا بعودتك · <bdi>${esc(p.id)}</bdi></p><h1>${esc(p.name)}</h1></header>
    <section class="patient-screen-panel patient-visit-banner" aria-label="حالة الموعد">
      <div><p>${next?(code?'موعدك القادم':esc(next.status)):
        'لا يوجد موعد قادم'+(last?' · آخر زيارة '+patientServiceDate(last.date):'')}</p>
      <h2>${next?esc(next.doctor)+(clinic?'، '+esc(clinic.department):''):
        provider?'متابعة مع '+esc(provider)+'، '+esc(clinic.department):'احجز موعدك بالعيادة'}</h2>
      ${next?`<p>${patientVisitDate(next.date,next.time)}${clinic?' · '+esc(clinic.location):''}</p>`:
        clinic?`<p>${esc([clinic.clinic,clinic.location].filter(Boolean).join(' · '))}</p>`:''}
      ${next?`<div>${patientBookingLabel(next.id)}</div>`:''}${code?actions:''}</div>${code||actions}
    </section>
    <nav class="patient-four" aria-label="اختصارات المريض">${quick.map(([label,desc,route])=>
      `<a class="patient-screen-panel patient-shortcut" href="#${route}"><strong>${label}</strong>${desc?`<span>${esc(desc)}</span>`:''}</a>`).join('')}</nav>
    ${code?'':`<div class="patient-two patient-home-attention">
      ${patientScreenPanel('يحتاج انتباهك',notices.slice(0,2).map(item=>patientNoticeRow(item,false)).join('')||patientScreenEmpty('لا توجد تحديثات جديدة'))}
      ${patientScreenPanel('تعليمات طبيبك',reports.length?`${reports.map(report=>`<p class="patient-shared-plan">${esc(report.instructions||report.plan||'تعليمات متابعة')}</p>`).join('')}<a href="#patient-reports">عرض التعليمات والروشتات</a>`:patientScreenEmpty('ستظهر هنا بعد مشاركتها من طبيبك'),'','patient-home-instructions')}
    </div>`}</div>`;
}

const featuredPatientDepartments = [
  ['أمراض الصدر','الصدر',name=>['أمراض الصدر','الأورام الصدرية'].includes(name)],
  ['القلب','القلب',name=>name==='القلب والأوعية الدموية'],
  ['الباطنة','الباطنة',name=>name==='الباطنة العامة'],
  ...['الأطفال','النساء والتوليد','الجلدية','العيون','العظام'].map(name=>[name,name,value=>value===name])
];

function patientDepartmentChoices(doctors) {
  const active = featuredPatientDepartments.filter(([, ,matches])=>doctors.some(([,doctor])=>matches(doctor.department)));
  const others = bookingDepartments().filter(name=>!active.some(([, ,matches])=>matches(name)));
  return [...active,...others.map(name=>[name,name,value=>name===value])];
}

function patientAppointmentPanel(title,rows,compact=false) {
  const directory = bookingDirectory();
  return patientScreenPanel(title,rows.length?rows.map(a=>{
    const editable = canEditBooking(a);
    const code = compact?patientBookingCode(a,'patient-list-code'):'';
    const available = directory[a.doctor] && directory[a.doctor].active!==false;
    return `<article class="patient-visit-record ${compact?'patient-visit-wide':''}"><div class="patient-screen-record">
      <time class="patient-date-badge" datetime="${esc(a.date)}"><strong>${esc(healthArchiveDateLabel(a.date,{day:'numeric'}))}</strong>
        <span>${esc(healthArchiveDateLabel(a.date,{month:'long'}))}</span></time>
      <div><strong>${esc([a.doctor,compact?directory[a.doctor]?.department:''].filter(Boolean).join(' · '))}</strong><p>${esc(a.status==='مكتمل'?'تمت الزيارة':a.status)} · <bdi>${esc(a.time)}</bdi></p>
      ${compact?patientBookingLabel(a.id):''}</div>
      </div><div class="patient-screen-actions">${code}${code?link('عرض الكود',patientBookingRoute(a.id,'receipt'),'primary'):''}
      ${link('تفاصيل',patientBookingRoute(a.id,code?'details':''),'secondary')}
      ${editable?(code?'':button('تعديل الحجز','edit-booking','primary',`data-id="${esc(a.id)}"`)):
        available&&a.status!=='تم تسجيل الوصول'&&a.status!=='ملغي'?link('حجز متابعة','appointments/book/'+encodeURIComponent(a.doctor),'primary'):''}</div></article>`;
  }).join(''):patientScreenEmpty('لا توجد مواعيد '+title));
}

function patientAppointmentsScreen(view,doctorId) {
  const {upcoming,past} = patientAppointmentGroups();
  if (!view&&upcoming.some(row=>row.status==='مؤكد'&&canEditBooking(row))) {
    return '<div class="patient-screen">'+patientScreenHeading('مواعيدي',link('حجز موعد جديد','appointments/new','primary'))+
      patientAppointmentPanel('القادمة '+upcoming.length,upcoming,true)+patientAppointmentPanel('السابقة '+past.length,past,true)+
      '<div>'+link('قائمة الانتظار','appointment-waitlist','secondary')+'</div></div>';
  }
  const filter = ['upcoming','past'].includes(view)?view:'all';
  const filters = patientScreenPills([['all','الكل','appointments'],['upcoming','القادمة '+upcoming.length,'appointments/upcoming'],
    ['past','السابقة '+past.length,'appointments/past'],['wait','قائمة الانتظار','appointment-waitlist']],filter,'المواعيد');
  return `<div class="patient-screen">${patientScreenHeading('مواعيدي',filters)}<div class="patient-two patient-appointments-layout">
    ${patientScreenPanel('احجز موعد في 3 خطوات',`<form id="patient-slot-form" class="patient-slot-form" data-doctor="${esc(['book','doctor'].includes(view)?patientDecode(doctorId):'')}" data-followup="${view==='book'}"></form>`)}
    <div class="patient-screen-stack">${filter!=='past'?patientAppointmentPanel('القادمة',upcoming):''}${filter!=='upcoming'?patientAppointmentPanel('السابقة',past):''}</div>
    </div></div>`;
}

function patientDecode(value='') {
  try { return decodeURIComponent(value); } catch { return ''; }
}

function bindPatientSlotPicker() {
  const form = $('#patient-slot-form');
  if (!form) return;
  const id = patientSessionId();
  const doctors = Object.entries(bookingDirectory()).filter(([,doctor])=>doctor.active!==false);
  if (!doctors.length) {
    form.innerHTML = patientScreenEmpty('لا توجد عيادات متاحة للحجز حاليًا');
    return;
  }
  const departments = [["كل التخصصات","كل التخصصات",()=>true],...patientDepartmentChoices(doctors)];
  const initial = doctors.find(([name])=>name===form.dataset.doctor) || doctors.find(([name])=>name===patient().doctor) || doctors[0];
  let doctor = initial[0];
  let department = departments.slice(1).findIndex(([, ,matches])=>matches(initial[1].department))+1;
  let date = firstBookingDay(doctor,id);
  let time = availableBookingTimes(doctor,id,date)[0] || '';
  const selectDate = value => {
    date = value;
    time = availableBookingTimes(doctor,id,date)[0] || '';
  };
  const selectDepartment = value => {
    department = Number(value);
    const matches = departments[department][2];
    if (!matches(doctors.find(([name])=>name===doctor)[1].department)) doctor = doctors.find(([,entry])=>matches(entry.department))[0];
    selectDate(firstBookingDay(doctor,id));
  };
  const pick = (name,value,label,active,cls='patient-pill') => `<button type="button" name="${name}" value="${esc(value)}" class="${cls}" aria-pressed="${active}">${label}</button>`;
  const renderSlots = () => {
    const options = doctors.filter(([,entry])=>departments[department][2](entry.department));
    const times = availableBookingTimes(doctor,id,date);
    const days = availableBookingDays(doctor,id,6);
    const schedule = doctors.find(([name])=>name===doctor)[1];
    const weekday = new Date(date+'T12:00:00').getDay();
    const scheduledHours = schedule.days.includes(weekday) ? schedule.hours : [];
    form.innerHTML = `<div class="patient-book-step"><p>1 التخصص</p><div class="patient-screen-pills">
      ${departments.slice(1,5).map(([label],i)=>pick('department',i+1,label,department===i+1)).join('')}
      ${pick('department',0,'كل التخصصات',department===0)}
      <a href="#patient-doctors">دليل الأطباء</a></div>
      ${departments.length>5?`<label class="patient-book-select">باقي التخصصات
        <select name="other-department" class="input">
          <option value="" ${department<5?'selected':''} disabled>اختر تخصصًا آخر</option>
          ${departments.slice(5).map(([label],index)=>`<option value="${index+5}" ${department===index+5?'selected':''}>${esc(label)}</option>`).join('')}
        </select></label>`:''}</div>
      <div class="patient-book-step"><p>2 الطبيب</p><div class="patient-book-doctors">${options.map(([name,entry])=>{
        const next=firstBookingDay(name,id);
        return pick('doctor',name,`<strong>${esc(name)}</strong><span>${esc(entry.specialty)} · ${next?'أقرب موعد '+patientShortDate(next):'لا توجد أوقات متاحة'}</span>`,doctor===name,'patient-doctor-option');
      }).join('')}</div></div>
      <div class="patient-book-step">
        <p>3 التاريخ والوقت</p>
        ${days.length?`<div class="patient-screen-pills" role="group" aria-label="أقرب الأيام المتاحة">
          ${days.map(day=>pick('day',day,healthArchiveDateLabel(day,{weekday:'long'})+' '+patientShortDate(day),day===date)).join('')}
        </div>`:''}
        <label class="patient-book-day">اختيار تاريخ آخر
          <input name="slot-date" type="date" class="input" dir="ltr" value="${esc(date)}" min="${bookingDateKey(new Date())}">
        </label>
        ${scheduledHours.length?`<p>ساعات العيادة في اليوم المختار · <bdi>${esc(scheduledHours[0])} – ${esc(scheduledHours.at(-1))}</bdi></p>`:''}
        <div class="patient-screen-pills" role="group" aria-label="ساعات العيادة">
          ${scheduledHours.map(hour=>times.includes(hour)?pick('time',hour,`<bdi>${esc(hour)}</bdi>`,hour===time):
            `<button type="button" class="patient-pill patient-slot-unavailable" disabled><span aria-hidden="true">×</span> <bdi>${esc(hour)}</bdi> <small>غير متاح</small></button>`).join('')||
            patientScreenEmpty(date?'لا توجد ساعات عمل للعيادة في هذا اليوم':'اختر تاريخًا لعرض أوقات العيادة')}
        </div>
        ${scheduledHours.length&&!times.length?'<p>كل الأوقات غير متاحة في هذا اليوم. اختر تاريخًا آخر.</p>':''}
      </div>
      <div class="patient-book-footer"><button type="button" name="wait" class="patient-inline-link">الوقت غير مناسب؟ انضم لقائمة الانتظار</button>
        <button type="submit" class="button primary" ${times.includes(time)?'':'disabled'}>تأكيد الحجز</button></div>`;
  };
  form.addEventListener('click',event=>{
    const control = event.target.closest('button[type="button"]');
    if (!control) return;
    if (control.name==='wait') {
      appointmentWaitJoin({doctor,date,patient:id});
      return;
    }
    if (control.name==='department') selectDepartment(control.value);
    if (control.name==='doctor') {
      doctor=control.value;
      selectDate(firstBookingDay(doctor,id));
    }
    if (control.name==='day') selectDate(control.value);
    if (control.name==='time') time=control.value;
    renderSlots();
    [...form.querySelectorAll('button')].find(node=>node.name===control.name&&node.value===control.value)?.focus();
  });
  form.addEventListener('change',event=>{
    const {name,value} = event.target;
    if (name==='slot-date') selectDate(value);
    else if (name==='other-department') selectDepartment(value);
    else return;
    renderSlots();
    form.elements[name].focus();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (time && patientSessionId()===id) book(undefined,doctor,undefined,{date,time,review:true,followup:form.dataset.followup==='true'});
  });
  renderSlots();
}

function patientRequestForm(kind=patientRequestKinds[0], detail='') {
  return `<form id="patient-service-request" class="patient-service-form">
    ${adminSelect('نوع الطلب','kind',patientRequestKinds.map(value=>[value,value]),kind)}
    <label class="field"><span>التفاصيل</span><textarea name="detail" class="input" rows="4" maxlength="400" required>${esc(detail)}</textarea></label>
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">إرسال الطلب</button></form>`;
}

const patientInboxNav = [
  ['overview','نظرة عامة','patient-requests'],['messages','الرسائل','patient-messages'],
  ['notices','الإشعارات','patient-notices'],['care','الرعاية عن بعد','patient-care'],['support','الدعم','patient-requests/support']
];

function patientInboxScreen(view,id) {
  const p = patientSessionId();
  const read = new Set(db.patientNoticeRead?.[p]||[]);
  const notices = patientNoticeEntries(p);
  const requests = (db.patientRequests||[]).filter(row=>row.patient===p).slice().reverse();
  const threads = myDeskRows('threads');
  const options = [
    ['استخراج تقرير أو نسخة من الملف','request'],['مراجعة تغطية تأمينية','coverage-add'],
    ['رعاية عن بعد أو زيارة منزلية','care-add'],['تفويض شخص بإدارة ملفي','delegate-add'],['شكوى أو اقتراح','feedback'],
    ['رسالة للاستقبال','thread-add']
  ];
  const actions = options.map(([label,action])=>action==='request'
    ? `<button type="button" class="button secondary" data-patient-command="request" data-kind="${label}">${label}</button>`
    : action==='feedback'?link(label,'patient-requests/feedback','secondary'):deskAction(label,action,'',action==='thread-add'?'primary':'secondary')).join('');
  const requestRows = requests.map(row=>`<article class="patient-screen-record"><div><a class="patient-record-title" href="#patient-requests/track/${encodeURIComponent(row.id)}">${esc(row.kind)}</a>
    <p>${esc(row.detail)}</p>${row.reply?`<p>رد الإدارة · ${esc(row.reply)}</p>`:''}</div>${badge(esc(row.status),'teal')}</article>`).join('');
  const threadRows = threads.map(row=>deskRow(row.subject,row.messages.at(-1)?.text||'','',deskAction('فتح المحادثة','thread-open',row.id))).join('');
  const noticeRows = notices.map(row=>patientNoticeRow(row,read.has(row.key))).join('');
  const unread = notices.filter(row=>!read.has(row.key)).length;
  const readAll = unread?`<button class="button secondary" data-patient-service="read-all">تحديد الكل كمقروء</button>`:'';
  const filters = patientScreenPills([['all','الكل','patient-requests'],['requests','الطلبات','patient-requests/requests'],
    ['messages','الرسائل','patient-requests/messages'],['notices','الإشعارات'+(unread?' '+unread:''),'patient-requests/notices']],
  ['requests','messages','notices'].includes(id)?id:'all','صندوق الوارد');
  const inboxRows = {requests:requestRows,messages:threadRows,notices:noticeRows};
  const rows = Object.hasOwn(inboxRows,id)?inboxRows[id]:noticeRows+requestRows+threadRows;
  const titles = {messages:'رسائل الاستقبال', notices:'الإشعارات', care:'الرعاية عن بعد والمنزلية',support:'الدعم والتواصل'};
  const headingActions = {messages:deskAction('محادثة جديدة','thread-add','','primary'), notices:readAll,
    care:deskAction('طلب خدمة','care-add','','primary')};
  const content = view==='messages' ? patientConversationScreen(threads,id):
    view==='notices' ? patientScreenPanel('آخر التحديثات',notices.map(row=>patientNoticeRow(row,read.has(row.key),true)).join('')||patientScreenEmpty('لا توجد إشعارات بعد')):
    view==='care' ? '<p>استشارة عن بعد أو زيارة منزلية، وتابع حالة الموعد المسجل</p>'+
      patientScreenPanel('طلبات الرعاية',myDeskRows('care').map(row=>deskRow(row.kind,[row.summary,row.scheduled?'الموعد '+deskWhen(row.scheduled):'',row.reply].filter(Boolean).join(' · '),row.state,
        row.kind==='استشارة عن بُعد'&&row.state==='تم تحديد الموعد'&&row.scheduled?link('غرفة الانتظار','patient-care/room/'+encodeURIComponent(row.id),'secondary'):'')).join('')||
        patientScreenEmpty('لا توجد سجلات بعد')):
    view==='support' ? patientSupportContent():
    `<div class="patient-two patient-inbox-layout">${patientScreenPanel('ماذا تحتاج؟',`<div class="patient-inbox-actions">${actions}</div>`)}
      ${patientScreenPanel('',filters+rows+(!rows?patientScreenEmpty('لا توجد طلبات أو رسائل في هذا القسم'):
        !id&&!requests.length&&!threads.length?patientScreenEmpty('لا توجد طلبات أو رسائل أخرى'):''))}</div>`;
  return `<div class="patient-screen">${patientScreenPills(patientInboxNav,view,'الطلبات والرسائل')}
    ${patientScreenHeading(titles[view]||'طلباتي ورسائلي',headingActions[view])}${content}</div>`;
}

const patientAccountNav = [
  ['profile','بياناتي','patient-profile'],['family','الأسرة والتفويض','patient-family'],
  ['billing','الفواتير والتأمين','patient-billing'],['stay','الإقامة والدخول والخروج','patient-profile/stay']
];

function patientRegisteredInsurer() {
  return myDeskRows('patientInsurers')[0]?.insurer || receptionPerson(patientSessionId())?.insurer || '';
}

function patientAccountScreen(tab, invoiceId) {
  const p = patient();
  let content;
  if (tab==='billing') {
    const invoices = patientInvoiceRows();
    const total = invoices.reduce((sum,row)=>sum+adminInvoiceBalance(row),0);
    const insurer = patientRegisteredInsurer();
    content = invoiceId?patientBillingPage(invoiceId):
      patientScreenPanel('المبلغ المستحق',`<strong class="patient-balance"><bdi>${esc(total.toFixed(2))}</bdi> ج.م</strong>${total?'':'<p>لا توجد مبالغ مستحقة</p>'}`) +
      patientScreenPanel('التأمين',insurer?`<p>${esc(insurer)}</p>`:patientScreenEmpty('لم تسجل جهة تأمين بعد'),
        `<div class="patient-screen-actions"><button class="button secondary" data-patient-command="insurer">${insurer?'تعديل جهة التأمين':'أضف جهة تأمين'}</button>
        ${insurer?deskAction('مراجعة تغطية','coverage-add','','secondary'):''}</div>`)+
      (myDeskRows('coverage').length?patientScreenPanel('طلبات التغطية',myDeskRows('coverage').map(row=>deskRow(row.service,[row.insurer,row.reply].filter(Boolean).join(' · '),row.state)).join('')):'')+
      patientScreenPanel('فواتيري',invoices.map(row=>deskRow(row.service,receptionMoney(row.amount),adminInvoiceBalance(row)>0?'متبقي '+receptionMoney(adminInvoiceBalance(row)):'مدفوعة',
        link('التفاصيل والإيصال','patient-billing/'+encodeURIComponent(row.id),'secondary small'))).join('')||patientScreenEmpty('لا توجد فواتير بعد'));
  } else content = patientScreenPanel('بياناتي',`<dl class="patient-account-facts">${[
    ['رقم الملف',p.id],['العمر',p.age?p.age+' سنة':'—'],['رقم الهاتف',p.phone],['الطبيب المتابع',p.doctor]
  ].map(([label,value])=>`<div><dt>${label}</dt><dd><bdi>${esc(value||'—')}</bdi></dd></div>`).join('')}</dl>
    <p>لتصحيح البيانات الطبية، راجع فريق العيادة.</p>`,button('تعديل البيانات','contact','primary'));
  return `<div class="patient-screen">${patientScreenHeading('حسابي')}<div class="patient-account-layout">
    <aside class="patient-screen-panel">${patientScreenPills([...patientAccountNav,...patientProfileLinks.map(([id,label])=>[id,label,'patient-profile/'+id])],tab,'أقسام حسابي')}</aside>
    <div class="patient-screen-stack">${content}</div></div></div>`;
}

function patientPortalHeader(p) {
  return `<header class="patient-top">
    <a class="patient-top-brand" href="#portal">${hospitalLogo()}<span class="patient-top-brand-copy">
      <strong><bdi>${esc(hospitalProfile().name)}</bdi></strong><small>بوابة المريض</small>
    </span></a>
    <nav class="patient-top-nav" aria-label="تنقل بوابة المريض">${patientPortalNav.map(([route,,title,short],index)=>`<a href="#${route}" data-nav="${route}"><span class="${short?'patient-wide-label':''}" data-patient-nav-label="${index}">${title}</span>${short?`<span class="patient-tablet-label" data-patient-nav-label="${index}">${short}</span>`:''}</a>`).join('')}</nav>
    <div class="patient-top-tools">
      <form id="patient-portal-search" role="search"><input type="search" class="input" aria-label="البحث في بوابة المريض" placeholder="ابحث عن طبيب، خدمة أو نتيجة..." required maxlength="100"></form>
      <a class="patient-emergency" href="#patient-emergency">طوارئ</a>
      <a class="patient-top-bell" href="#patient-notices" aria-label="الإشعارات">${icon('bell')}</a>
      <details class="patient-profile-menu"><summary aria-label="قائمة الحساب">${esc(initials(p.name))}</summary>
        <div></div></details>
    </div></header>`;
}

function patientPortalSearch(query='') {
  const normalize=value=>String(value).normalize('NFKD').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  const match = value=>Boolean(terms.length)&&terms.every(term=>normalize(value).includes(term));
  const providers = Object.entries(bookingDirectory()).filter(([name,d])=>d.active!==false&&match([name,d.specialty,d.department,d.clinic].join(' ')));
  const services = [...patientPortalNav.map(([route,,label])=>[label,route]),['الفواتير والتأمين','patient-billing'],
    ['نتائج التحاليل والأشعة','patient-attachments/tests'],['طلب فحص','patient-diagnostics'],['الدعم','patient-requests/support']];
  const id = patientSessionId();
  const files = db.attachments.filter(row=>row.patient===id&&match([row.title,row.kind,row.filename].join(' ')));
  const results = patientApprovedResults(id).filter(row=>match(row.label));
  const empty=()=>patientScreenEmpty(query?'لا نتائج تطابق بحثك':'اكتب ما تبحث عنه');
  const doctors=providers.slice(0,12).map(([name,d])=>`<article class="patient-service-row">
    <div><a class="patient-record-title" href="#patient-doctors/profile/${encodeURIComponent(name)}">${esc(name)}</a><p>${esc(d.specialty)}</p></div>
    ${link('احجز','appointments/book/'+encodeURIComponent(name),'primary')}</article>`).join('');
  const clinics=[...new Map(providers.filter(([,d])=>d.clinic).map(([name,d])=>[d.clinic,[name,d]])).values()];
  const found=[...results.slice(0,10).map(row=>deskRow(row.label,healthArchiveDateLabel(row.date),'',
    link('عرض النتيجة','patient-attachments/result/'+encodeURIComponent(row.id),'secondary'))),...files.slice(0,10).map(healthArchiveFileRow)].join('');
  return `<div class="patient-screen"><h1 class="patient-sr-only">نتائج البحث</h1>
    <form id="patient-search-page" role="search" class="patient-screen-actions"><input class="input" name="query" type="search"
      aria-label="ابحث في البوابة" placeholder="ابحث عن طبيب، خدمة أو نتيجة" value="${esc(query)}" maxlength="100" required>
      <button type="submit" class="button primary">بحث</button></form>
    ${patientScreenPanel('أطباء',doctors||empty())}<div class="patient-two">
    ${patientScreenPanel('خدمات',[...clinics.map(([name,d])=>deskRow(d.clinic,d.location||'','',link('عرض','patient-doctors/profile/'+encodeURIComponent(name),'secondary'))),
      ...services.filter(([label])=>match(label)).map(([label,route])=>link(esc(label),route,'secondary'))].join('')||empty())}
    ${patientScreenPanel('نتائجي وملفاتي',found||empty())}</div></div>`;
}

let patientSearchQuery='';

document.addEventListener('submit',event=>{
  if (!['patient-portal-search','patient-search-page'].includes(event.target.id)||!patientSessionId()) return;
  event.preventDefault();
  const query = event.target.querySelector('input').value.trim();
  if (!query) return;
  patientSearchQuery=query;
  if (location.hash==='#patient-search') render();
  else location.hash='patient-search';
});

document.addEventListener('click',event=>{
  if (!patientSessionId()) return;
  const menu = $('.patient-profile-menu[open]');
  if (menu && (!menu.contains(event.target)||event.target.closest('a'))) menu.open=false;
  if (location.hash === '#portal' && event.target.closest('.patient-shell a[href="#portal"]') &&
    !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    $('#main').scrollTo({top:0,behavior:'instant'});
  }
  const control = event.target.closest('[data-patient-command]');
  if (!control) return;
  const action = control.dataset.patientCommand;
  if (action==='signout') {
    if (menu) menu.open=false;
    modal('تسجيل الخروج؟','<p>ستحتاج إلى تسجيل الدخول عند العودة.</p>',
      button('تسجيل الخروج','logout','primary')+button('البقاء','close','secondary'));
  } else if (action==='print-document') window.print();
  else if (action==='document-share'||action==='result-consult') patientDocumentAction(control);
  else if (action==='request' || action==='diagnostic') modal('طلب جديد',patientRequestForm(action==='diagnostic'?'طلب فحص':control.dataset.kind));
  else if (action==='renew') modal('طلب تجديد روشتة',patientRequestForm('تجديد روشتة',control.dataset.name||''));
  else if (action==='insurance-receipt') {
    const invoice=patientServiceRecord(adminLedgerRows('invoices'),control.dataset.id);
    if (invoice) modal('مراجعة الإيصال للتأمين',patientRequestForm('استفسار فاتورة أو تأمين','أطلب مراجعة إيصال الفاتورة '+invoice.id));
  }
  else if (action==='visit-report') {
    const visit = patientServiceRecord(db.visits,control.dataset.visit);
    const booking = patientServiceRecord(db.appointments,control.dataset.booking);
    const record = visit?.approved?visit:booking;
    if (record) modal('طلب تقرير الزيارة',patientRequestForm(patientRequestKinds[0],
      'أطلب تقرير الزيارة بتاريخ '+healthArchiveDateLabel(record.date)+' · '+(record.doctor||'العيادة')+' · '+record.id));
  }
  else if (action==='insurer') {
    const policy=myDeskRows('patientInsurers')[0];
    deskModal('إضافة جهة تأمين',field('شركة التأمين','insurer',patientRegisteredInsurer(),'text','required maxlength="100"')+
      field('رقم الوثيقة','policy',policy?.policy||'','text','maxlength="50"')+
      field('رقم العضوية','member',policy?.member||'','text','maxlength="50"'));
    deskSubmit('#desk-form',deskPatient,({insurer,policy,member})=>{
      if (!insurer||insurer.length>100) return 'اكتب اسم شركة التأمين.';
      if (policy.length>50||member.length>50) return 'راجع رقم الوثيقة والعضوية.';
      const current = myDeskRows('patientInsurers')[0];
      if (current) deskUpdate(current,{insurer,policy,member});
      else deskAdd('patientInsurers',{patient:deskPatient(),insurer,policy,member});
    });
  }
});
