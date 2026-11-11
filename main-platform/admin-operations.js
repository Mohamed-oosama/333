'use strict';

const adminTitles = {
  dashboard:'لوحة الإدارة', 'admin-facilities':'إدارة المستشفى', 'admin-staff':'إدارة الموظفين',
  'admin-patients':'إدارة المرضى', 'admin-bookings':'الحجوزات والتشغيل',
  'admin-inventory':'المخزون والصيدلية', 'admin-diagnostics':'المختبر والأشعة',
  'admin-models':'مراقبة النماذج', 'admin-reports':'التقارير والتحليلات',
  'manage-reception':'حسابات الاستقبال', audit:'سجل النشاط', settings:'إعدادات النظام'
};

const adminPeriods = {daily:'يومي', weekly:'أسبوعي', monthly:'شهري', yearly:'سنوي'};
let adminPeriod = 'daily';
let adminPatientQuery = '';
let adminAgeFilter = '';
let adminClinicFilter = '';
const adminNumber = value => new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(value);
const adminToday = () => bookingDateKey(new Date());
const adminDate = value => value ? healthArchiveDateLabel(value) : '—';

function adminHeading(route, desc, actions='') {
  return pageHead(adminTitles[route],desc,actions,'إدارة المستشفى');
}

function adminSection(title, body, action='') {
  return '<section class="workspace-panel admin-section"><div class="panel-title"><h2>' +
    title + '</h2>' + action + '</div><div class="admin-section-body">' + body + '</div></section>';
}

function adminTable(headers, rows, emptyMessage='لا توجد بيانات مسجلة.') {
  if (!rows.length) return '<p class="quiet-empty">' + emptyMessage + '</p>';
  return '<div class="table-wrap"><table class="admin-data-table"><thead><tr>' +
    headers.map(header=>'<th scope="col">'+header+'</th>').join('') + '</tr></thead><tbody>' +
    rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>';
}

function adminSelect(label, name, options, value, attrs='') {
  return '<label class="field"><span>'+label+'</span><select class="input" name="'+name+'" '+attrs+'>'+
    options.map(([key,text])=>'<option value="'+esc(key)+'" '+(value===key?'selected':'')+'>'+esc(text)+'</option>').join('')+
    '</select></label>';
}

function adminBuckets(period, today = new Date()) {
  const end = bookingDateKey(today);
  const count = {daily:7,weekly:8,monthly:12,yearly:5}[period];
  const scheduled = db.appointments;
  const completed = db.visits.filter(v=>v.approved).map(v=>bookingDateFromVisit(v.date)).filter(Boolean);
  const newPatients = db.patients.map(p=>p.registeredDate).filter(Boolean);
  function boundary(offset) {
    const y=today.getFullYear(), m=today.getMonth(), d=today.getDate();
    if (period==='yearly') return new Date(y+offset,0,1);
    if (period==='monthly') return new Date(y,m+offset,1);
    return new Date(y,m,d+offset*(period==='weekly'?7:1)-(period==='weekly'?6:0));
  }
  return Array.from({length:count},(_,index)=>{
    const offset=index-count+1;
    const start=bookingDateKey(boundary(offset));
    const stop=offset===0 ? end : bookingDateKey(new Date(boundary(offset+1).getTime()-1));
    const within=date=>date>=start && date<=stop;
    const label=boundary(offset).toLocaleDateString('ar-EG',period==='yearly'?{year:'numeric'}:
      period==='monthly'?{month:'short',year:'numeric'}:{day:'numeric',month:'short'});
    return {start,stop,label,bookings:scheduled.filter(a=>within(a.date)).length,
      visits:completed.filter(within).length,registered:newPatients.filter(within).length,
      cancelled:scheduled.filter(a=>within(a.date)&&a.status==='ملغي').length};
  });
}

function adminPeriodSelect() {
  return adminSelect('الفترة','admin-period',Object.entries(adminPeriods),adminPeriod,'id="admin-period"');
}

function adminTrend(rows) {
  const max=Math.max(1,...rows.flatMap(row=>[row.bookings,row.visits]));
  return '<div class="admin-chart-legend"><span>الحجوزات</span><span>الزيارات المعتمدة</span></div>'+
    '<div class="admin-chart">'+rows.map(row=>{
      const chartLine=(value,css,label)=>'<div class="admin-chart-line '+css+'"><span role="meter" aria-label="'+label+
        '" aria-valuenow="'+value+'" aria-valuemin="0" aria-valuemax="'+max+'"><i style="--bar-width:'+
        (value/max*100)+'%"></i></span><bdi>'+adminNumber(value)+'</bdi></div>';
      return '<div class="admin-chart-row"><span>'+esc(row.label)+'</span><div>'+
        chartLine(row.bookings,'bookings','الحجوزات')+chartLine(row.visits,'visits','الزيارات المعتمدة')+'</div></div>';
    }).join('')+'</div>';
}


function adminDashboardTrend(rows) {
  if (!rows.some(row=>row.bookings || row.visits)) {
    return '<p class="quiet-empty">لا توجد حجوزات أو زيارات معتمدة في هذه الفترة.</p>';
  }
  const max=Math.max(...rows.flatMap(row=>[row.bookings,row.visits]));
  const count=new Intl.NumberFormat('ar-EG-u-nu-latn');
  const cell=(value,series)=>`<td><div class="admin-trend-value ${series}"><bdi>${count.format(value)}</bdi>
    ${value ? `<span class="admin-trend-bar" aria-hidden="true"><span style="--bar-width:${value/max*100}%"></span></span>` : ''}
    </div></td>`;
  return `<table class="admin-trend-table" aria-label="الحجوزات والزيارات حسب الفترة">
    <thead><tr><th scope="col">التاريخ</th><th class="bookings" scope="col">الحجوزات</th>
    <th class="visits" scope="col">الزيارات المعتمدة</th></tr></thead>
    <tbody>${rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${cell(row.bookings,'bookings')}${cell(row.visits,'visits')}</tr>`).join('')}</tbody>
  </table>`;
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
  const approved=db.visits.filter(v=>v.approved).length;
  const occupancy=data.occupied+data.available ? adminNumber(100*data.occupied/(data.occupied+data.available))+'٪' : '—';
  const wait=data.average===null?'—':adminNumber(data.average)+' د';
  const staff=doctors.length+adminStaff().length+receptionStaff().length;
  const today=new Date();
  const dateText=today.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const trend=adminBuckets(adminPeriod,today);
  return '<div class="admin-dashboard"><header class="admin-dashboard-head"><div><h1>لوحة الإدارة</h1><time datetime="'+
    bookingDateKey(today)+'">'+esc(dateText)+'</time></div>'+
    link(icon('file')+' عرض التقارير','admin-reports','secondary')+'</header>'+
    '<div class="admin-overview-metrics">'+[
      ['المرضى المسجلون',adminNumber(db.patients.length),'users','teal','إجمالي الملفات'],
      ['مرضى اليوم',adminNumber(data.patients),'users','teal','حجوزات غير ملغاة ووصول مسجل'],
      ['الزيارات المعتمدة',adminNumber(approved),'check','emerald','إجمالي الزيارات'],
      ['حجوزات اليوم',adminNumber(data.todays.length),'calendar','sky','كل الحالات'],
      ['أطباء يقبلون الحجز',adminNumber(doctorCount),'doctor','teal','دليل الحجز'],
      ['الموظفون المسجلون',adminNumber(staff),'users','teal','الأطباء ودليل الموظفين والاستقبال'],
      ['إشغال الأسرة',occupancy,'grid','amber',data.occupied+data.available ? 'مشغولة '+adminNumber(data.occupied)+' · متاحة '+adminNumber(data.available) : 'أضف الأسرة من إدارة المستشفى'],
      ['متوسط الانتظار',wait,'clock','amber','من تسجيل الوصول إلى النداء']
    ].map(args=>metric(...args)).join('')+'</div>'+
    '<div class="admin-dashboard-columns">'+adminSection('الحجوزات والزيارات',adminDashboardTrend(trend),adminPeriodSelect())+
    '<div class="admin-dashboard-side">'+adminSection('تنبيهات التشغيل',adminAlerts(
      '<p class="admin-alert-clear">'+icon('check')+' لا توجد تنبيهات تشغيلية حاليًا.</p>'))+
    adminSection('روابط الإدارة','<div class="admin-dashboard-links">'+[
      ['grid','هيكل المستشفى','admin-facilities'],['doctor','إدارة الأطباء','manage-doctors'],
      ['calendar','الحجوزات والتشغيل','admin-bookings']
    ].map(([glyph,title,route])=>link(icon(glyph)+' <span>'+title+'</span> '+icon('chevron'),route,'secondary')).join('')+
    '</div>')+'</div></div></div>';
}

const adminFacilityTypes = {
  branch:{label:'فرع',parent:''},building:{label:'مبنى',parent:'branch'},
  floor:{label:'طابق',parent:'building'},department:{label:'قسم',parent:'floor'},
  clinic:{label:'عيادة',parent:'department'},room:{label:'غرفة',parent:'department'},bed:{label:'سرير',parent:'room'}
};
const adminBedStates={available:'متاح',occupied:'مشغول',maintenance:'صيانة'};

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
  return adminHeading('admin-facilities','الفروع والأقسام والعيادات والسعة المسجلة. حالة السرير تُحدَّث يدويًا.',
    button(icon('plus')+' إضافة موقع أو سرير','admin-add-facility','primary'))+
    adminSection('بيانات المستشفى','<dl class="patient-facts"><div><dt>الاسم</dt><dd>'+esc(profile.name)+
      '</dd></div><div><dt>العنوان</dt><dd>'+esc(profile.address || '—')+'</dd></div><div><dt>التواصل</dt><dd><bdi>'+
      esc(profile.phone || '—')+'</bdi></dd></div></dl>',button('تعديل البيانات','edit-hospital','secondary small'))+
    adminSection('هيكل المستشفى',adminTable(['النوع','الموقع','السعة أو الحالة','الإجراء'],
      adminFacilities().map(item=>[adminFacilityTypes[item.type].label,esc(adminFacilityPath(item)),adminFacilitySummary(item.type,item),
        button('تعديل','admin-edit-facility','secondary small','data-id="'+esc(item.id)+'" aria-label="تعديل '+esc(item.name)+'"')]),
      'ابدأ بإضافة الفرع، ثم أضف المباني والطوابق والأقسام التابعة له.'));
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
  return adminHeading('admin-staff','دليل الوظائف والأقسام. حسابات دخول الاستقبال تُدار من قسمها.',
    button(icon('plus')+' إضافة موظف','admin-add-employee','primary'))+
    adminSection('دليل الموظفين',adminTable(['الموظف','الوظيفة','القسم','الحالة','الإجراء'],staff.map(p=>[
      esc(p.name),esc(p.job),esc(p.department),badge(p.active?'نشط':'موقوف',p.active?'teal':'gray'),
      button('تعديل','admin-edit-employee','secondary small','data-id="'+esc(p.id)+'"')])))+
    adminSection('الأطباء والاستقبال','<div class="admin-quick-links">'+link('إدارة الأطباء','manage-doctors','secondary')+
      link('حسابات الاستقبال','manage-reception','secondary')+'</div>');
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

function adminInventoryPage() {
  return adminHeading('admin-inventory','الأرصدة المسجلة وحدود إعادة الطلب والصلاحية.',
    button(icon('plus')+' إضافة صنف','admin-add-stock','primary'))+
    adminSection('الأصناف',adminTable(['الصنف','النوع','الكمية','حد إعادة الطلب','الصلاحية','المورد','الإجراء'],
      adminInventory().map(i=>[esc(i.name),esc(i.kind),adminNumber(i.quantity)+(i.quantity<=i.minimum?' '+badge('إعادة طلب','amber'):''),
        adminNumber(i.minimum),i.expiry && i.expiry<adminToday()?badge('منتهية','amber')+' '+esc(adminDate(i.expiry)):esc(adminDate(i.expiry)),
        esc(i.supplier||'—'),button('تعديل','admin-edit-stock','secondary small','data-id="'+esc(i.id)+'"')])));
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

function adminPatientsPage() {
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
  return adminHeading('admin-patients','البيانات الإدارية وعدد الزيارات. مشاركة رقم هاتف قد تعني أكثر من فرد في الأسرة.')+
    adminSection('الملفات المسجلة · '+adminNumber(candidates.length),'<div class="admin-filters">'+
      field('البحث بالاسم أو رقم الملف','admin-patient-search',adminPatientQuery,'search','id="admin-patient-search"')+
      adminSelect('العمر','admin-patient-age',[['','كل الأعمار'],...adminAgeBands.map(([a,b])=>[String(a),adminNumber(a)+'–'+adminNumber(b)+' سنة'])],
        adminAgeFilter,'id="admin-patient-age"')+
      adminSelect('التخصص','admin-patient-specialty',[['','كل التخصصات'],...departments.map(d=>[d,d])],adminClinicFilter,'id="admin-patient-specialty"')+'</div>'+
      adminTable(['المريض','الرقم الطبي','العمر','الطبيب المتابع','آخر زيارة','زيارات معتمدة','مراجعة الملف'],candidates.map(p=>{
        const history=visits.get(p.id);
        return [esc(p.name),'<bdi>'+esc(p.id)+'</bdi>',esc(p.age??'—'),esc(p.doctor||'—'),esc(adminDate(history?.date)),
          adminNumber(history?.count||0),phones.get(receptionPhone(p.phone))>1?badge('هاتف مشترك','amber'):'—'];
      }), 'لا توجد ملفات مطابقة.'),badge(adminNumber(today)+' ملف جديد اليوم','teal'));
}

function adminDiagnosticsPage() {
  const section=(kind,fileKind,title)=>{
    const orders=db.orders.filter(o=>o.kind===kind || (!o.kind && (kind==='أشعة'?/أشعة|x-ray|ct/i:/تحليل|مختبر|معمل/i).test(o.type)));
    const files=db.attachments.filter(a=>a.kind===fileKind);
    const labels=new Map();
    for (const order of orders) labels.set(order.status || 'تم الطلب',(labels.get(order.status || 'تم الطلب')||0)+1);
    return adminSection(title,'<div class="admin-quick-links">'+badge(adminNumber(orders.length)+' طلب مسجل','teal')+
      badge(adminNumber(files.length)+' مرفق مسجل','gray')+'</div>'+
      adminTable(['حالة الطلب','العدد'],[...labels].map(([status,n])=>[esc(status),adminNumber(n)]),'لا توجد طلبات مسجلة.'));
  };
  return adminHeading('admin-diagnostics','متابعة أعداد الطلبات والمرفقات حسب القسم.')+
    '<div class="admin-overview-columns">'+section('مختبر','تحليل','المختبر')+section('أشعة','أشعة','الأشعة')+'</div>';
}

function adminModelsPage() {
  return adminHeading('admin-models','حالة وحدات التحليل السبعة في مشروع MNU 333.')+
    adminSection('النماذج',adminTable(['الوحدة','المدخل','حالة الاتصال','تشغيل وإصدار'],models.map(m=>
      [esc(m.name),esc(m.inputTag),badge('غير متصل','gray'),'—'])))+
    adminSection('قياسات الأداء','<p>زمن الاستجابة، الإخفاقات ومراجعة المختصين تظهر بعد ربط سجل تشغيل النماذج. جودة النتائج وتغيّر البيانات يحتاجان تقييمًا مرجعيًا معتمدًا.</p>');
}

function adminReportsPage() {
  const rows=adminBuckets(adminPeriod);
  return adminHeading('admin-reports','تقارير مجمعة من الحجوزات والزيارات وملفات التسجيل.',
    button('تنزيل CSV لـ Excel','admin-export-csv','secondary')+button('طباعة / حفظ PDF','admin-print-report','primary'))+
    '<div class="admin-printable">'+adminSection('تقرير النشاط · '+adminPeriods[adminPeriod],adminTrend(rows),adminPeriodSelect())+
    adminSection('جدول النشاط',adminTable(['من','إلى','حجوزات','زيارات معتمدة','ملفات جديدة','ملغى'],
      rows.map(r=>[r.start,r.stop,adminNumber(r.bookings),adminNumber(r.visits),adminNumber(r.registered),adminNumber(r.cancelled)])))+'</div>';
}

function exportAdminReport() {
  if (!isHospitalAdmin()) return;
  const rows=adminBuckets(adminPeriod);
  const csv=['من,إلى,الحجوزات,الزيارات المعتمدة,الملفات الجديدة,الحجوزات الملغاة',
    ...rows.map(r=>[r.start,r.stop,r.bookings,r.visits,r.registered,r.cancelled].join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download='mnu333-operations-'+adminPeriod+'.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  log('تصدير تقرير تشغيل مجمع',adminPeriod);
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
  $('#admin-period')?.addEventListener('change',event=>{
    const period=event.target.value;
    if (!Object.hasOwn(adminPeriods,period)) return;
    adminPeriod=period;render();$('#admin-period')?.focus();
  });
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
