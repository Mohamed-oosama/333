'use strict';

const adminTitles = {
  dashboard:'لوحة الإدارة', 'admin-facilities':'المستشفى والإعدادات', 'admin-staff':'الأطباء والموظفون',
  'manage-doctors':'الأطباء والموظفون', 'admin-doctor':'ملف الطبيب', 'admin-patient':'ملف المريض',
  'admin-patients':'المرضى', 'admin-bookings':'الحجوزات والتشغيل',
  'admin-inventory':'المخزون والمشتريات', 'admin-diagnostics':'المختبر والأشعة والنماذج',
  'admin-models':'المختبر والأشعة والنماذج', 'admin-reports':'التقارير والتدقيق',
  'admin-archive':'الأرشيف الطبي', 'admin-billing':'الفوترة والتأمين',
  'manage-reception':'حسابات الاستقبال', audit:'التقارير والتدقيق', settings:'المستشفى والإعدادات'
};

const adminPeriods = {daily:'يومي', weekly:'أسبوعي', monthly:'شهري'};
let adminPeriod = 'daily';
let adminPatientQuery = '';
let adminAgeFilter = '';
let adminClinicFilter = '';
const adminNumber = value => new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(value);
const adminToday = () => bookingDateKey(new Date());
const adminDate = value => value ? healthArchiveDateLabel(value) : '—';

function adminHeading(route, desc, actions='') {
  const title=adminTitles[route];
  return `<header class="admin-page-head"><nav aria-label="مسار الصفحة"><a href="#dashboard">الرئيسية</a> / <span>${title}</span></nav>
    <div><div><h1>${title}</h1><p>${desc}</p></div>${actions ? `<div class="admin-quick-links">${actions}</div>` : ''}</div></header>`;
}

function adminSection(title, body, action='') {
  return '<section class="workspace-panel admin-section"><div class="panel-title"><h2>' +
    title + '</h2>' + action + '</div><div class="admin-section-body">' + body + '</div></section>';
}

function adminTable(headers, rows, emptyMessage='لا توجد بيانات مسجلة.') {
  return '<div class="table-wrap"><table class="admin-data-table"><thead><tr>' +
    headers.map(header=>'<th scope="col">'+header+'</th>').join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('') :
      '<tr><td colspan="'+headers.length+'" class="quiet-empty">'+emptyMessage+'</td></tr>') + '</tbody></table></div>';
}

function adminSelect(label, name, options, value, attrs='') {
  return '<label class="field"><span>'+label+'</span><select class="input" name="'+name+'" '+attrs+'>'+
    options.map(([key,text])=>'<option value="'+esc(key)+'" '+(value===key?'selected':'')+'>'+esc(text)+'</option>').join('')+
    '</select></label>';
}

function adminBuckets(period, today = new Date()) {
  const end = bookingDateKey(today);
  const count = {daily:7,weekly:8,monthly:12}[period];
  const scheduled = db.appointments;
  const completed = db.visits.filter(v=>v.approved).map(v=>bookingDateFromVisit(v.date)).filter(Boolean);
  function boundary(offset) {
    const y=today.getFullYear(), m=today.getMonth(), d=today.getDate();
    if (period==='monthly') return new Date(y,m+offset,1);
    return new Date(y,m,d+offset*(period==='weekly'?7:1)-(period==='weekly'?6:0));
  }
  return Array.from({length:count},(_,index)=>{
    const offset=index-count+1;
    const start=bookingDateKey(boundary(offset));
    const stop=offset===0 ? end : bookingDateKey(new Date(boundary(offset+1).getTime()-1));
    const within=date=>date>=start && date<=stop;
    const label=boundary(offset).toLocaleDateString('ar-EG',period==='monthly'?{month:'short',year:'numeric'}:{day:'numeric',month:'short'});
    return {start,stop,label,bookings:scheduled.filter(a=>within(a.date)).length,
      visits:completed.filter(within).length};
  });
}

function adminDashboardTrend(rows) {
  const max=Math.max(1,...rows.flatMap(row=>[row.bookings,row.visits]));
  return `<div class="admin-chart-legend"><span>الحجوزات</span><span>الزيارات المعتمدة</span></div>
    <div class="admin-vertical-chart" role="list" aria-label="الحجوزات والزيارات حسب الفترة">${rows.map(row=>`
      <div role="listitem" aria-label="${esc(row.label)}: ${row.bookings} حجز، ${row.visits} زيارة معتمدة">
        <div class="admin-chart-bars" aria-hidden="true">${[row.bookings,row.visits].map((value,index)=>`
          <div class="${index?'visits':'bookings'} ${value?'':'zero'}" style="--value:${value/max*100}%"><span>${value}</span></div>`).join('')}</div>
        <span class="admin-chart-date">${esc(row.label)}</span>
      </div>`).join('')}</div>`;
}

const adminFacilities = () => db.facilities || [];
const adminStaff = () => db.staffDirectory || [];
const adminInventory = () => db.inventory || [];
const adminBeds = () => adminFacilities().filter(item=>item.type==='bed');

function adminOperationalData(date = adminToday()) {
  const todays = db.appointments.filter(a=>a.date===date);
  const arrivals = db.appointments.filter(a=>a.queueDate===date || (!a.queueDate && a.date===date && a.status==='تم تسجيل الوصول'));
  const patients = new Set(todays.filter(a=>a.status!=='ملغي').concat(arrivals).map(a=>a.patient));
  const waits = arrivals.map(a=>(Date.parse(a.calledAt)-Date.parse(a.arrivalAt))/60000).filter(m=>Number.isFinite(m)&&m>=0);
  const waiting = arrivals.filter(a=>a.status==='تم تسجيل الوصول' && (!a.queueState || a.queueState==='waiting'));
  const occupied = adminBeds().filter(b=>b.state==='occupied').length;
  const available = adminBeds().filter(b=>b.state==='available').length;
  return {todays,arrivals,patients:patients.size,waiting,occupied,available,
    average:waits.length?Math.round(waits.reduce((sum,value)=>sum+value,0)/waits.length):null};
}

function adminAlerts(emptyState = '<p class="quiet-empty">لا توجد تنبيهات تشغيلية مسجلة.</p>') {
  const {waiting,todays} = adminOperationalData();
  const late=waiting.filter(a=>Date.now()-Date.parse(a.arrivalAt)>=30*60000).length;
  const pending=db.appointments.filter(a=>a.status==='بانتظار التأكيد'&&canEditBooking(a)).length;
  const cancelled=todays.filter(a=>a.status==='ملغي').length;
  const low=adminInventory().filter(i=>i.quantity<=i.minimum).length;
  const expired=adminInventory().filter(i=>i.expiry && i.expiry<adminToday()).length;
  return [[late,'انتظار ٣٠ دقيقة أو أكثر','admin-bookings'],[pending,'حجز بانتظار التأكيد','admin-bookings'],
    [cancelled,'موعد أُلغي اليوم','admin-bookings'],[low,'صنف عند حد إعادة الطلب','admin-inventory'],
    [expired,'صنف انتهت صلاحيته','admin-inventory']].filter(([value])=>value)
    .map(([value,label,route])=>'<div class="activity-item">'+icon('bell')+
      '<div><a href="#'+route+'">'+adminNumber(value)+' · '+label+'</a></div></div>').join('') ||
    emptyState;
}

function adminDashboardPage() {
  const data=adminOperationalData();
  const doctors=Object.values(bookingDirectory());
  const doctorCount=doctors.filter(d=>d.active!==false).length;
  const occupancy=data.occupied+data.available ? adminNumber(100*data.occupied/(data.occupied+data.available))+'٪' : 'لا بيانات بعد';
  const wait=data.average===null?'لا بيانات بعد':adminNumber(data.average)+' د';
  const staff=doctors.length+adminStaff().length+receptionStaff().length;
  const today=new Date();
  const dateText=today.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const trend=adminBuckets(adminPeriod,today);
  return '<div class="admin-dashboard"><header class="admin-dashboard-head"><div><h1>لوحة الإدارة</h1><time datetime="'+
    bookingDateKey(today)+'">'+esc(dateText)+'</time></div>'+
    '<div class="admin-quick-links">'+link('عرض التقارير','admin-reports','secondary')+
    button(icon('plus')+' حجز جديد','book','primary')+'</div></header>'+
    '<div class="admin-overview-metrics">'+[
      ['حجوزات اليوم',adminNumber(data.todays.length),'calendar','amber','كل الحالات'],
      ['المرضى المسجلون',adminNumber(db.patients.length),'users','teal','إجمالي الملفات الطبية'],
      ['أطباء يقبلون الحجز',adminNumber(doctorCount),'doctor','teal','متاحون في دليل الحجز'],
      ['الموظفون المسجلون',adminNumber(staff),'users','teal','الأطباء والموظفون والاستقبال']
    ].map(args=>metric(...args)).join('')+'</div>'+
    '<div class="admin-dashboard-columns">'+adminSection('الحجوزات والزيارات',adminDashboardTrend(trend),
      '<div class="admin-tabs admin-chart-period" aria-label="فترة الرسم">'+Object.entries(adminPeriods).map(([key,label])=>
        `<button type="button" data-chart-period="${key}" aria-pressed="${adminPeriod===key}">${label}</button>`).join('')+'</div>')+
    '<div class="admin-dashboard-side">'+adminSection('تنبيهات التشغيل',adminAlerts(
      '<p class="admin-alert-clear">'+icon('check')+' لا توجد تنبيهات تشغيلية حاليًا.</p>'))+
    adminSection('إجراءات سريعة','<div class="admin-dashboard-links">'+
      button(icon('plus')+' تسجيل مريض جديد','new-patient','secondary')+
      link(icon('plus')+' إضافة طبيب','admin-doctor/new','secondary')+
      button(icon('plus')+' إضافة موظف','admin-add-employee','secondary')+
      link('إدارة جداول الحجز','admin-facilities/hours','secondary')+
    '</div>')+'</div></div>'+adminSection('جاهزية المستشفى',adminSummary([
      ['متوسط الانتظار',wait,'من تسجيل الوصول إلى النداء'],['إشغال الأسرّة',occupancy,'حسب حالة الأسرّة المسجلة']
    ]))+'</div>';
}

const adminFacilityTypes = {
  branch:{label:'فرع',parent:''},building:{label:'مبنى',parent:'branch'},
  floor:{label:'طابق',parent:'building'},department:{label:'قسم',parent:'floor'},
  clinic:{label:'عيادة',parent:'department'},room:{label:'غرفة',parent:'department'},bed:{label:'سرير',parent:'room'}
};
const adminBedStates={available:'متاح',occupied:'مشغول',reserved:'محجوز',maintenance:'صيانة'};

function adminFacilityPath(item, rows = adminFacilities()) {
  const path=[];
  for (let current=item; current && path.length<7; current=rows.find(row=>row.id===current.parentId)) path.unshift(current.name);
  return path.join(' / ');
}

function facilityBookingFields(id) {
  const rows=adminFacilities();
  const clinic=rows.find(item=>item.id===id && item.type==='clinic');
  if (!clinic) return {};
  const department=rows.find(item=>item.id===clinic.parentId);
  const floor=rows.find(item=>item.id===department?.parentId);
  const building=rows.find(item=>item.id===floor?.parentId);
  const branch=rows.find(item=>item.id===building?.parentId);
  return {clinic:clinic.name, location:[building?.name,floor?.name,department?.name].filter(Boolean).join(' · '), branch:branch?.name};
}

function adminFacilitySummary(type, parent) {
  const rows=adminFacilities();
  if (type==='bed') return badge(adminBedStates[parent.state] || 'متاح',parent.state==='occupied'?'amber':'teal');
  if (type!=='department') return '—';
  const roomIds=new Set(rows.filter(r=>r.type==='room' && r.parentId===parent.id).map(r=>r.id));
  const beds=rows.filter(r=>r.type==='bed' && roomIds.has(r.parentId));
  return 'أسرة مسجلة: '+adminNumber(beds.length)+' · متاح: '+adminNumber(beds.filter(r=>r.state==='available').length);
}

function adminFacilitiesPage() {
  const profile=hospitalProfile();
  return adminSection('بيانات المستشفى','<dl class="patient-facts admin-facility-facts"><div><dt>الاسم</dt><dd>'+esc(profile.name)+
      '</dd></div><div><dt>العنوان</dt><dd>'+esc(profile.address || '—')+'</dd></div><div><dt>التواصل</dt><dd><bdi>'+
      esc(profile.phone || '—')+'</bdi></dd></div></dl>',button('تعديل البيانات','edit-hospital','secondary small'))+
    adminSection('الهيكل','<div class="admin-quick-links">'+Object.entries(adminFacilityTypes).map(([type,{label}])=>
      badge(label+' · '+adminNumber(adminFacilities().filter(item=>item.type===type).length),'gray')).join('')+'</div>'+
      adminTable(['النوع','الموقع','السعة أو الحالة','الإجراء'],
      adminFacilities().map(item=>[adminFacilityTypes[item.type].label,esc(adminFacilityPath(item)),adminFacilitySummary(item.type,item),
        button('تعديل','admin-edit-facility','secondary small','data-id="'+esc(item.id)+'" aria-label="تعديل '+esc(item.name)+'"')]),
      'ابدأ بإضافة الفرع، ثم أضف المباني والطوابق والأقسام التابعة له.'),button(icon('plus')+' إضافة موقع أو سرير','admin-add-facility','primary'));
}

function adminEditFacility(id='') {
  if (!isHospitalAdmin()) return;
  const old=adminFacilities().find(r=>r.id===id);
  if (id && !old) return;
  modal(old?'تعديل الموقع':'إضافة موقع أو سرير','<form id="admin-facility-form" class="form-grid">'+
    adminSelect('النوع','type',Object.entries(adminFacilityTypes).map(([key,value])=>[key,value.label]),old?.type || 'branch',old?'disabled':'')+
    field('الاسم *','name',old?.name,'text','required maxlength="90"')+
    '<div id="admin-facility-parent" class="full"></div><div id="admin-facility-status" class="full"></div>'+
    adminFormFooter()+'</form>');
  const form=$('#admin-facility-form');
  const error=$('#admin-form-error');
  const type=()=>old?.type || form.elements.type.value;
  const parents=()=>adminFacilities().filter(r=>r.type===adminFacilityTypes[type()].parent);
  const refresh=()=>{
    const parentType=adminFacilityTypes[type()].parent;
    const options=parents().map(r=>[r.id,adminFacilityPath(r)]);
    $('#admin-facility-parent').innerHTML=parentType?adminSelect('يتبع','parentId',
      [['','اختر '+adminFacilityTypes[parentType].label],...options],old?.parentId,'required'):'';
    $('#admin-facility-status').innerHTML=type()==='bed'?adminSelect('حالة السرير','state',Object.entries(adminBedStates),old?.state||'available'):'';
    form.querySelector('[type=submit]').disabled=Boolean(parentType && !options.length);
    error.textContent=parentType && !options.length?'أضف '+adminFacilityTypes[parentType].label+' أولًا.':'';
  };
  refresh();
  form.elements.type.addEventListener('change',refresh);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const name=form.elements.name.value.trim();
    const parentId=form.elements.parentId?.value || '';
    const state=form.elements.state?.value || '';
    const rows=adminFacilities();
    if (!name || (adminFacilityTypes[type()].parent && !parents().some(r=>r.id===parentId)) ||
      (type()==='bed' && !Object.hasOwn(adminBedStates,state))) { error.textContent='راجع الاسم والموقع والحالة.';return; }
    if (old?.type==='bed' && (db.receptionStays||[]).some(stay=>stay.bed===id&&!stay.discharge) &&
      (state!=='occupied'||parentId!==old.parentId)) {
      error.textContent='السرير مرتبط بإقامة نشطة. استخدم التحويل أو الخروج الإداري من بوابة الاستقبال.';
      return;
    }
    if (rows.some(r=>r.id!==id && r.type===type() && r.parentId===parentId && r.name===name)) {
      error.textContent='الاسم مسجل بالفعل في الموقع ده.';return;
    }
    const entry={id:id||'H'+crypto.randomUUID(),type:type(),name,parentId,state};
    db.facilities=old?rows.map(r=>r.id===id?entry:r):[...rows,entry];
    log(old?'تعديل موقع في المستشفى':'إضافة موقع في المستشفى',entry.id);
    closeModal();render();toast('تم حفظ الموقع.');
  });
}

const adminStaffRoles=['تمريض','فني','محاسب','صيدلي','إداري','أخرى'];

function adminStaffPage() {
  const staff=adminStaff();
  return adminSection('دليل الموظفين',adminTable(['الموظف','الوظيفة','القسم','الحالة','الإجراء'],staff.map(p=>[
      esc(p.name),esc(p.job),esc(p.department),badge(p.active?'نشط':'موقوف',p.active?'teal':'gray'),
      button('تعديل','admin-edit-employee','secondary small','data-id="'+esc(p.id)+'"')])),
    button(icon('plus')+' إضافة موظف','admin-add-employee','primary'))+hospitalReceptionAdminPage();
}

function adminEditEmployee(id='') {
  if (!isHospitalAdmin()) return;
  const old=adminStaff().find(p=>p.id===id);
  if (id&&!old) return;
  modal(old?'تعديل موظف':'إضافة موظف','<form id="admin-employee-form" class="form-grid">'+
    field('اسم الموظف *','name',old?.name,'text','required maxlength="90"')+
    adminSelect('الوظيفة','job',adminStaffRoles.map(x=>[x,x]),old?.job||adminStaffRoles[0])+
    field('القسم *','department',old?.department,'text','required maxlength="90"')+
    '<label><input type="checkbox" name="active" '+(old?.active!==false?'checked':'')+'> موظف نشط</label>'+adminFormFooter()+'</form>');
  $('#admin-employee-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const values=new FormData(event.currentTarget);
    const name=values.get('name').trim(), department=values.get('department').trim(), job=values.get('job');
    if (!name||!department||!adminStaffRoles.includes(job)) { $('#admin-form-error').textContent='أكمل بيانات الموظف.';return; }
    const entry={id:id||'E'+crypto.randomUUID(),name,job,department,active:values.has('active')};
    db.staffDirectory=old?adminStaff().map(p=>p.id===id?entry:p):[...adminStaff(),entry];
    log(old?'تعديل بيانات موظف':'إضافة موظف إلى الدليل',entry.id);
    closeModal();render();toast('تم حفظ الموظف.');
  });
}

const adminInventoryKinds=['دواء','مستلزم طبي','جهاز'];

function adminInventoryPage(tab) {
  const active = ['suppliers','purchases'].includes(tab) ? tab : '';
  const items=adminInventory(), today=adminToday(), expiry=new Date();
  expiry.setDate(expiry.getDate()+30);
  return adminHeading('admin-inventory','الأصناف والموردون وطلبات الشراء.')+
    adminTabs('admin-inventory',[['','الأصناف'],['suppliers','الموردون'],['purchases','طلبات الشراء']],active)+
    (active ? adminLedgerTable(active) : adminSummary([
      ['الأصناف',items.length,'الأصناف المسجلة'],['تحت حد الطلب',items.filter(i=>i.quantity<=i.minimum).length,'عند حد إعادة الطلب أو أقل'],
      ['قاربت الصلاحية',items.filter(i=>i.expiry>=today && i.expiry<=bookingDateKey(expiry)).length,'خلال ٣٠ يومًا']
    ])+
    adminSection('الأصناف',adminTable(['الصنف','النوع','الكمية','حد إعادة الطلب','الصلاحية','المورد','الإجراء'],
      items.map(i=>[esc(i.name),esc(i.kind),adminNumber(i.quantity)+(i.quantity<=i.minimum?' '+badge('إعادة طلب','amber'):''),
        adminNumber(i.minimum),i.expiry && i.expiry<adminToday()?badge('منتهية','amber')+' '+esc(adminDate(i.expiry)):esc(adminDate(i.expiry)),
        esc(i.supplier||'—'),button('تعديل','admin-edit-stock','secondary small','data-id="'+esc(i.id)+'"')])),
    button(icon('plus')+' إضافة صنف','admin-add-stock','primary')));
}

function adminEditStock(id='') {
  if (!isHospitalAdmin()) return;
  const old=adminInventory().find(i=>i.id===id);
  if (id&&!old) return;
  modal(old?'تعديل صنف':'إضافة صنف','<form id="admin-stock-form" class="form-grid">'+
    field('اسم الصنف *','name',old?.name,'text','required maxlength="90"')+
    adminSelect('النوع','kind',adminInventoryKinds.map(x=>[x,x]),old?.kind||adminInventoryKinds[0])+
    field('الكمية *','quantity',old?.quantity??0,'number','required min="0" max="10000000" step="1"')+
    field('حد إعادة الطلب *','minimum',old?.minimum??0,'number','required min="0" max="10000000" step="1"')+
    field('تاريخ الصلاحية','expiry',old?.expiry,'date')+field('المورد','supplier',old?.supplier,'text','maxlength="90"')+
    adminFormFooter()+'</form>');
  $('#admin-stock-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!isHospitalAdmin()) return;
    const values=new FormData(event.currentTarget);
    const name=values.get('name').trim(),kind=values.get('kind'),quantity=Number(values.get('quantity')),minimum=Number(values.get('minimum'));
    if (!name||!adminInventoryKinds.includes(kind)||[quantity,minimum].some(n=>!Number.isSafeInteger(n)||n<0||n>10000000)) {
      $('#admin-form-error').textContent='راجع اسم الصنف والكميات.';return;
    }
    if (adminInventory().some(i=>i.id!==id&&i.name===name&&i.kind===kind)) {
      $('#admin-form-error').textContent='الصنف مسجل بالفعل. عدّل الرصيد من القائمة.';return;
    }
    const entry={id:id||'I'+crypto.randomUUID(),name,kind,quantity,minimum,expiry:values.get('expiry'),supplier:values.get('supplier').trim()};
    db.inventory=old?adminInventory().map(i=>i.id===id?entry:i):[...adminInventory(),entry];
    log(old?'تعديل رصيد المخزون':'إضافة صنف للمخزون',entry.id);
    closeModal();render();toast('تم حفظ الصنف.');
  });
}

const adminAgeBands = [[0,17],[18,39],[40,59],[60,120]];

function adminPatientsPage(tab) {
  const directory=bookingDirectory();
  const departments=[...new Set(Object.values(directory).map(d=>d.department))].sort((a,b)=>a.localeCompare(b,'ar'));
  const term=adminPatientQuery.trim().toLowerCase();
  const band=adminAgeBands.find(pair=>pair[0].toString()===adminAgeFilter);
  const phones=new Map();
  for (const p of db.patients) {
    const phone=receptionPhone(p.phone);
    if (phone) phones.set(phone,(phones.get(phone)||0)+1);
  }
  const visits=new Map();
  for (const visit of db.visits.filter(v=>v.approved)) {
    const prev=visits.get(visit.patient)||{count:0,date:''};
    const date=bookingDateFromVisit(visit.date);
    visits.set(visit.patient,{count:prev.count+1,date:date>prev.date?date:prev.date});
  }
  const candidates=db.patients.filter(p=>[p.name,p.id].some(v=>String(v).toLowerCase().includes(term)) &&
    (!band || Number.isFinite(p.age) && p.age>=band[0] && p.age<=band[1]) && (!adminClinicFilter || directory[p.doctor]?.department===adminClinicFilter));
  const today=db.patients.filter(p=>p.registeredDate===adminToday()).length;
  const heading=adminHeading('admin-patients','ملفات المرضى والشكاوى والتقييم.')+
    adminTabs('admin-patients',[['','الملفات · '+adminNumber(db.patients.length)],['feedback','الشكاوى والتقييم']],tab==='feedback'?'feedback':'');
  if (tab==='feedback') return heading+adminLedgerTable('feedback');
  return heading+
    adminSection('الملفات المسجلة · '+adminNumber(candidates.length),'<div class="admin-filters">'+
      field('البحث بالاسم أو رقم الملف','admin-patient-search',adminPatientQuery,'search','id="admin-patient-search"')+
      adminSelect('العمر','admin-patient-age',[['','كل الأعمار'],...adminAgeBands.map(([a,b])=>[String(a),adminNumber(a)+'–'+adminNumber(b)+' سنة'])],
        adminAgeFilter,'id="admin-patient-age"')+
      adminSelect('التخصص','admin-patient-specialty',[['','كل التخصصات'],...departments.map(d=>[d,d])],adminClinicFilter,'id="admin-patient-specialty"')+'</div>'+
      adminTable(['المريض','رقم الملف','العمر','الطبيب المتابع','الزيارات','آخر زيارة','الإجراء'],candidates.map(p=>{
        const history=visits.get(p.id);
        return ['<strong>'+esc(p.name)+'</strong>'+(phones.get(receptionPhone(p.phone))>1?' '+badge('هاتف مشترك','amber'):''),
          '<bdi>'+esc(p.id)+'</bdi>',esc(p.age??'—'),esc(p.doctor||'—'),adminNumber(history?.count||0),esc(adminDate(history?.date)),
          link('فتح الملف','admin-patient/'+encodeURIComponent(p.id),'secondary small')];
      }), 'لا توجد ملفات مطابقة.'),badge(adminNumber(today)+' ملف جديد اليوم','teal'));
}

function adminDiagnosticsPage(tab) {
  const section=(kind,fileKind,title)=>{
    const orders=db.orders.filter(o=>o.kind===kind || (!o.kind && (kind==='أشعة'?/أشعة|x-ray|ct/i:/تحليل|مختبر|معمل/i).test(o.type)));
    const files=db.attachments.filter(a=>a.kind===fileKind);
    const labels=new Map();
    for (const order of orders) labels.set(order.status || 'تم الطلب',(labels.get(order.status || 'تم الطلب')||0)+1);
    return adminSection(title,'<div class="admin-quick-links">'+badge(adminNumber(orders.length)+' طلب مسجل','teal')+
      badge(adminNumber(files.length)+' مرفق مسجل','gray')+'</div>'+
      adminTable(['حالة الطلب','العدد'],[...labels].map(([status,n])=>[esc(status),adminNumber(n)]),'لا توجد طلبات مسجلة.'));
  };
  return adminHeading('admin-diagnostics','الطلبات والمرفقات وحالة وحدات التحليل.')+
    adminTabs('admin-diagnostics',[['','الطلبات'],['models','مراقبة النماذج']],tab==='models'?'models':'')+
    (tab==='models' ? adminModelsPage() : '<div class="admin-overview-columns">'+section('مختبر','تحليل','المختبر')+section('أشعة','أشعة','الأشعة')+'</div>');
}

function adminModelsPage() {
  return adminSection('النماذج السبعة',adminTable(['الوحدة','المدخل','حالة الاتصال','تشغيل وإصدار'],models.map(m=>
      [esc(m.name),esc(m.inputTag),badge('غير متصل','gray'),'—'])))+
    adminSection('قياسات الأداء','<p>زمن الاستجابة، الإخفاقات ومراجعة المختصين تظهر بعد ربط سجل تشغيل النماذج. جودة النتائج وتغيّر البيانات يحتاجان تقييمًا مرجعيًا معتمدًا.</p>');
}

function adminClinicOperations() {
  const data=adminOperationalData();
  const clinics=new Map();
  for (const a of data.todays) {
    const name=receptionClinic(a);
    const clinic=clinics.get(name)||{total:0,waiting:0,done:0};
    clinic.total++;
    if (data.waiting.includes(a)) clinic.waiting++;
    if (a.status==='مكتمل') clinic.done++;
    clinics.set(name,clinic);
  }
  return adminSection('ضغط العيادات اليوم',adminTable(['العيادة','حجوزات اليوم','في الانتظار','مكتمل'],
    [...clinics].map(([name,c])=>[esc(name),adminNumber(c.total),adminNumber(c.waiting),adminNumber(c.done)]))+
    '<div class="admin-quick-links">'+badge(adminNumber(data.waiting.length)+' في الانتظار الآن','amber')+
    (data.average===null?'':badge(adminNumber(data.average)+' د متوسط الانتظار','teal'))+'</div>');
}

function bindAdminWorkspace() {
  bindAdminHub();
  bindAdminDoctorDirectory();
  $$('[data-chart-period]').forEach(el=>el.addEventListener('click',()=>{
    const period=el.dataset.chartPeriod;
    adminPeriod=period;render();$(`[data-chart-period="${period}"]`)?.focus();
  }));
  for (const [id,update] of [
    ['admin-patient-search',value=>{adminPatientQuery=value;}],
    ['admin-patient-age',value=>{adminAgeFilter=value;}],
    ['admin-patient-specialty',value=>{adminClinicFilter=value;}]
  ]) {
    const input=$('#'+id);
    if (!input) continue;
    input.addEventListener(input.type==='search'?'input':'change',event=>{
      const position=event.target.selectionStart;
      update(event.target.value);render();$('#'+id)?.focus();
      if (typeof position==='number') $('#'+id)?.setSelectionRange(position,position);
    });
  }
}
