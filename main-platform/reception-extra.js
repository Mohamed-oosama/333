'use strict';

const deskTabs = [
  ['inbox','الرسائل والطلبات'],['insurance','التأمين'],['cash','الخزينة والاسترداد'],
  ['calls','الاتصالات'],['visitors','الزوار'],['tasks','المهام'],['branches','الفروع'],['documents','المستندات'],['kiosk','كشك الوصول']
];
const deskBranchOptions = () => adminFacilities().filter(item=>item.type==='branch').map(item=>[item.id,item.name]);
const deskOpenShift = () => deskRows('shifts').find(row=>row.actor===deskActor()&&!row.closedAt);
const deskNetShift = id => adminLedgerRows('payments').filter(row=>row.shift===id).reduce((sum,row)=>sum+row.amount,0)-
  deskRows('refunds').filter(row=>row.shift===id).reduce((sum,row)=>sum+row.amount,0);
const deskRefundable = payment => Math.round(payment.amount*100)-
  deskRows('refunds').filter(row=>row.payment===payment.id).reduce((sum,row)=>sum+Math.round(row.amount*100),0);

function receptionDeskInbox() {
  return deskPanel('رسائل المرضى',deskRows('threads').slice().reverse().map(row=>
    deskRow(row.subject,adminPatientName(row.patient)+' · '+(row.messages.at(-1)?.text||''),
      '',deskAction('فتح المحادثة','staff-thread',row.id))))+
    deskPanel('طلبات الرعاية عن بُعد والمنزلية',deskRows('care').slice().reverse().map(row=>
      deskRow(row.kind,adminPatientName(row.patient)+' · '+row.summary,row.state,deskAction('تحديث الطلب','care-review',row.id))));
}

function receptionDeskInsurance() {
  return deskPanel('طلبات مراجعة التغطية',deskRows('coverage').slice().reverse().map(row=>
    deskRow(row.service,[adminPatientName(row.patient),row.insurer,row.policy,row.reply].filter(Boolean).join(' · '),
      row.state,deskAction('مراجعة الطلب','coverage-review',row.id))));
}

function receptionDeskReview(collection,id) {
  const row=deskRows(collection).find(item=>item.id===id);
  if (!row) return;
  const isCare=collection==='care';
  const states=isCare?careStates:coverageStates;
  deskModal(isCare?'تحديث طلب رعاية':'مراجعة طلب تأمين',
    `<p>${esc(adminPatientName(row.patient)+' · '+(row.kind||row.service))}</p>`+
    deskSelect('الحالة','state',states,row.state)+
    (isCare?field('موعد الخدمة (اختياري)','scheduled',row.scheduled||'','datetime-local'):'')+
    field('ملاحظة تظهر للمريض','reply',row.reply||'','text','maxlength="200"'));
  deskSubmit('#desk-form',deskReception,({state,scheduled,reply})=>{
    const current=deskRows(collection).find(item=>item.id===id);
    if (!current||!states.includes(state)||reply.length>200||
      (isCare&&((state==='تم تحديد الموعد'&&!scheduled)||(scheduled&&!Number.isFinite(Date.parse(scheduled)))))) {
      return 'راجع الحالة والموعد والرد.';
    }
    deskUpdate(current,{state,reply,...(isCare?{scheduled}:{} )});
  });
}

function receptionDeskCash() {
  const shift=deskOpenShift();
  const payments=adminLedgerRows('payments').filter(row=>row.amount>0&&row.source!=='simulation').slice().reverse();
  return patientService('وردية الخزينة',shift?
    deskRow('الوردية الحالية','بدأت '+deskWhen(shift.createdAt)+' · صافي الحركات '+receptionMoney(deskNetShift(shift.id)),
      'مفتوحة',deskAction('إغلاق الوردية','shift-close',shift.id)):
    deskAction('فتح وردية','shift-open','','primary'))+
    deskPanel('الورديات السابقة',deskRows('shifts').filter(row=>row.actor===deskActor()&&row.closedAt).slice().reverse().map(row=>
      deskRow('وردية '+deskWhen(row.createdAt),'الصافي '+receptionMoney(row.net)+' · أُغلقت '+deskWhen(row.closedAt),'مغلقة')))+
    deskPanel('المدفوعات القابلة للاسترداد',payments.map(row=>deskRow(row.invoice,
      row.method+' · المدفوع '+receptionMoney(row.amount)+' · متاح للاسترداد '+receptionMoney(Math.max(0,deskRefundable(row))/100),
      '',shift&&deskRefundable(row)>0?deskAction('تسجيل استرداد','refund-add',row.id):'')))+
    deskPanel('سجل الاسترداد',deskRows('refunds').slice().reverse().map(row=>
      deskRow(row.invoice,receptionMoney(row.amount)+' · '+row.reason,'استرداد تجريبي')));
}

function receptionDeskShift(action,id) {
  if (action==='shift-open') {
    deskModal('فتح وردية',field('رصيد افتتاحي تجريبي','opening','','number','required min="0" step="0.01"'));
    deskSubmit('#desk-form',deskReception,({opening})=>{
      const cents=deskAmount(opening);
      if (deskOpenShift()||cents===null) return 'راجع الرصيد وحالة الوردية.';
      deskAdd('shifts',{opening:cents/100});
    });
    return;
  }
  const current=deskOpenShift();
  if (current?.id!==id) return;
  deskModal('إغلاق الوردية',`<p>صافي الحركات ${esc(receptionMoney(deskNetShift(id)))}.</p>`+
    field('النقد المعدود تجريبيًا','counted','','number','required min="0" step="0.01"'),'إغلاق الوردية');
  deskSubmit('#desk-form',deskReception,({counted})=>{
    const shift=deskOpenShift();
    const cents=deskAmount(counted);
    if (shift?.id!==id||cents===null) return 'راجع النقد وحالة الوردية.';
    deskUpdate(shift,{closedAt:deskNow(),counted:cents/100,net:deskNetShift(id)});
  });
}

function receptionDeskRefund(id) {
  const find=()=>adminLedgerRows('payments').find(row=>row.id===id&&row.source!=='simulation');
  const payment=find();
  if (!payment||!deskOpenShift()||deskRefundable(payment)<=0) return;
  deskModal('تسجيل استرداد تجريبي',`<p>الحد المتاح ${esc(receptionMoney(deskRefundable(payment)/100))}.</p>`+
    field('المبلغ','amount','','number','required min="0.01" step="0.01"')+
    field('سبب الاسترداد','reason','','text','required maxlength="150"'));
  deskSubmit('#desk-form',deskReception,({amount,reason})=>{
    const current=find(), shift=deskOpenShift(), cents=deskAmount(amount);
    if (!current||!shift||!cents||cents>deskRefundable(current)||!reason||reason.length>150) return 'راجع المبلغ والسبب وحالة الوردية.';
    deskAdd('refunds',{invoice:current.invoice,payment:id,shift:shift.id,amount:cents/100,reason,date:receptionToday()});
  });
}

const deskLogs = {
  calls:{title:'سجل الاتصالات',add:'تسجيل مكالمة',label:'موضوع المكالمة',states:['مفتوحة','تم الرد','مغلقة']},
  visitors:{title:'سجل الزوار',add:'تسجيل زائر',label:'اسم الزائر',states:['بالداخل','غادر']},
  tasks:{title:'مهام الاستقبال',add:'إضافة مهمة',label:'عنوان المهمة',states:['جديدة','قيد التنفيذ','مكتملة']},
  complaints:{title:'الشكاوى',add:'تسجيل شكوى',label:'التصنيف',states:['جديدة','معيّنة','قيد المراجعة','بانتظار الرد','تم الحل','مغلقة']},
  documents:{title:'مراجعة المستندات الإدارية',add:'تسجيل مستند',label:'اسم المستند',states:['بانتظار المراجعة','تمت المراجعة','مطلوب استكمال']}
};

function receptionDeskLog(collection) {
  const config=deskLogs[collection];
  const rows=deskRows(collection).slice().reverse().map(row=>deskRow(row.label,
      [row.patient?adminPatientName(row.patient):'',row.notes,deskWhen(row.createdAt)].filter(Boolean).join(' · '),
      row.state,deskAction('تحديث الحالة','log-update',collection+'/'+row.id)));
  return patientService(config.title,deskAction(config.add,'log-add',collection,'primary')+
    (rows.length?rows.join(''):patientServiceEmpty('لا توجد سجلات بعد.')));
}

function receptionDeskLogForm(collection,id) {
  const config=deskLogs[collection];
  if (!config) return;
  const row=id&&deskRows(collection).find(item=>item.id===id);
  if (id&&!row) return;
  const requiresPatient=collection==='documents';
  const personField=requiresPatient?deskPersonField():adminSelect('ربط بمريض (اختياري)','patient',
    [['','بدون ملف'],...db.patients.map(p=>[p.id,p.name+' · '+p.id])],'');
  deskModal(id?'تحديث الحالة':config.add,
    (id?`<p>${esc(row.label)}</p>`:field(config.label,'label','','text','required maxlength="100"')+personField)+
    deskSelect('الحالة','state',config.states,row?.state||config.states[0])+
    field('ملاحظة إدارية','notes',row?.notes||'','text','maxlength="200"'));
  deskSubmit('#desk-form',deskReception,({label,patient,state,notes})=>{
    if (!config.states.includes(state)||notes.length>200) return 'راجع الحالة والملاحظة.';
    if (id) {
      const current=deskRows(collection).find(item=>item.id===id);
      if (!current) return 'السجل غير متاح.';
      deskUpdate(current,{state,notes,...(collection==='visitors'?{exitedAt:state==='غادر'?current.exitedAt||deskNow():null}:{})});
    } else {
      if (!label||label.length>100||((patient||requiresPatient)&&!receptionPerson(patient))) return 'راجع الاسم والملف.';
      deskAdd(collection,{label,patient,state,notes});
    }
  });
}

function receptionDeskBranches() {
  const branches=deskBranchOptions();
  const today=receptionToday();
  const dateLabel=esc(receptionDate(today));
  const doctors=bookingDirectory();
  const counts=key=>db.appointments.filter(a=>a.date===today&&a.status!=='ملغي'&&(doctors[a.doctor]?.branch||'الفرع الرئيسي')===key);
  const names=[...new Set([...branches.map(([,name])=>name),...Object.values(doctors).map(d=>d.branch||'الفرع الرئيسي')])];
  return deskPanel('تشغيل الفروع · '+dateLabel,names.map(name=>{
    const list=counts(name);
    return deskRow(name,list.length+' موعد · '+list.filter(a=>a.status==='تم تسجيل الوصول').length+' وصول',
      list.filter(a=>a.status==='مكتمل').length+' زيارة مكتملة',
      deskAction('عرض مواعيد الفرع','branch-open',name));
  }));
}

function receptionDeskBranch(name) {
  const directory=bookingDirectory();
  const rows=db.appointments.filter(row=>row.date===receptionToday()&&
    (directory[row.doctor]?.branch||'الفرع الرئيسي')===name);
  modal(esc(name),deskPanel('مواعيد اليوم',rows.map(row=>deskRow(adminPatientName(row.patient),
    [row.doctor,row.time].join(' · '),row.status))));
}

function receptionDeskKiosk() {
  return patientService('كشك تسجيل الوصول',`<p>وضع تجريبي مستقل لشاشة تسجيل الوصول باستخدام رمز موعد مؤكد لليوم.</p>
    ${link('فتح الكشك','check-in-kiosk','primary')}`);
}

function receptionExtraPage(section) {
  const panels={inbox:receptionDeskInbox,insurance:receptionDeskInsurance,cash:receptionDeskCash,
    calls:()=>receptionDeskLog('calls'),visitors:()=>receptionDeskLog('visitors'),tasks:()=>receptionDeskLog('tasks'),
    documents:()=>receptionDeskLog('documents'),branches:receptionDeskBranches,kiosk:receptionDeskKiosk};
  const active=Object.hasOwn(panels,section)?section:'inbox';
  return pageHead('خدمات الاستقبال','تابع طلبات المرضى والتشغيل الإداري في المعاينة المحلية.','','بوابة الاستقبال')+
    adminTabs('reception-services',deskTabs,active)+patientServiceWrap(panels[active]());
}

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-desk-action]');
  if (!control||!deskReception()) return;
  deskRefresh();
  if (!deskReception()) return;
  const {deskAction:action,id}=control.dataset;
  if (action==='staff-thread') deskOpenThread(id,true);
  if (action==='coverage-review') receptionDeskReview('coverage',id);
  if (action==='care-review') receptionDeskReview('care',id);
  if (action==='shift-open'||action==='shift-close') receptionDeskShift(action,id);
  if (action==='refund-add') receptionDeskRefund(id);
  if (action==='log-add'||action==='log-update') receptionDeskLogForm(...id.split('/'));
  if (action==='branch-open') receptionDeskBranch(id);
});
