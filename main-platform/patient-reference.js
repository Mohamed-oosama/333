'use strict';

const patientEmergencyNumbers = [
  ['الإسعاف','123'], ['شرطة النجدة','122'], ['المطافئ','180'], ['الغاز الطبيعي','129']
];
const patientEmergencyTopics = [
  ['gas','تسرب غاز','129',['اخرج مع الموجودين واتصل من الخارج.'],['تجنّب اللهب وتشغيل أو إطفاء المفاتيح الكهربائية.'],'https://www.southwark.gov.uk/housing/repairs-maintenance-and-home-safety/home-safety/get-help-hazard-home/gas-safety/what-do-if'],
  ['accident','حادث أو إصابة','123',['تأكد من أمان المكان واتصل بالإسعاف.','إذا كان هناك نزيف شديد ولا يوجد جسم مغروس في الجرح، اضغط عليه بقطعة قماش نظيفة.'],['تجنّب نزع أي جسم مغروس في الجرح.'],'https://www.sja.org.uk/first-aid-advice/severe-bleeding/'],
  ['fire','حريق','180',['اخرج فورًا عبر الدرج واتصل بالمطافئ من مكان آمن.','أغلق الباب خلفك أثناء الخروج إن كان ذلك آمنًا.'],['تجنّب المصعد والعودة إلى المبنى.'],'https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/home-fire-escape-plans/'],
  ['burn','حروق','123',['برّد الحرق الحراري بماء جارٍ بارد باعتدال لمدة 20 دقيقة.','اتصل بالإسعاف للحروق الكبيرة أو العميقة أو حروق الوجه أو الحروق الكهربائية والكيميائية.'],['تجنّب الكريمات والزبدة وفتح الفقاعات ونزع الملابس الملتصقة.'],'https://www.nhs.uk/conditions/burns-and-scalds/'],
  ['poison','تسمم أو ابتلاع مادة','123',['اتصل بالإسعاف فورًا عند الاشتباه بالتسمم.','احتفظ بالعبوة إن أمكن لإطلاع المسعف عليها.'],['تجنّب محاولة إحداث القيء أو إعطاء المصاب طعامًا أو شرابًا.'],'https://www.nhs.uk/conditions/poisoning/'],
  ['unresponsive','فقدان الوعي أو توقف التنفس','123',['اتصل بالإسعاف وضع الهاتف على مكبر الصوت.','إذا كان المصاب غير مستجيب ولا يتنفس طبيعيًا، ابدأ الإنعاش القلبي الرئوي حسب توجيه موظف الإسعاف.'],['تجنّب إعطاء فاقد الوعي أي شيء بالفم.'],'https://www.sja.org.uk/first-aid-advice/cpr/']
];

function patientPhone(value) {
  const number=String(value||'').replace(/[\s()-]/g,'');
  return /^\+?\d{3,16}$/.test(number)?number:'';
}

function patientCall(label, value, tone='secondary') {
  const number=patientPhone(value);
  return number?'<a class="button '+tone+'" href="tel:'+number+'">'+esc(label)+' <bdi>'+number+'</bdi></a>':'';
}

function patientDirections(address) {
  return address?'<a class="button secondary" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(address)+'">فتح الاتجاهات</a>':'';
}

function patientAllergyValue(person) {
  const value=String(person?.allergy||'').trim().replace(/^حساسية(?: مسجلة)?\s*[:：]\s*/,'');
  return /^(لم تُ?سج[ّ]?ل|لا توجد حساسية|لا يوجد|غير مسجل|—)/.test(value)?'':value;
}

function patientAllergyNotice(person) {
  const value=patientAllergyValue(person);
  return value?'<p class="patient-allergy-notice"><strong>حساسية مسجلة</strong> · '+esc(value)+'</p>':'';
}

function patientEmergencyCard(full=false) {
  const p=patient();
  const contact=p.emergencyContact;
  const values=[
    ['رقم الملف',p.id],['فصيلة الدم',p.bloodType],['الحساسية المسجلة',patientAllergyValue(p)],
    ['الأمراض المزمنة',p.chronicConditions],['جهة اتصال للطوارئ',[contact?.name,contact?.phone].filter(Boolean).join(' · ')]
  ];
  return '<dl class="patient-emergency-facts">'+values.map(([label,value])=>
    '<div><dt>'+label+'</dt><dd><bdi>'+esc(value||'غير مسجل')+'</bdi></dd></div>').join('')+'</dl>'+
    (full?'':link('عرض لمقدم الإسعاف','patient-emergency/card','primary'));
}

function patientEmergencyPage(view) {
  const hospital=hospitalProfile();
  const chosen=patientEmergencyTopics.find(([id])=>id===view);
  const guide=view==='guide'||Boolean(chosen);
  const ambulance=patientCall('اتصال بالإسعاف',123);
  const facility=patientCall('طوارئ المستشفى',hospital.emergencyPhone);
  const nav=patientScreenPills([
    ...patientEmergencyTopics.map(([id,title])=>[id,({accident:'حادث',poison:'تسمم',unresponsive:'فقدان الوعي'})[id]||title,'patient-emergency/'+id]),
    ['guide','الدليل الكامل · كيف أتصرف؟','patient-emergency/guide']
  ],view,'أنواع الطوارئ');
  const list=items=>'<ul>'+items.map(item=>'<li>'+item+'</li>').join('')+'</ul>';
  if (view==='card') return '<div class="patient-screen">'+patientScreenHeading('بطاقتي الطبية للطوارئ',link('الطوارئ','patient-emergency','secondary'))+
    patientScreenPanel(esc(patient().name),patientEmergencyCard(true),'','patient-centered-card')+'</div>';
  const banner='<section class="patient-emergency-hero"><div><h1>'+(guide?'كيف أتصرف؟':'في حالة طارئة، اتصل فورًا')+
    '</h1><p>'+(guide?'اتصل من مكان آمن واتبع تعليمات خدمة الطوارئ.':'اتصل بخدمة الطوارئ مباشرة. رسائل البوابة مخصصة للاستفسارات.')+
    '</p></div><div class="patient-screen-actions">'+ambulance+(guide?'':facility)+'</div></section>';
  if (guide) {
    const cards=(chosen?[chosen]:patientEmergencyTopics).map(([id,title,number,actions,avoid,source])=>
      patientScreenPanel(title,'<strong class="patient-first-aid-do">خطوات أولية</strong>'+list(actions)+
        '<strong class="patient-first-aid-avoid">تجنّب</strong>'+list(avoid)+
        '<a href="'+source+'" target="_blank" rel="noopener noreferrer">المصدر</a>',patientCall('اتصال',number)));
    return '<div class="patient-screen">'+banner+nav+'<div class="patient-three">'+cards.join('')+'</div></div>';
  }
  const numbers=[patientEmergencyNumbers[0],['طوارئ المستشفى',hospital.emergencyPhone],['الطبيب المناوب',hospital.onCallPhone],
    ['الاستقبال',hospital.phone]];
  const contacts=numbers.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+
    (patientPhone(value)?'<a dir="ltr" href="tel:'+patientPhone(value)+'">'+esc(value)+'</a>':'غير مسجل')+'</dd></div>').join('');
  const urgent=list(['ألم مفاجئ في الصدر يستمر أو يصاحبه ضيق نفس','صعوبة شديدة في التنفس','فقدان الوعي أو تشنجات','نزيف شديد','تورم مفاجئ في اللسان أو الحلق']);
  return '<div class="patient-screen">'+banner+nav+'<div class="patient-three">'+
    patientScreenPanel('اتصل بالإسعاف فورًا إذا ظهر',urgent)+
    patientScreenPanel('أرقام مهمة','<dl class="patient-emergency-facts">'+contacts+'</dl><div class="patient-emergency-quick">'+
      patientEmergencyNumbers.slice(1).map(([label,value])=>'<a href="tel:'+value+'">'+label+' <bdi>'+value+'</bdi></a>').join('')+'</div>'+
      (hospital.address?'<p>'+esc(hospital.address)+'</p>'+patientDirections(hospital.address):'<p>عنوان قسم الطوارئ غير مسجل.</p>'))+
    patientScreenPanel('بطاقتي الطبية للطوارئ','<strong>'+esc(patient().name)+'</strong>'+patientEmergencyCard())+'</div></div>';
}

const patientFeedbackTypes=['شكوى','اقتراح','شكر'];
const patientFeedbackDepartments=()=>[...new Set([...bookingDepartments(),'الاستقبال','المختبر','الأشعة','الفواتير والتأمين','أخرى'])];

function patientFeedbackPage() {
  return '<div class="patient-screen">'+patientScreenPanel('',
    '<h1>شكوى أو اقتراح</h1><form class="patient-service-form" id="patient-feedback"><fieldset><legend>النوع</legend>'+
    '<div class="patient-screen-pills">'+patientFeedbackTypes.map((type,i)=>
      '<label class="patient-option-pill"><input type="radio" name="feedbackType" value="'+type+'" '+(i===0?'checked':'')+'><span>'+type+'</span></label>').join('')+'</div></fieldset>'+
    adminSelect('القسم أو الخدمة','department',[['','اختر القسم'],...patientFeedbackDepartments().map(item=>[item,item])],'','required')+
    '<label class="field"><span>التفاصيل</span><textarea class="input" name="detail" rows="4" maxlength="400" required></textarea></label>'+
    '<label class="patient-setting"><span>أرغب في أن يتواصل معي فريق خدمة العملاء</span><input class="patient-switch" type="checkbox" name="callback" role="switch"></label>'+
    '<p role="alert" class="form-error"></p><button class="button primary" type="submit">إرسال</button></form>','','patient-narrow-form')+'</div>';
}

function patientFamilyMember(id) {
  return deskOwned('family',id);
}

function patientFamilyProfile(id) {
  const row=patientFamilyMember(id);
  const own=link('العودة لملفي','portal','secondary');
  const body=row?'<p class="patient-info-box"><strong>تعرض الآن ملف '+esc(row.name)+'</strong> · <a href="#portal">العودة لملفي</a></p>'+
    patientScreenHeading('الرئيسية · ملف '+esc(row.name))+
    patientScreenPanel('بيانات فرد الأسرة','<dl class="patient-emergency-facts"><div><dt>صلة القرابة</dt><dd>'+esc(row.relationship)+'</dd></div><div><dt>تاريخ الميلاد</dt><dd>'+patientServiceDate(row.birth)+'</dd></div></dl>'+
      '<p>هذا الملف يعرض بيانات الفرد المسجلة في قائمة الأسرة.</p>',link('إدارة الأسرة والتفويض','patient-family','secondary')):
    patientScreenHeading('الملف غير متاح',own)+patientScreenEmpty('اختر فردًا من قائمة أسرتك.',link('الأسرة والتفويض','patient-family','secondary'));
  return '<div class="patient-screen">'+body+'</div>';
}

function patientFamilyMenu(p) {
  return '<p>ملفات الأسرة</p><a class="patient-family-switch" href="#portal"><strong>'+esc(p.name)+' (أنا)</strong><span data-patient-file-current="">'+icon('check')+'</span></a>'+
    myDeskRows('family').map(row=>'<a class="patient-family-switch" href="#patient-family/member/'+encodeURIComponent(row.id)+'">'+
      '<div><strong>'+esc(row.name)+'</strong><small>'+esc(row.relationship)+'</small></div>'+
      '<span data-patient-file-current="'+esc(row.id)+'" hidden>'+icon('check')+'</span></a>').join('')+
    '<a href="#patient-family">إدارة الأسرة والتفويض</a><a href="#patient-profile">حسابي</a>'+
    '<a href="#patient-onboarding">جولة البوابة</a><button type="button" class="button secondary" data-patient-command="signout">تسجيل الخروج</button>';
}

function patientRecordTable(headers,rows) {
  return '<div class="patient-table-scroll" tabindex="0" role="region" aria-label="جدول البيانات"><table class="patient-detail-table"><thead><tr>'+
    headers.map(title=>'<th scope="col">'+title+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

function patientDocumentPage(kind,id) {
  const prescription=kind==='prescription';
  const route=prescription?'patient-attachments/instructions':'patient-attachments/tests';
  const row=prescription?db.sharedReports.find(item=>item.visit===id&&item.patient===patientSessionId()&&
    (item.medications||item.prescriptions?.length)):patientApprovedResults(patientSessionId()).find(item=>item.id===id);
  if (!row) return '<div class="patient-screen">'+patientScreenHeading('المستند غير متاح',link('العودة إلى صحتي',route,'secondary'))+'</div>';
  const doctor=prescription?patientServiceRecord(db.visits,row.visit)?.doctor:row.approvedBy;
  const title=prescription?'روشتة '+row.visit:row.label;
  const share='<button type="button" class="button secondary" data-patient-command="document-share" data-kind="'+kind+'" data-id="'+esc(id)+'">'+
    (prescription?'مشاركة مع الصيدلية':'مشاركة مع طبيب')+'</button>';
  const print='<button type="button" class="button primary" data-patient-command="print-document">حفظ PDF</button>';
  let details;
  if (prescription) {
    details=row.prescriptions?.length?patientRecordTable(['الدواء','الجرعة والتكرار','المدة','التعليمات','إجراء'],
      row.prescriptions.map(drug=>[esc(drug.label),esc([drug.dose,drug.frequency].filter(Boolean).join(' · ')||'—'),
        esc(drug.duration||'—'),esc([drug.route,drug.instructions].filter(Boolean).join(' · ')||'—'),patientRenewalButton(drug.label)])):
      '<p class="patient-shared-plan">'+esc(row.medications)+'</p>';
  } else if (row.kind==='lab') {
    const hasRange=Number.isFinite(row.low)&&Number.isFinite(row.high);
    const inRange=hasRange&&row.value>=row.low&&row.value<=row.high;
    details=patientRecordTable(['البند','القيمة','النطاق المرجعي','الحالة'],[[esc(row.label),
      '<bdi>'+esc(row.value+' '+row.unit)+'</bdi>',hasRange?'<bdi>'+esc(row.low+' – '+row.high)+'</bdi>':'—',
      badge(!hasRange?'غير محدد':inRange?'ضمن النطاق':'خارج النطاق',hasRange&&!inRange?'amber':'teal')]]);
  } else details='<p class="patient-shared-plan">'+esc(row.text)+'</p>';
  const consult=prescription?'':'<p>ناقش تفسير النتيجة مع طبيبك.</p><div><button type="button" class="button secondary" data-patient-command="result-consult" data-id="'+esc(id)+'">طلب استشارة بخصوص النتيجة</button></div>';
  return '<div class="patient-screen patient-document"><p><a href="#'+route+'">صحتي / '+(prescription?'التعليمات والروشتات':'النتائج والأشعة')+'</a></p>'+
    patientScreenHeading(esc(title),'<div class="patient-screen-actions">'+share+print+'</div>')+
    '<p>'+patientServiceDate(row.date)+(doctor?' · '+esc(doctor):'')+'</p>'+
    (prescription?patientAllergyNotice(patient()):'')+patientScreenPanel('',details)+consult+'</div>';
}

function patientPreparationPage(row) {
  const doctor=bookingDirectory()[row.doctor];
  const hospital=hospitalProfile();
  const items=[['identity','إحضار بطاقة الهوية'],['reports','إحضار التقارير والأشعة السابقة إن توفرت'],
    ['medications','إحضار قائمة الأدوية الحالية']];
  const saved=row.preparation||[];
  return '<div class="patient-screen"><p><a href="#appointments">مواعيدي</a> / <bdi>'+esc(row.id)+'</bdi></p>'+
    patientScreenHeading('قبل موعدك · '+patientVisitDate(row.date,row.time))+'<div class="patient-two">'+
    patientScreenPanel('التحضير','<form id="patient-preparation" class="patient-service-form" data-id="'+esc(row.id)+'">'+
      (doctor?.preparation?'<p>'+esc(doctor.preparation)+'</p>':'')+
      items.map(([key,label])=>'<label class="patient-setting"><span>'+label+'</span><input type="checkbox" name="item" value="'+key+'" '+(saved.includes(key)?'checked':'')+'></label>').join('')+
      '<p role="alert" class="form-error"></p><button class="button primary">سجل حضورك مسبقًا</button></form>')+
    patientScreenPanel('مكان الموعد','<p>'+esc([row.doctor,doctor?.clinic,doctor?.location].filter(Boolean).join(' · '))+'</p>'+
      (hospital.address?'<p>'+esc(hospital.address)+'</p>'+patientDirections(hospital.address):patientScreenEmpty('عنوان المستشفى غير مسجل')))+
    '</div></div>';
}

function patientOnboardingPage(step) {
  const current=['1','2','3'].includes(step)?Number(step):1;
  const prefs=patientPreferences();
  const content=[
    '<h1>أهلًا بك في بوابة المريض</h1><p>اختر لغة التنقل</p><div class="patient-screen-pills">'+
      [['ar','العربية'],['en','English']].map(([id,label])=>'<button type="button" class="patient-pill" aria-pressed="'+(prefs.language===id)+'" data-patient-pref="language" data-value="'+id+'">'+label+'</button>').join('')+'</div>',
    '<h1>خدمات البوابة</h1><ul><li>مواعيدي وحجز الأطباء</li><li>صحتي ونتائجي وأدويتي</li><li>طلباتي ورسائلي</li><li>حسابي وفواتيري</li></ul>',
    '<h1>فعّل التذكيرات</h1>'+patientPreferenceToggle('رسالة نصية', 'sms',false,true)+patientPreferenceToggle('داخل البوابة','portal',prefs.portal)+'<p>التذكير برسالة نصية غير متاح في النسخة الحالية.</p>'
  ];
  return '<div class="patient-screen patient-onboarding">'+patientScreenPanel('','<div class="patient-onboarding-header">'+logo('portal')+'<p>'+current+' من 3</p></div>'+content[current-1]+
    '<div class="patient-onboarding-actions">'+(current===3?link('ابدأ','portal','primary'):link('التالي','patient-onboarding/'+(current+1),'primary'))+
    (current>1?link('رجوع','patient-onboarding/'+(current-1),'secondary'):'')+'<a href="#portal">الانتقال للرئيسية</a></div>','','patient-narrow-form')+'</div>';
}

function patientCareRoom(id) {
  const row=deskOwned('care',id);
  if (!row||row.kind!=='استشارة عن بُعد'||row.state!=='تم تحديد الموعد'||!row.scheduled) {
    return '<div class="patient-screen">'+patientScreenHeading('غرفة الانتظار',link('طلبات الرعاية','patient-care','secondary'))+
      patientScreenEmpty('تتاح الغرفة عند تحديد موعد الاستشارة عن بُعد.')+'</div>';
  }
  return '<div class="patient-screen"><div class="patient-two patient-care-room">'+
    patientScreenPanel('','<h1>غرفة الانتظار</h1><div class="patient-care-preview"><video id="patient-care-preview" autoplay playsinline muted hidden></video><p>معاينة الكاميرا</p></div>'+
      '<div class="patient-screen-actions"><button type="button" class="patient-pill" id="patient-room-camera" aria-pressed="false">تشغيل الكاميرا</button>'+
      '<button type="button" class="patient-pill" id="patient-room-mic" aria-pressed="false">اختبار الميكروفون</button></div>'+
      '<p>موعدك · '+esc(new Date(row.scheduled).toLocaleString('ar-EG-u-nu-latn',{dateStyle:'short',timeStyle:'short'}))+'</p><p id="patient-room-status" role="status">يمكنك اختبار أجهزتك على هذا الجهاز.</p>'+
      '<button type="button" class="button primary" id="patient-room-join">جرّب واجهة المكالمة</button><a href="#patient-requests/support">مشكلة تقنية؟ تواصل مع الدعم</a>')+
    '<section class="patient-screen-panel patient-call-stage"><h2>الاستشارة عن بُعد</h2><p id="patient-call-state" role="status">المكالمة مع الطبيب تتطلب خدمة فيديو متصلة.</p>'+
      '<div class="patient-screen-actions" id="patient-call-controls" hidden><button type="button" class="button secondary" id="patient-call-mic" aria-pressed="false">الميكروفون</button>'+
      '<button type="button" class="button secondary" id="patient-call-camera" aria-pressed="false">الكاميرا</button>'+
      link('رسائل الاستقبال','patient-messages','secondary')+link('إنهاء','patient-care','danger')+'</div></section></div></div>';
}

let patientMediaTracks = {};

function stopPatientMedia() {
  const tracks=patientMediaTracks;
  patientMediaTracks={};
  Object.values(tracks).forEach(track=>track.stop());
}

window.addEventListener('hashchange',stopPatientMedia);
window.addEventListener('pagehide',stopPatientMedia);

function bindPatientCareRoom() {
  const preview=$('#patient-care-preview');
  if (!preview) return;
  const status=$('#patient-room-status');
  const switches={video:[$('#patient-room-camera'),$('#patient-call-camera')],audio:[$('#patient-room-mic'),$('#patient-call-mic')]};
  for (const [kind,controls] of Object.entries(switches)) {
    const setState=active=>{
      controls.forEach(control=>control.setAttribute('aria-pressed',String(active)));
      controls[0].textContent=kind==='video'?(active?'الكاميرا تعمل':'تشغيل الكاميرا'):(active?'الميكروفون يعمل':'اختبار الميكروفون');
      if (kind==='video') {
        preview.srcObject=active?new MediaStream([patientMediaTracks.video]):null;
        preview.hidden=!active;
        preview.nextElementSibling.hidden=active;
      }
    };
    const toggle=async()=>{
      if (patientMediaTracks[kind]) {
        patientMediaTracks[kind].stop();
        delete patientMediaTracks[kind];
        setState(false);
        status.textContent='تم إيقاف '+(kind==='video'?'الكاميرا.':'الميكروفون.');
        return;
      }
      controls.forEach(control=>control.disabled=true);
      try {
        const stream=await navigator.mediaDevices.getUserMedia({[kind]:true});
        if (!preview.isConnected) { stream.getTracks().forEach(track=>track.stop());return; }
        const track=stream.getTracks()[0];
        patientMediaTracks[kind]=track;
        track.addEventListener('ended',()=>{
          if (patientMediaTracks[kind]!==track) return;
          delete patientMediaTracks[kind];
          setState(false);
          status.textContent='انقطع اتصال الجهاز.';
        });
        setState(true);
        status.textContent='الجهاز يعمل في المعاينة المحلية.';
      } catch {
        status.textContent='تعذّر تشغيل الجهاز. تحقّق من إذن المتصفح وتوصيل الجهاز.';
      } finally {
        controls.forEach(control=>control.disabled=false);
      }
    };
    controls.forEach(control=>control.addEventListener('click',toggle));
  }
  $('#patient-room-join').addEventListener('click',()=>{
    $('#patient-call-controls').hidden=false;
    $('#patient-call-state').textContent='المعاينة جاهزة على هذا الجهاز.';
    $('#patient-call-mic').focus();
  });
}

function bindPatientReferenceScreens() {
  const form=$('#patient-feedback');
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const {feedbackType,department,detail,callback}=Object.fromEntries(data);
    if (!patientFeedbackTypes.includes(feedbackType)||!patientFeedbackDepartments().includes(department)||!detail?.trim()||detail.length>400) {
      form.querySelector('[role=alert]').textContent='اختر القسم واكتب التفاصيل.';
      return;
    }
    const request=savePatientRequest('شكوى أو اقتراح',detail.trim(),{feedbackType,department,callback:callback==='on'});
    if (!request) {
      form.querySelector('[role=alert]').textContent='تعذّر حفظ الطلب. أعد المحاولة.';
      return;
    }
    location.hash='patient-requests/sent/'+encodeURIComponent(request.id);
  });
  const preparation=$('#patient-preparation');
  preparation?.addEventListener('submit',event=>{
    event.preventDefault();
    deskRefresh();
    const row=patientServiceRecord(db.appointments,preparation.dataset.id);
    if (row?.status!=='مؤكد'||!canEditBooking(row)) return;
    const previous=row.preparation;
    row.preparation=new FormData(preparation).getAll('item').filter(item=>['identity','reports','medications'].includes(item));
    if (!save()) {
      row.preparation=previous;
      preparation.querySelector('[role=alert]').textContent='تعذّر حفظ التحضير. أعد المحاولة.';
      return;
    }
    location.hash=patientBookingRoute(row.id,'precheck');
  });
  const memberRoute=location.hash.match(/^#patient-family\/member\/([^/]+)$/);
  const member=memberRoute&&patientFamilyMember(patientDecode(memberRoute[1]));
  const menu=$('.patient-profile-menu > div');
  if (menu) {
    menu.innerHTML=patientFamilyMenu(patient())+'<a class="patient-tablet-label" href="#patient-search">البحث في البوابة</a>'+
      '<a class="patient-tablet-label" href="#patient-notices">الإشعارات</a>';
    menu.querySelectorAll('[data-patient-file-current]').forEach(node=>{
      const current=node.dataset.patientFileCurrent===(member?.id||'');
      node.hidden=!current;
      if (current) node.closest('a').setAttribute('aria-current','page');
    });
  }
  bindPatientCareRoom();
}

function patientChangePhone() {
  const session=demoSession;
  const id=patientSessionId();
  modal('تعديل رقم الهاتف','<form id="patient-change-phone" class="patient-service-form">'+
    field('الرقم الجديد','phone','','tel','dir="ltr" inputmode="tel" required maxlength="20"')+
    '<button type="button" class="button secondary" id="patient-phone-code">إنشاء رمز العرض</button><p id="patient-phone-status" role="status"></p>'+
    field('رمز التحقق','code','','text','dir="ltr" inputmode="numeric" required maxlength="6" autocomplete="one-time-code"')+
    '<p class="form-error" role="alert"></p><button class="button primary">تأكيد</button></form>');
  const form=$('#patient-change-phone');
  const error=form.querySelector('[role=alert]');
  const send=form.querySelector('#patient-phone-code');
  const normalize=value=>value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()-]/g,'');
  const phoneAvailable=phone=>/^01[0125]\d{8}$/.test(phone)&&
    !db.patients.some(row=>normalize(row.phone||'')===phone)&&db.patients.some(row=>row.id===id);
  let challenge;
  form.elements.phone.addEventListener('input',()=>{
    challenge=null;
    form.querySelector('[role=status]').textContent='';
    form.elements.code.value='';
  });
  send.addEventListener('click',()=>{
    if (session!==demoSession||challenge&&Date.now()<challenge.retryAt) return;
    deskRefresh();
    const phone=normalize(form.elements.phone.value);
    if (!phoneAvailable(phone)) { error.textContent='أدخل رقم موبايل مصريًا جديدًا وغير مسجل.';return; }
    const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
    challenge={phone,code,expiresAt:Date.now()+300000,retryAt:Date.now()+45000,attempts:0};
    error.textContent='';
    form.querySelector('[role=status]').textContent='رمز العرض المحلي '+code;
    form.elements.code.focus();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (session!==demoSession) return;
    if (!challenge||Date.now()>=challenge.expiresAt||challenge.attempts>=5) {
      error.textContent='أنشئ رمز تحقق جديدًا.';return;
    }
    challenge.attempts++;
    if (normalize(form.elements.code.value)!==challenge.code) { error.textContent='رمز التحقق غير صحيح.';return; }
    deskRefresh();
    const person=db.patients.find(row=>row.id===id);
    if (!phoneAvailable(challenge.phone)) { error.textContent='الرقم غير متاح. اختر رقمًا جديدًا.';return; }
    const previous=person.phone;
    person.phone=challenge.phone;
    if (!log('تحديث هاتف التواصل',id)) {
      person.phone=previous;
      db.audit.shift();
      error.textContent='تعذّر حفظ رقم الهاتف. أعد المحاولة.';
      return;
    }
    closeModal();
    render();
    toast('تم تحديث رقم الهاتف.');
  });
}

function patientDocumentAction(control) {
  const {id,kind,patientCommand:action}=control.dataset;
  const prescription=kind==='prescription';
  const row=prescription?db.sharedReports.find(item=>item.patient===patientSessionId()&&item.visit===id&&
    (item.medications||item.prescriptions?.length)):patientApprovedResults(patientSessionId()).find(item=>item.id===id);
  if (!row) return;
  if (action==='result-consult') {
    modal('طلب استشارة بخصوص النتيجة',patientRequestForm('استشارة عن بُعد',('أرغب في مناقشة نتيجة '+row.label+' · '+row.id).slice(0,400)));
    return;
  }
  const recipient=prescription?'الصيدلية':'الطبيب';
  const session=demoSession;
  modal('مشاركة مع '+recipient,'<p>حدد الجهة ليُسجّل طلب مراجعة المشاركة داخل البوابة.</p>'+
    '<form id="patient-document-share" class="patient-service-form">'+field('اسم '+recipient,'recipient','','text','required maxlength="100"')+
    '<p role="alert" class="form-error"></p><button class="button primary">إرسال طلب المشاركة</button></form>');
  const form=$('#patient-document-share');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (demoSession!==session) return;
    const target=form.elements.recipient.value.trim();
    if (!target) { form.querySelector('[role=alert]').textContent='اكتب اسم الجهة.';return; }
    deskRefresh();
    const stillVisible=prescription?db.sharedReports.some(item=>item.patient===patientSessionId()&&item.visit===id&&
      (item.medications||item.prescriptions?.length)):patientApprovedResults(patientSessionId()).some(item=>item.id===id);
    if (!stillVisible) {form.querySelector('[role=alert]').textContent='المستند غير متاح في ملفك.';return;}
    const request=savePatientRequest('مشاركة مستند طبي',('مراجعة مشاركة '+(prescription?'الروشتة '+row.visit:'نتيجة '+row.label+' · '+row.id)+' مع '+target).slice(0,400));
    if (!request) {form.querySelector('[role=alert]').textContent='تعذّر حفظ الطلب. أعد المحاولة.';return;}
    closeModal();
    location.hash='patient-requests/sent/'+encodeURIComponent(request.id);
  });
}
