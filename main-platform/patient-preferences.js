'use strict';

const patientPreferencesDefaults = {language:'ar', font:'normal', contrast:false, motion:false, portal:true,
  timings:['24','2'], family:false, insurance:false, marketing:false};
const patientReminderHours = [['24','قبل يوم'],['2','قبل ساعتين'],['168','قبل أسبوع']];
const patientFontOptions = [['small','صغير'],['normal','عادي'],['large','كبير'],['largest','كبير جدًا']];
const patientPreferences = (id=patientSessionId()) => ({...patientPreferencesDefaults,...db.patientPreferences?.[id]});
const patientProfileLinks = [
  ['reminders','التذكيرات والإشعارات'],['access','اللغة وإمكانية الوصول'],['privacy','الخصوصية والموافقات']
];
const patientEnglishNav = ['Home','Visits','Health','Inbox','Account'];
const patientNavLabel = (label,index) => patientPreferences().language==='en'?patientEnglishNav[index]:label;

function applyPatientPreferences() {
  const shell = $('.patient-shell');
  if (!shell) return;
  const prefs = patientPreferences();
  shell.dataset.font=prefs.font;
  shell.dataset.contrast=String(prefs.contrast);
  shell.dataset.motion=String(prefs.motion);
  $$('[data-patient-nav-label]').forEach(node=>{
    const index=Number(node.dataset.patientNavLabel);
    const item=patientPortalNav[index];
    const label=patientNavLabel(node.matches('.patient-tablet-label')||node.closest('.mobile-bottom')?(item[3]||item[2]):item[2],index);
    node.textContent=label;
    node.lang=prefs.language;
    if (node.parentElement.hasAttribute('aria-label')) node.parentElement.setAttribute('aria-label',label);
  });
}

function patientPreferenceToggle(label,key,enabled,disabled=false) {
  return `<label class="patient-setting"><span>${label}</span>
    <input class="patient-switch" type="checkbox" role="switch" data-patient-pref="${key}" ${enabled?'checked':''} ${disabled?'disabled':''}></label>`;
}

function patientReminders(id) {
  const prefs=patientPreferences(id);
  if (!prefs.portal) return [];
  return db.appointments.filter(row=>row.patient===id&&row.status==='مؤكد'&&canEditBooking(row)).flatMap(row=>{
    const date=new Date(row.date+'T'+row.time);
    return patientReminderHours.filter(([hours])=>prefs.timings.includes(hours)&&date.getTime()-Date.now()<=Number(hours)*3600000)
      .map(([hours,label])=>({key:'reminder:'+row.id+':'+row.date+':'+row.time+':'+hours,title:'تذكير بموعد '+row.doctor,
        detail:label+' · '+healthArchiveDateLabel(row.date)+' · '+row.time,date:row.date,route:patientBookingRoute(row.id)}));
  });
}

function patientPreferencesPage(view) {
  const prefs=patientPreferences();
  const page=patientProfileLinks.find(([id])=>id===view);
  if (!page) return '';
  let content;
  if (view==='reminders') {
    const booking=patientAppointmentGroups().upcoming.find(row=>row.status==='مؤكد');
    const channels=patientPreferenceToggle('رسالة نصية (SMS)','sms',false,true)+
      patientPreferenceToggle('واتساب','whatsapp',false,true)+patientPreferenceToggle('داخل البوابة','portal',prefs.portal)+
      '<p>تتوفر التذكيرات داخل البوابة عند فتحها. إرسال الرسائل الخارجية يحتاج ربط خدمة الإرسال.</p>';
    const timings=patientReminderHours.map(([hours,label])=>`<button type="button" class="patient-pill"
      data-patient-pref="timings" value="${hours}" aria-pressed="${prefs.timings.includes(hours)}">${label}</button>`).join('');
    const sample=booking?`<div class="patient-info-box"><h2>موعدك القادم</h2><p>${patientVisitDate(booking.date,booking.time)} · ${esc(booking.doctor)}</p>
      <div class="patient-screen-actions">${link('جهّز حضورك',patientBookingRoute(booking.id,'precheck'),'primary')}
      ${button('إعادة جدولة','edit-booking','secondary',`data-id="${esc(booking.id)}"`)}</div></div>`:
      patientScreenEmpty('يظهر تذكير هنا عند وجود موعد مؤكد');
    content=`<div class="patient-two patient-equal">${patientScreenPanel('قناة التذكير',channels+
      '<h2>توقيت التذكير</h2><div class="patient-screen-pills">'+timings+'</div>')}${patientScreenPanel('معاينة التذكير',sample)}</div>`;
  } else if (view==='access') {
    const languages=[['ar','العربية'],['en','English']].map(([id,label])=>`<button class="patient-pill" type="button" lang="${id}"
      data-patient-pref="language" value="${id}" aria-pressed="${prefs.language===id}">${label}</button>`).join('');
    const sizes=patientFontOptions.map(([id,label])=>`<button class="patient-pill" type="button" data-size="${id}"
      data-patient-pref="font" value="${id}" aria-label="${label}" aria-pressed="${prefs.font===id}">أ</button>`).join('');
    content=patientScreenPanel('اللغة','<div class="patient-screen-pills">'+languages+'</div>'+
      '<p>اختيار اللغة يغيّر عناوين التنقل. محتوى السجلات بالعربية.</p><h2>حجم الخط</h2>'+
      '<div class="patient-screen-pills">'+sizes+'</div>'+patientPreferenceToggle('تباين عالٍ','contrast',prefs.contrast)+
      patientPreferenceToggle('تقليل الحركة','motion',prefs.motion),'','patient-access-panel');
  } else {
    const id=patientSessionId();
    const accesses=db.audit.filter(row=>row.resource===id&&row.action==='عرض ملف أو كشف سريري');
    const entries=accesses.map(row=>deskRow(row.actor||row.role,[row.role,row.time].filter(Boolean).join(' · '))).join('');
    const approvals=patientPreferenceToggle('مشاركة النتائج مع أفراد الأسرة المفوضين','family',prefs.family)+
      patientPreferenceToggle('إرسال بيانات للتأمين','insurance',prefs.insurance)+
      patientPreferenceToggle('رسائل تسويقية','marketing',prefs.marketing)+
      '<p>تُسجّل الاختيارات محليًا في المعاينة.</p><div><button type="button" class="button secondary" data-patient-pref="export">تحميل نسخة من بياناتي</button></div>';
    content=`<div class="patient-two patient-equal">${patientScreenPanel('من اطلع على ملفي',entries||
      patientScreenEmpty('لا توجد عمليات اطلاع مسجلة في المعاينة'))}${patientScreenPanel('الموافقات',approvals)}</div>`;
  }
  return '<div class="patient-screen">'+patientScreenHeading(page[1])+content+'</div>';
}

function exportPatientData(id) {
  const own=rows=>rows.filter(row=>row.patient===id);
  const {name,phone,age,doctor}=patient();
  const {language,font,contrast,motion,portal,timings,family,insurance,marketing}=patientPreferences(id);
  const data={profile:{id,name,phone,age,doctor},preferences:{language,font,contrast,motion,portal,timings,family,insurance,marketing},
    appointments:own(db.appointments).map(({id,doctor,date,time,status,type})=>({id,doctor,date,time,status,type})),
    requests:own(db.patientRequests||[]), sharedReports:own(db.sharedReports),
    attachments:own(db.attachments).map(({title,kind,date,filename})=>({title,kind,date,filename}))};
  adminDownload('MNUH333-patient-data.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');
}

function savePatientPreference(control) {
  const id=patientSessionId();
  if (!id||control.disabled) return;
  if (control.dataset.patientPref==='export') { exportPatientData(id); return; }
  deskRefresh();
  const prefs=patientPreferences(id);
  const key=control.dataset.patientPref;
  if (key==='timings'&&patientReminderHours.some(([hours])=>hours===control.value)) {
    prefs.timings=prefs.timings.includes(control.value)?prefs.timings.filter(value=>value!==control.value):[...prefs.timings,control.value];
  } else if (key==='font'&&patientFontOptions.some(([value])=>value===control.value)) prefs.font=control.value;
  else if (key==='language'&&['ar','en'].includes(control.value)) prefs.language=control.value;
  else if (['contrast','motion','portal','family','insurance','marketing'].includes(key)&&control.type==='checkbox') prefs[key]=control.checked;
  else return;
  (db.patientPreferences ||= {})[id]=prefs;
  log('تعديل تفضيلات المريض',id);
  applyPatientPreferences();
  if (control.tagName==='BUTTON') {
    const controls=$$('button[data-patient-pref]').filter(node=>node.dataset.patientPref===key);
    controls.forEach(node=>node.setAttribute('aria-pressed',String(key==='timings'?prefs.timings.includes(node.value):prefs[key]===node.value)));
  }
}

document.addEventListener('click',event=>{
  const control=event.target.closest('button[data-patient-pref]');
  if (control) savePatientPreference(control);
});
document.addEventListener('change',event=>{
  if (event.target.matches('input[data-patient-pref]')) savePatientPreference(event.target);
});
