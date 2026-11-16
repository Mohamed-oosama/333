'use strict';

const patientExtraTitles = {
  'patient-family':'الأسرة والتفويض', 'patient-messages':'رسائل الاستقبال',
  'patient-insurance':'التأمين والتغطية', 'patient-care':'الرعاية عن بُعد والمنزلية',
  'patient-pay':'الدفع الإلكتروني', 'patient-diagnostics':'المختبر والأشعة'
};
const patientExtraHead = (key,sub,actions='') =>
  pageHead(patientExtraTitles[key],sub,actions+link('كل الخدمات','patient-services','secondary'),'بوابة المريض');
const myDeskRows = collection => deskRows(collection).filter(row=>row.patient===deskPatient()).slice().reverse();
const coverageStates = ['قيد المراجعة','مطلوب استكمال','موافقة تجريبية','مرفوض'];
const careStates = ['مطلوب','تم تحديد الموعد','مكتمل','ملغي'];
const careKinds = ['استشارة عن بُعد','رعاية منزلية'];

function patientFamilyPage() {
  const actions = '<div class="patient-screen-actions">'+deskAction('طلب تفويض','delegate-add','','secondary')+
    deskAction('إضافة فرد','family-add','','primary')+'</div>';
  const family = myDeskRows('family').map(row=>deskRow(row.name,row.relationship+' · '+patientServiceDate(row.birth),
    '',link('عرض الملف','patient-family/member/'+encodeURIComponent(row.id),'secondary')+deskAction('إزالة','family-remove',row.id))).join('');
  const delegates = myDeskRows('delegates').map(row=>deskRow(row.name,[row.scope,row.duration?'لمدة '+row.duration+' يوم':row.contact].filter(Boolean).join(' · '),row.state,
    row.state==='مسحوب'?'':deskAction('سحب الطلب','delegate-revoke',row.id))).join('');
  return '<div class="patient-screen">'+patientScreenHeading('الأسرة والتفويض',actions)+
    patientScreenPanel('أفراد الأسرة',family||patientScreenEmpty('لا يوجد أفراد بعد · أضف فردًا إلى قائمة أسرتك'))+
    patientScreenPanel('تفويض مقدمي الرعاية',delegates||patientScreenEmpty('لا توجد تفويضات بعد'))+'</div>';
}

function patientFamilyAction(action,id) {
  if (action==='family-add') {
    deskModal('إضافة فرد',field('الاسم','name','','text','required maxlength="100"')+
      deskChoice('صلة القرابة','relationship',['ابن أو ابنة','زوج أو زوجة','أب أو أم','أخرى'])+
      field('تاريخ الميلاد','birth','','date','required max="'+receptionToday()+'"'));
    deskSubmit('#desk-form',deskPatient,({name,relationship,birth})=>{
      if (!name||name.length>100||!['ابن أو ابنة','زوج أو زوجة','أب أو أم','أخرى'].includes(relationship)||
        !healthArchiveDate(birth)||birth>receptionToday()) return 'راجع الاسم وتاريخ الميلاد وصلة القرابة.';
      deskAdd('family',{patient:deskPatient(),name,relationship,birth});
    });
  }
  if (action==='delegate-add') {
    const scopes=['عرض النتائج','حجز المواعيد','الفواتير والدفع'];
    deskModal('طلب تفويض',field('اسم المفوَّض','name','','text','required maxlength="100"')+
      '<fieldset><legend>الصلاحيات المطلوبة</legend>'+scopes.map(scope=>
        '<label class="patient-setting"><span>'+scope+'</span><input type="checkbox" name="scope" value="'+scope+'"></label>').join('')+'</fieldset>'+
      field('مدة التفويض بالأيام','duration','','number','required min="1" max="365" step="1"')+
      '<p>يسجّل الطلب للمراجعة قبل تفعيل أي صلاحية.</p>','إرسال الطلب');
    deskSubmit('#desk-form',deskPatient,({name,duration})=>{
      const permissions=new FormData($('#desk-form')).getAll('scope').filter(scope=>scopes.includes(scope));
      const days=Number(duration);
      if (!name||name.length>100||!permissions.length||!Number.isInteger(days)||days<1||days>365) return 'راجع الاسم والصلاحيات والمدة.';
      deskAdd('delegates',{patient:deskPatient(),name,scope:permissions.join('، '),duration:days,state:'طلب تفويض'});
    });
  }
  if (action==='family-remove'||action==='delegate-revoke') {
    const collection=action==='family-remove'?'family':'delegates';
    const row=deskOwned(collection,id);
    if (!row) return;
    deskModal(action==='family-remove'?'إزالة فرد من القائمة':'سحب طلب التفويض',`<p>${esc(row.name)}</p>`,'تأكيد');
    deskSubmit('#desk-form',deskPatient,()=>{
      const current=deskOwned(collection,id);
      if (!current) return 'السجل غير متاح.';
      if (collection==='family') {
        db.serviceDesk.family=deskRows('family').filter(item=>item.id!==id);
        log('إزالة فرد من قائمة الأسرة',id);
      } else deskUpdate(current,{state:'مسحوب'});
    });
  }
}

function deskThreadBody(thread) {
  return deskPanel('المحادثة',thread.messages.map(item=>deskRow(item.sender==='patient'?'المريض':'فريق الاستقبال',
    item.text+'\n'+deskWhen(item.at))))+
    `<form id="desk-reply-form" class="patient-service-form">${deskText('رسالتك','text')}
      <p class="form-error" role="alert"></p><button class="button primary" type="submit">إرسال الرسالة</button></form>`;
}

function deskOpenThread(id,staff) {
  const find=()=>staff?deskRows('threads').find(row=>row.id===id):deskOwned('threads',id);
  const row=find();
  if (!row) return;
  modal(esc(row.subject),deskThreadBody(row));
  deskSubmit('#desk-reply-form',staff?deskReception:deskPatient,({text})=>{
    const current=find();
    if (!current||!text||text.length>500) return 'اكتب رسالة صالحة.';
    deskUpdate(current,{messages:[...current.messages,{sender:staff?'reception':'patient',text,at:deskNow()}]});
  });
}

function patientConversationScreen(threads,id) {
  const thread = threads.find(row=>row.id===id);
  const entries = threads.map(row=>`<a class="patient-thread-link" href="#patient-messages/${encodeURIComponent(row.id)}"
    ${row===thread?'aria-current="page"':''}><strong>${esc(row.subject)}</strong><span>${esc(row.messages.at(-1)?.text||'')}</span></a>`).join('');
  const history = thread ? thread.messages.map(item=>`<article class="patient-message" data-sender="${item.sender==='patient'?'patient':'reception'}">
    <strong>${item.sender==='patient'?'أنت':'فريق الاستقبال'}</strong><p>${esc(item.text)}</p><small>${esc(deskWhen(item.at))}</small></article>`).join(''):
    '<p class="patient-thread-empty">اختر محادثة أو ابدأ واحدة جديدة</p>';
  return `<div class="patient-two patient-messages-layout">
    ${patientScreenPanel('محادثاتي',entries||patientScreenEmpty('لا توجد سجلات بعد'))}
    <section class="patient-screen-panel patient-conversation">
      <div class="patient-conversation-history">${thread?`<h2>${esc(thread.subject)}</h2>`:''}${history}</div>
      <form id="patient-inline-reply" data-thread="${esc(thread?.id||'')}">
        <input class="input" name="text" aria-label="اكتب رسالتك" placeholder="اكتب رسالتك..." maxlength="500" required ${thread?'':'disabled'}>
        <button class="button primary" type="submit" ${thread?'':'disabled'}>إرسال</button>
        <p class="form-error" role="alert"></p>
      </form></section></div>`;
}

function bindPatientConversation() {
  const form = $('#patient-inline-reply');
  if (!form?.dataset.thread) return;
  const history = $('.patient-conversation-history');
  history.scrollTop=history.scrollHeight;
  deskSubmit('#patient-inline-reply',deskPatient,({text})=>{
    const current = deskOwned('threads',form.dataset.thread);
    if (!current||!text||text.length>500) return 'اكتب رسالة صالحة.';
    deskUpdate(current,{messages:[...current.messages,{sender:'patient',text,at:deskNow()}]});
  });
}

function patientNewThread() {
  deskModal('محادثة جديدة',field('الموضوع','subject','','text','required maxlength="100"')+deskText('الرسالة','text'),'إرسال');
  deskSubmit('#desk-form',deskPatient,({subject,text})=>{
    if (!subject||subject.length>100||!text||text.length>500) return 'راجع الموضوع والرسالة.';
    const thread = deskAdd('threads',{patient:deskPatient(),subject,messages:[{sender:'patient',text,at:deskNow()}]});
    history.pushState(null,'','#patient-messages/'+encodeURIComponent(thread.id));
  });
}

function patientCoverageForm() {
  deskModal('طلب مراجعة تغطية',field('شركة التأمين','insurer',patientRegisteredInsurer(),'text','required maxlength="100"')+
    field('الخدمة المطلوبة','service','','text','required maxlength="100"')+
    field('مرجع الوثيقة','policy','','text','maxlength="40"'),'إرسال الطلب');
  deskSubmit('#desk-form',deskPatient,({insurer,service,policy})=>{
    if (!insurer||insurer.length>100||!service||service.length>100||policy.length>40) return 'راجع بيانات الطلب.';
    deskAdd('coverage',{patient:deskPatient(),insurer,service,policy,state:coverageStates[0]});
  });
}

function patientCareForm() {
  deskModal('طلب رعاية',deskChoice('الخدمة','kind',careKinds)+deskText('المعلومات الإدارية للطلب','summary'));
  deskSubmit('#desk-form',deskPatient,({kind,summary})=>{
    if (!careKinds.includes(kind)||!summary||summary.length>500) return 'راجع بيانات الطلب.';
    deskAdd('care',{patient:deskPatient(),kind,summary,state:careStates[0]});
  });
}

const patientPaymentMethods = [['card','بطاقة'],['wallet','محفظة إلكترونية'],['desk','في الاستقبال']];

function patientPayPage(id) {
  const invoice=patientServiceRecord(adminLedgerRows('invoices'),id);
  const heading=patientScreenHeading('الفواتير والمدفوعات',link('فواتيري','patient-billing','secondary'));
  if (!invoice) return '<div class="patient-screen">'+heading+patientScreenEmpty('الفاتورة غير متاحة في ملفك')+'</div>';
  const balance=adminInvoiceBalance(invoice);
  const payment=adminLedgerRows('payments').filter(row=>row.invoice===id).at(-1);
  const actions=balance>0?`<form id="patient-payment" class="patient-service-form" data-id="${esc(id)}">
    <p>طريقة الدفع</p><div class="patient-screen-pills">${patientPaymentMethods.map(([key,label],i)=>`<label class="patient-choice">
    <input type="radio" name="method" value="${key}" ${i===0?'checked':''}><span>${label}</span></label>`).join('')}</div>
    <p>محاكاة دفع داخل المعاينة</p><button class="button primary" type="submit">متابعة الدفع</button></form>`:'';
  const receipt=payment?`<div class="patient-info-box"><h2>${balance>0?'تم تسجيل دفعة':'تم تسجيل الدفع'}</h2>
    <p>رقم العملية <bdi>${esc(payment.id)}</bdi></p></div><div class="patient-screen-stack">
    ${link('طباعة الإيصال / حفظ PDF','patient-billing/'+encodeURIComponent(id),'secondary')}
    <button class="button secondary" type="button" data-patient-command="insurance-receipt" data-id="${esc(id)}">طلب مراجعة الإيصال للتأمين</button></div>`:
    patientScreenEmpty('يظهر الإيصال بعد تسجيل الدفع');
  return `<div class="patient-screen">${heading}<div class="patient-two">
    ${patientScreenPanel('فاتورة '+esc(id),`<p>${esc(invoice.service)} · ${patientServiceDate(invoice.date)}</p>
    <strong class="patient-balance">${esc(receptionMoney(balance))}</strong>${actions}`)}
    ${patientScreenPanel('بعد الدفع',receipt)}</div></div>`;
}

function patientPayPreview(id, method) {
  const own=()=>patientServiceRecord(adminLedgerRows('invoices'),id);
  const invoice=own();
  const option=patientPaymentMethods.find(([key])=>key===method);
  if (!invoice||!option) return;
  if (method==='desk') {
    modal('الدفع في الاستقبال','<p>اعرض رقم الفاتورة <bdi>'+esc(id)+'</bdi> عند الاستقبال لتسجيل الدفع.</p>',button('رجوع','close'));
    return;
  }
  const amount=adminInvoiceBalance(invoice);
  if (amount<=0) return;
  deskModal('تأكيد دفع تجريبي',`<p>${esc(option[1])} · ${esc(receptionMoney(amount))}. تُسجّل نتيجة المحاكاة داخل هذا المتصفح.</p>`,'تأكيد المحاكاة');
  deskSubmit('#desk-form',deskPatient,()=>{
    const current=own();
    if (!current||adminInvoiceBalance(current)!==amount) return 'المبلغ المستحق اتغيّر. افتح الفاتورة من جديد.';
    ((db.adminLedgers ||= {}).payments ||= []).push({id:crypto.randomUUID(),invoice:id,amount,method:option[1]+' · دفع تجريبي',
      date:receptionToday(),createdAt:deskNow(),source:'simulation'});
    log('محاكاة دفع إلكتروني',id);
  });
}

function patientDeskNotices(id) {
  return [
    ...deskRows('threads').filter(row=>row.patient===id).flatMap(row=>row.messages.filter(message=>message.sender==='reception').map(message=>({
      key:'desk-message:'+row.id+':'+message.at,title:'رسالة من فريق الاستقبال',detail:row.subject,date:message.at,route:'patient-messages'
    }))),
    ...[['coverage','patient-insurance'],['care','patient-care']].flatMap(([collection,route])=>deskRows(collection)
      .filter(row=>row.patient===id&&row.updatedAt).map(row=>({
        key:collection+':'+row.id+':'+row.updatedAt,title:row.service||row.kind,detail:row.state,date:row.updatedAt,route
      })))
  ];
}

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-desk-action]');
  if (!control||!deskPatient()) return;
  deskRefresh();
  const {deskAction:action,id}=control.dataset;
  if (['family-add','family-remove','delegate-add','delegate-revoke'].includes(action)) patientFamilyAction(action,id);
  if (action==='thread-add') patientNewThread();
  if (action==='thread-open' && deskOwned('threads',id)) location.hash='patient-messages/'+encodeURIComponent(id);
  if (action==='coverage-add') patientCoverageForm();
  if (action==='care-add') patientCareForm();
});
