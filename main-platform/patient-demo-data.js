'use strict';

const patientPreviewId = 'CL-1024';
const patientPreviewFiles = {
  'DEMO-FILE-LAB': ['تحليل دم · عينة عرض','تحليل','cbc-demo.png','doctor',[
    'الهيموجلوبين: 13.8 g/dL','القيمة تخص عينة وهمية لتجربة واجهة النتائج.'
  ]],
  'DEMO-FILE-IMAGING': ['تقرير أشعة الصدر · عينة عرض','أشعة','chest-imaging-demo.png','radiologist',[
    'أشعة صدر رقمية','مستند توضيحي لتجربة فتح ملفات الأشعة وتنزيلها.'
  ]],
  'DEMO-FILE-REPORT': ['ملخص الزيارة · عينة عرض','تقرير','visit-summary-demo.png','doctor',[
    'زيارة متابعة بالعيادة','النتائج والروشتة التجريبية متاحة في تبويب صحتي.'
  ]],
  'DEMO-FILE-REFERRAL': ['خطاب إحالة · عينة عرض','مستند آخر','referral-demo.png','patient',[
    'نسخة مرفق لعرض ملف الإحالة','لا توجد إحالة فعلية مرتبطة بهذه العينة.'
  ]]
};

function patientPreviewAttachment(meta) {
  const sample = meta.patient===patientPreviewId && Object.hasOwn(patientPreviewFiles,meta.id) && patientPreviewFiles[meta.id];
  if (!sample) return null;
  const canvas = document.createElement('canvas');
  canvas.width=900;
  canvas.height=530;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f2f8f8';
  ctx.fillRect(0,0,900,530);
  ctx.fillStyle='#0b6b78';
  ctx.fillRect(0,0,900,112);
  ctx.direction='rtl';
  ctx.textAlign='right';
  ctx.fillStyle='#fff';
  ctx.font='bold 34px Arial';
  ctx.fillText('مستند تجريبي · '+hospitalProfile().name,850,70);
  ctx.fillStyle='#0f2f35';
  ctx.font='bold 33px Arial';
  ctx.fillText(sample[0],850,188);
  ctx.font='24px Arial';
  ctx.fillText(healthArchiveDateLabel(meta.date),850,245);
  sample[4].forEach((line,index)=>ctx.fillText(line,850,312+index*52));
  ctx.fillStyle='#4b5f63';
  ctx.fillText('بيانات مصطنعة للمعاينة فقط',850,474);
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}

function seedPatientPreview() {
  if (db.patientPreviewSeeded || !db.patients.some(row=>row.id===patientPreviewId) || db.credentials?.[patientPreviewId]) return;

  const patient=patientPreviewId;
  const now=new Date();
  const day = offset => bookingDateKey(new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12));
  const recent=day(-3);
  const earlier=day(-22);
  const stamp=(date,time='10:00')=>new Date(date+'T'+time+':00').toISOString();
  const createdAt=stamp(recent);
  const doctor='د. سارة أحمد';
  const visit='DEMO-VISIT-FOLLOWUP';
  const completed='DEMO-BK-COMPLETE';
  const insurer='شركة أفق للتأمين · تجريبي';
  const policy='DEMO-POL-1024';
  const add=(target,key,rows)=>{
    const list=(target[key] ||= []);
    list.push(...rows.filter(row=>!list.some(saved=>saved.id===row.id)));
  };
  const owned=(id,fields)=>({id,patient,...fields});

  add(db,'appointments',[
    owned(completed,{doctor,date:recent,time:'10:00',status:'مكتمل',type:'متابعة بالعيادة · تجريبي',completedAt:stamp(recent,'10:30')}),
    owned('DEMO-BK-PAST',{doctor,date:earlier,time:'11:30',status:'مكتمل',type:'كشف أول مرة · تجريبي',completedAt:stamp(earlier,'12:00')})
  ]);
  const directory=bookingDirectory();
  const doctors=[doctor,...Object.keys(directory).filter(name=>name!==doctor)];
  for (const [id,status,offset] of [['DEMO-BK-NEXT','مؤكد',2],['DEMO-BK-PENDING','بانتظار التأكيد',7]]) {
    for (const name of doctors) {
      const date=availableBookingDays(name,patient,12).find(key=>key>=day(offset));
      if (!date) continue;
      add(db,'appointments',[owned(id,{doctor:name,date,time:availableBookingTimes(name,patient,date)[0],status,
        type:'متابعة بالعيادة · تجريبي',createdAt,...(status==='مؤكد'?{confirmedAt:stamp(recent,'10:30')}:{} )})]);
      break;
    }
  }
  const waitDate=availableBookingDays(doctor,patient,10).find(key=>key>=day(5));
  if (waitDate) add(db,'appointmentWaitlist',[owned('DEMO-WAIT', {doctor,date:waitDate,status:'waiting',createdAt})]);

  add(db,'visits',[
    owned('DEMO-VISIT-FIRST',{doctor,appointmentId:'DEMO-BK-PAST',date:earlier,time:'11:30',approved:true,approvedAt:stamp(earlier,'12:00'),type:'كشف أول مرة · تجريبي',note:'زيارة اصطناعية لعرض سجل المتابعة.'}),
    owned(visit,{doctor,appointmentId:completed,date:recent,time:'10:00',approved:true,approvedAt:stamp(recent,'10:30'),
      type:'متابعة بالعيادة · تجريبي',note:'زيارة اصطناعية لعرض تقرير المراجعة والملفات المرتبطة.'})
  ]);
  add(db,'sharedReports',[
    owned('DEMO-RX-FIRST',{visit:'DEMO-VISIT-FIRST',doctor,date:earlier,
      instructions:'تعليمات قديمة تظهر في سجل الزيارات للتجربة.',
      prescriptions:[{label:'دواء سابق · عينة عرض',dose:'وحدة تجريبية',frequency:'حسب الروشتة التجريبية',duration:'5 أيام'}]}),
    owned('DEMO-RX-LATEST',{visit,doctor,date:recent,
      instructions:'موعد المتابعة مسجل في مواعيدي. التقرير ونتائج العينة متاحان في صحتي.',
      prescriptions:[{label:'دواء المتابعة · عينة عرض',dose:'وحدة تجريبية',frequency:'حسب الروشتة التجريبية',duration:'10 أيام',instructions:'عنصر توضيحي لعرض الروشتة.'}]})
  ]);
  const lab={kind:'lab',label:'الهيموجلوبين · عينة عرض',testCode:'DEMO-HGB',unit:'g/dL',low:13,high:17,approvedBy:doctor};
  add(db,'releasedResults',[
    owned('DEMO-RESULT-OLD',{...lab,visit:'DEMO-VISIT-FIRST',date:earlier,approvedAt:stamp(earlier),value:12.4}),
    owned('DEMO-RESULT-NEW',{...lab,visit,date:recent,approvedAt:stamp(recent),value:13.8}),
    owned('DEMO-RESULT-REVIEW',{kind:'review',visit,date:recent,approvedBy:doctor,approvedAt:stamp(recent),
      label:'مراجعة فحوصات الزيارة · عينة عرض',text:'تمت مشاركة نتيجة المختبر وتقرير الأشعة في هذا المثال.'})
  ]);
  add(db,'attachments',Object.entries(patientPreviewFiles).map(([id,[title,kind,filename,uploader]])=>
    owned(id,{title,kind,filename,uploader,date:recent,visit,mime:'image/png'})));

  const ledgers=(db.adminLedgers ||= {});
  const paid='DEMO-INV-PAID';
  add(ledgers,'invoices',[
    owned(paid,{appointment:'DEMO-BK-PAST',service:'زيارة بالعيادة · تجريبية',amount:350,date:earlier,insurer,
      lines:[{service:'كشف بالعيادة',amount:350}]}),
    owned('DEMO-INV-BALANCE',{appointment:completed,service:'متابعة وفحوصات · تجريبية',amount:750,date:recent,insurer,
      lines:[{service:'زيارة متابعة',amount:300},{service:'تحاليل وأشعة',amount:450}]})
  ]);
  add(ledgers,'payments',[
    {id:'DEMO-PAY-FULL',invoice:paid,amount:350,date:earlier,method:'بطاقة'},
    {id:'DEMO-PAY-PARTIAL',invoice:'DEMO-INV-BALANCE',amount:250,date:recent,method:'نقدي'}
  ]);

  add(db,'patientRequests',[
    owned('DEMO-REQ-REPORT',{kind:'استخراج تقرير أو نسخة من الملف',detail:'نسخة من ملخص زيارة المتابعة التجريبية.',
      status:'تم الرد',reply:'التقرير موجود في صحتي تحت النتائج والأشعة.',date:stamp(recent,'09:00'),updatedAt:stamp(recent,'13:30')}),
    owned('DEMO-REQ-BILL',{kind:'استفسار فاتورة أو تأمين',detail:'مراجعة الرصيد بعد الدفعة المسجلة في المثال.',status:'قيد المراجعة',date:stamp(recent,'14:00')}),
    owned('DEMO-REQ-FEEDBACK',{kind:'شكوى أو اقتراح',feedbackType:'اقتراح',department:'الاستقبال',
      detail:'اقتراح تجريبي بإظهار موقع العيادة بجانب وقت الحجز.',status:'تم الرد',reply:'شكرًا، الموقع ظاهر في تفاصيل الموعد.',date:stamp(earlier)})
  ]);

  const desk=(db.serviceDesk ||= {});
  if (!desk.patientInsurers?.some(row=>row.patient===patient) && !db.patients.find(row=>row.id===patient).insurer) {
    add(desk,'patientInsurers',[owned('DEMO-INSURER',{insurer,policy,member:'DEMO-MEMBER-1024',createdAt})]);
  }
  add(desk,'coverage',[
    owned('DEMO-COVER-PAID',{insurer,policy,service:'زيارة المتابعة · تجريبية',state:'موافقة تجريبية',createdAt,
      updatedAt:stamp(recent,'11:00'),reply:'اتسجلت الموافقة داخل المعاينة.'}),
    owned('DEMO-COVER-WAIT',{insurer,policy,service:'مراجعة تغطية الأشعة · تجريبية',state:'قيد المراجعة',createdAt})
  ]);
  add(desk,'threads',[
    owned('DEMO-THREAD-FILES',{subject:'نسخة نتيجة التحليل · تجريبي',createdAt,messages:[
      {sender:'patient',text:'ممكن أعرف فين نسخة نتيجة التحليل؟',at:stamp(recent,'10:20')},
      {sender:'reception',text:'هتلاقيها في صحتي ← النتائج والأشعة ← تحاليل.',at:stamp(recent,'10:35')}
    ]}),
    owned('DEMO-THREAD-VISIT',{subject:'مكان العيادة والاستقبال · تجريبي',createdAt,messages:[
      {sender:'patient',text:'فين أراجع تفاصيل المكان قبل الزيارة؟',at:stamp(recent,'12:10')},
      {sender:'reception',text:'افتح مواعيدي واختار «قبل موعدك» لعرض مكان العيادة وقائمة التجهيز.',at:stamp(recent,'12:20')}
    ]})
  ]);
  add(desk,'care',[
    owned('DEMO-CARE-VIDEO',{kind:'استشارة عن بُعد',summary:'موعد متابعة تجريبي لمعاينة غرفة الانتظار.',state:'تم تحديد الموعد',
      scheduled:stamp(day(5),'16:30'),createdAt,updatedAt:stamp(recent,'09:45')}),
    owned('DEMO-CARE-HOME',{kind:'رعاية منزلية',summary:'طلب تجريبي لعرض حالة المراجعة.',state:'مطلوب',createdAt})
  ]);
  add(desk,'family',[
    owned('DEMO-FAMILY-PARTNER',{name:'ليلى محمود · حساب عرض',relationship:'زوج أو زوجة',birth:'1980-05-09',createdAt}),
    owned('DEMO-FAMILY-CHILD',{name:'مريم أحمد · حساب عرض',relationship:'ابن أو ابنة',birth:'2012-08-24',createdAt})
  ]);
  add(desk,'delegates',[owned('DEMO-DELEGATE',{name:'ليلى محمود · حساب عرض',scope:'عرض النتائج، حجز المواعيد',
    duration:30,state:'طلب تفويض',createdAt})]);
  add(db,'facilities',[{id:'DEMO-BED',name:'سرير ملاحظة 02 · تجريبي',type:'bed',state:'available'}]);
  add(db,'receptionStays',[owned('DEMO-STAY',{bed:'DEMO-BED',admitted:stamp(earlier),discharge:stamp(day(-21),'12:00')})]);

  db.patientPreviewSeeded=true;
  save();
}
