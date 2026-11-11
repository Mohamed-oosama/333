'use strict';

/**
 * MNU 333 — Modern Clinical Care Workspace & 7-Model AI Diagnostic System
 * Reimagined with Modern UI/UX Stack, Bento Layouts, and Medical Micro-interactions.
 */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Official Tabler outline icons, vendored locally (MIT, v3.50.0).
const icons = {
  grid:'layout-grid', users:'users', calendar:'calendar', pulse:'activity',
  brain:'brain', file:'file-text', clock:'clock', shield:'shield-check',
  settings:'settings', search:'search', arrow:'arrow-left', arrowRight:'arrow-right',
  plus:'plus', bell:'bell', chevron:'chevron-left', check:'check', close:'x',
  info:'info-circle', lung:'lungs', scan:'scan', microscope:'microscope',
  flask:'flask', sound:'waveform', upload:'upload', menu:'menu-2', eye:'eye',
  sparkler:'sparkles', lock:'lock', database:'database', logout:'logout',
  heart:'heart', doctor:'stethoscope', mail:'mail', phone:'phone', user:'user',
  external:'arrow-up-right'
};
const icon = (name, cls='') => '<span class="icon '+cls+'" style="--icon:url(./assets/icons/'+(icons[name] || 'file-text')+'.svg)" aria-hidden="true"></span>';
const badge = (text, type='gray') => `<span class="badge ${type}">${esc(text)}</span>`;
const button = (label, action, cls='secondary', extra='') => `<button type="button" class="button ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const link = (label, route, cls='ghost') => `<a class="button ${cls}" href="#${route}">${label}</a>`;

// The 7 Specialized Diagnostic Models
const models = [
  {
    id: 'xray',
    num: '01',
    name: 'أشعة الصدر',
    en: 'Chest X-ray Screening',
    icon: 'lung',
    inputTag: 'DICOM / PNG',
    outputTag: 'Suspicious Lesion / Grad-CAM',
    desc: 'فرز أولي ذكي لرصد احتمالية وجود عُقدة (Nodule) أو كتلة (Mass) في الرئة قبل الفحوصات المتقدمة.',
    input: 'صورة أشعة صدر أمامية بدقة عالية متوافقة مع معيار DICOM.',
    output: 'شبهة آفة (suspicious_lesion) مع خريطة التفسير البصري Grad-CAM++.',
    detail: 'أداة فرز وتحذير مبكر لدعم الطبيب؛ لا تمثل تشخيصاً نهائياً لسرطان الرئة.',
    types: '.dcm,.png,.jpg'
  },
  {
    id: 'ct',
    num: '02',
    name: 'الأشعة المقطعية',
    en: 'CT Nodule Malignancy',
    icon: 'scan',
    inputTag: '3D DICOM Series',
    outputTag: 'Malignancy Risk & Uncertainty',
    desc: 'تقييم دقيق لاحتمالية خبث العقد الرئوية المحددة سريرياً مع دعم الشرائح المحورية المتعددة.',
    input: 'سلسلة مقاطع أشعة مقطعية DICOM ثلاثية الأبعاد وإحداثيات موضع العقدة.',
    output: 'احتمال الخبث (Malignancy Probability) ونطاق عدم اليقين (Uncertainty).',
    detail: 'يتطلب تحديد العقدة من قِبل استشاري الأشعة؛ النموذج يحلل المنطقة المحددة فقط.',
    types: '.dcm,.zip'
  },
  {
    id: 'histo',
    num: '03',
    name: 'الأنسجة والباثولوجي',
    en: 'Histopathology AI',
    icon: 'microscope',
    inputTag: 'Whole Slide Image (SVS)',
    outputTag: 'LUAD vs LUSC Subtyping',
    desc: 'تصنيف دقيق للخزعات النسيجية لتحديد النوع الفرعي لسرطان الرئة الغدي أو الحرشفي.',
    input: 'شريحة رقمية فائقة الدقة (Whole Slide Image) بصبغة H&E.',
    output: 'التصنيف النسيجي LUAD أو LUSC، مع فئة Normal إذا كانت مدعومة في النموذج المدرب.',
    detail: 'يدعم التمييز النسيجي الدقيق ويسرع قرار اختصاصي الباثولوجي.',
    types: '.svs,.tif,.h5'
  },
  {
    id: 'nlp',
    num: '04',
    name: 'استخراج بيانات التقارير',
    en: 'Clinical NLP & Structuring',
    icon: 'file',
    inputTag: 'EHR / Free Text Report',
    outputTag: 'TNM Staging & Biomarkers',
    desc: 'معالجة لغوية متقدمة لتحويل التقارير السريرية غير المنظمة إلى بيانات مهيكلة وموثقة المصدر.',
    input: 'نصوص تقارير الأشعة والباثولوجي الخام؛ اللغات المدعومة تُحدد عند ربط الخدمة.',
    output: 'استخراج أبعاد الورم، ومرحلة TNM، والطفرات الجينية (EGFR, ALK).',
    detail: 'كل حقل مستخرج يرتبط بنصه الأصلي مع إبراز موضع الدليل لضمان دقة المراجعة.',
    types: '.txt,.pdf'
  },
  {
    id: 'lab',
    num: '05',
    name: 'المعمل والدلالات الحيوية',
    en: 'Lab Risk & Biomarkers',
    icon: 'flask',
    inputTag: 'Serum Panels & Markers',
    outputTag: 'TreeSHAP Variable Impact',
    desc: 'تحليل تكاملي للفحوصات الروتينية ودلالات الأورام (CEA, CYFRA 21-1) لحساب مؤشرات الخطر.',
    input: 'قيم التحاليل الرقمية ووحداتها ونطاقاتها المرجعية المعتمدة.',
    output: 'مؤشر خطورة مجمّع مع رسم بياني لتأثير كل متغير (SHAP Values).',
    detail: 'الفحوصات الناقصة تُعامل كقيم مفقودة لا كقيم سليمة منعاً للتضليل.',
    types: '.csv,.json'
  },
  {
    id: 'sounds',
    num: '06',
    name: 'أصوات التنفس',
    en: 'Respiratory Auscultation AI',
    icon: 'sound',
    inputTag: 'Acoustic Audio (WAV)',
    outputTag: 'Normal / Crackle / Wheeze / Both',
    desc: 'تحليل صوتي رقمي لتحديد الأنماط الشاذة في دورات التنفس كالخشخشة والأزيز.',
    input: 'تسجيل صوت تنفس نقي من السماعة الرقمية بصيغة WAV غير المضغوطة.',
    output: 'تصنيف دورات التنفس وحساب نسبة الأنماط غير الطبيعية مع الطيف الترددي.',
    detail: 'مؤشر مساند للتقييم السريري العام للأمراض الصدرية المصاحبة.',
    types: '.wav'
  },
  {
    id: 'superior',
    num: '07',
    name: 'وحدة التقرير الموحد',
    en: 'Superior Multi-Modal Synthesis',
    icon: 'brain',
    inputTag: 'Synthesized Multi-Reports',
    outputTag: 'Structured Clinical Brief',
    desc: 'محرك الربط الذكي: يقرأ مخرجات النماذج الستة، يحلل التعارضات، ويجهز مسودة تقرير الطبيب.',
    input: 'تقارير الموديلات المتاحة لنفس المريض والزيارة، مع توضيح الفحوصات الناقصة.',
    output: 'تقرير سريري تجميعي يبرز التوافقات ونقاط الشك وخطة المتابعة المقترحة.',
    detail: 'قائم على نظام خبير وقواعد موثقة؛ لا يدمج الاحتمالات بنسبة عشوائية. قرار الإتاحة للطبيب أولاً.',
    types: ''
  }
];

// Initial Synthetic Dataset for Clinical Demo
const initial = {
  patients: [
    { id: 'CL-1024', name: 'أحمد محمود علي', age: 58, gender: 'ذكر', phone: '01000001024', visit: 'متابعة عقدة رئوية', status: 'بانتظار الطبيب', priority: 'عادية', time: '09:30', doctor: 'د. سارة أحمد', allergy: 'حساسية مسجلة: البنسلين' },
    { id: 'CL-1025', name: 'منى إبراهيم حسن', age: 46, gender: 'أنثى', phone: '01000001025', visit: 'استشارة أعراض تنفسية', status: 'بانتظار الفرز', priority: 'أولوية مراجعة', time: '09:45', doctor: 'د. عمر خالد', allergy: 'لم تُسجّل بيانات الحساسية' },
    { id: 'CL-1026', name: 'حسن محمد سالم', age: 64, gender: 'ذكر', phone: '01000001026', visit: 'تقييم خزعة نسيجية', status: 'قيد الزيارة', priority: 'أولوية مراجعة', time: '10:00', doctor: 'د. سارة أحمد', allergy: 'لم تُسجّل بيانات الحساسية' },
    { id: 'CL-1027', name: 'فاطمة سعيد أحمد', age: 52, gender: 'أنثى', phone: '01000001027', visit: 'مراجعة أشعة مقطعية', status: 'بانتظار الطبيب', priority: 'عادية', time: '10:15', doctor: 'د. سارة أحمد', allergy: 'لم تُسجّل بيانات الحساسية' },
    { id: 'CL-1028', name: 'يوسف عادل حسن', age: 39, gender: 'ذكر', phone: '01000001028', visit: 'فحص دوري', status: 'لم يصل', priority: 'لم يُراجع', time: '10:30', doctor: 'د. عمر خالد', allergy: 'لم تُسجّل بيانات الحساسية' },
    { id: 'CL-1029', name: 'نادية مصطفى علي', age: 61, gender: 'أنثى', phone: '01000001029', visit: 'متابعة ما بعد العلاج', status: 'مكتملة', priority: 'عادية', time: '11:00', doctor: 'د. سارة أحمد', allergy: 'لم تُسجّل بيانات الحساسية' }
  ],
  appointments: [
    { id: 'A1', patient: 'CL-1024', doctor: 'د. سارة أحمد', date: '2026-11-11', time: '09:00', status: 'مؤكد', type: 'متابعة' },
    { id: 'A2', patient: 'CL-1027', doctor: 'د. عمر خالد', date: '2026-11-12', time: '10:30', status: 'مؤكد', type: 'مراجعة نتائج' }
  ],
  visits: [],
  audit: [],
  vitals: {
    'CL-1024': { pulse: '76', pressure: '124/82', temp: '36.8', spo2: '97' },
    'CL-1025': { pulse: '92', pressure: '138/88', temp: '37.4', spo2: '93' }
  },
  orders: [],
  attachments: [],
  sharedReports: [],
  hospitalProfile: {},
  doctorDirectory: []
};

const LOCAL_DATABASE_KEY = 'clarimed-demo-v1';

function readLocalDatabase() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_DATABASE_KEY));
    if (saved && Array.isArray(saved.patients)) return {...structuredClone(initial),...saved};
  } catch { /* Continue with the in-memory preview. */ }
  return null;
}

let db = readLocalDatabase() || structuredClone(initial);

// Navigation & Roles
let role = 'doctor';
let activeTab = 'overview';
let query = '';
let patientFilter = '';
let selected = 'CL-1024';
let modalFocus = null;
let draft = {};
let activeModel = 'xray';

const roles = {
  doctor: 'الطبيب المعالج',
  radiologist: 'طبيب الأشعة',
  reception: 'الاستقبال والفرز',
  patient: 'بوابة المريض',
  admin: 'الإدارة والرقابة'
};

const navs = [
  ['dashboard', 'grid', 'لوحة المؤشرات'],
  ['consultations', 'doctor', 'الكشف'],
  ['patients', 'users', 'سجل المرضى'],
  ['appointments', 'calendar', 'جدول المواعيد'],
  ['reception-checkin', 'user', 'تسجيل الوصول'],
  ['queue', 'pulse', 'قائمة الانتظار'],
  ['reception-schedule', 'calendar', 'جداول العيادات'],
  ['reception-reports', 'file', 'تقارير الاستقبال'],
  ['ai', 'brain', 'مركز النماذج السبعة'],
  ['documents', 'file', 'الطلبات والفحوصات'],
  ['doctor-reports', 'file', 'تقارير الزيارات'],
  ['admin-facilities', 'grid', 'إدارة المستشفى'],
  ['manage-doctors', 'doctor', 'إدارة الأطباء'],
  ['admin-staff', 'users', 'إدارة الموظفين'],
  ['admin-patients', 'user', 'إدارة المرضى'],
  ['admin-bookings', 'calendar', 'الحجوزات والتشغيل'],
  ['admin-inventory', 'file', 'المخزون والصيدلية'],
  ['admin-diagnostics', 'flask', 'المختبر والأشعة'],
  ['admin-models', 'brain', 'مراقبة النماذج'],
  ['admin-reports', 'file', 'التقارير والتحليلات'],
  ['manage-reception', 'users', 'إدارة الاستقبال'],
  ['audit', 'shield', 'سجل النشاط والأمان'],
  ['settings', 'settings', 'الإعدادات والمكدس']
];

const allowed = {
  doctor: ['dashboard', 'consultations', 'patients', 'record', 'encounter', 'appointments', 'ai', 'model', 'documents', 'doctor-reports', 'settings'],
  radiologist: ['documents'],
  reception: ['dashboard', 'patients', 'appointments', 'reception-checkin', 'queue', 'reception-schedule', 'reception-reports', 'settings'],
  patient: ['portal', 'appointments', 'patient-doctors', 'patient-reports', 'patient-attachments', 'patient-profile'],
  admin: ['dashboard', 'admin-facilities', 'manage-doctors', 'admin-staff', 'admin-patients', 'admin-bookings',
    'admin-inventory', 'admin-diagnostics', 'admin-models', 'admin-reports', 'manage-reception', 'audit', 'settings']
};

const patient = () => role === 'doctor' ? doctorPatients().find(p => p.id === selected) || doctorPatients()[0] :
  db.patients.find(p => p.id === selected) || db.patients[0];

const save = () => {
  try {
    localStorage.setItem(LOCAL_DATABASE_KEY, JSON.stringify(db));
  } catch {
    toast('تعذّر الحفظ التلقائي في المتصفح.');
  }
};

function log(action, resource) {
  db.audit.unshift({
    action,
    resource,
    role: roles[role],
    ...(role === 'doctor' ? {actor:demoDoctor,recordedAt:new Date().toISOString()} : {}),
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date().toLocaleDateString('ar-EG')
  });
  save();
}

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}

// Layout Components
const pageHead = (title, sub='', actions='', eyebrow='MNU 333 HEALTHCARE · CLINICAL WORKSPACE') => `
  <div class="page-head">
    <div>
      <div class="eyebrow-tag">${icon('sparkler')} ${eyebrow}</div>
      <h1>${title}</h1>
      <p class="subtitle">${sub}</p>
    </div>
    <div class="page-actions">${actions}</div>
  </div>`;

const empty = (title, desc, act='') => `
  <div style="text-align: center; padding: 40px 20px; color: var(--muted);">
    <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--line-light); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; color: var(--primary);">
      ${icon('file')}
    </div>
    <h3 style="margin-bottom: 6px; font-size: 15px;">${title}</h3>
    <p style="font-size: 12.5px; max-width: 360px; margin: 0 auto 16px;">${desc}</p>
    ${act}
  </div>`;

const field = (label, name, value='', type='text', extra='') => `
  <label class="field">
    <span>${label}</span>
    <input class="input" name="${name}" type="${type}" value="${esc(value)}" ${extra}>
  </label>`;

const patientCell = p => `
  <div class="patient-cell">
    <div class="patient-avatar-box">${p.name.split(' ').slice(0, 2).map(x => x[0]).join('')}</div>
    <div>
      <div class="patient-name-title">${esc(p.name)}</div>
      <div class="patient-id-sub">${esc(p.id)}</div>
    </div>
  </div>`;

// Patients Table Component
function tablePatients(list, compact = false) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>بيانات المريض</th>
            <th>موعد الحضور</th>
            ${!compact ? '<th>نوع الزيارة</th>' : ''}
            <th>العلامات الحيوية</th>
            <th>الحالة السريرية</th>
            <th>الإجراء المباشر</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(p => {
            const v = db.vitals[p.id];
            return `
              <tr>
                <td>${patientCell(p)}</td>
                <td>
                  <span class="font-en" style="font-weight: 600;">${p.time}</span>
                  <div style="font-size: 11px; color: var(--muted);">${esc(p.doctor)}</div>
                </td>
                ${!compact ? `<td><span class="badge gray">${p.visit}</span></td>` : ''}
                <td>
                  ${v ? `
                    <div class="vitals-pill-group">
                      <span class="vital-pill ${+v.spo2 < 95 ? 'alert' : ''}" title="تشبع الأكسجين">SpO2: ${v.spo2}%</span>
                      <span class="vital-pill" title="النبض">HR: ${v.pulse}</span>
                    </div>` : '<span style="color: var(--muted-light); font-size: 11px;">لم تُسجّل</span>'}
                </td>
                <td>
                  ${badge(p.status, p.status === 'قيد الزيارة' ? 'sky' : p.status === 'مكتملة' ? 'emerald' : p.status === 'بانتظار الفرز' ? 'amber' : 'gray')}
                </td>
                <td>
                  ${role === 'reception'
                    ? button(p.status === 'لم يصل' ? 'تسجيل وصول' : 'تحديث الفرز', 'checkin', 'secondary small', `data-id="${p.id}"`)
                    : link('فتح الملف ' + icon('arrow'), 'record/' + p.id, 'ghost small')}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${!list.length ? empty('لا توجد نتائج مطابقة', 'تحقق من صحة الاسم أو رقم الملف.') : ''}
    </div>`;
}

// Patients Registry View
function patients() {
  return patientRegistry();
}

// Patient Banner Header
function patientBanner(p) {
  return `
    <section class="patient-banner">
      <div class="patient-banner-avatar">
        ${p.name.split(' ').slice(0, 2).map(x => x[0]).join('')}
      </div>
      <div class="patient-banner-info">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <h2>${esc(p.name)}</h2>
          ${badge(p.status, p.status === 'قيد الزيارة' ? 'sky' : p.status === 'مكتملة' ? 'emerald' : 'amber')}
        </div>
        <div class="patient-banner-meta">
          <span>العمر: <bdi class="font-en">${p.age}</bdi> سنة</span>
          <span>الجنس: ${p.gender}</span>
          <span>رقم الملف: <bdi class="font-en">${p.id}</bdi></span>
          <span>الطبيب المتابع: ${esc(p.doctor)}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-inline-start: auto;">
        <span class="allergy-tag">
          ${icon('info')}
          ${esc(p.allergy)}
        </span>
      </div>
    </section>`;
}

// Patient Medical Record View
function record() {
  const p = patient();
  const tabs = [
    ['overview', 'الملخص السريري'],
    ['timeline', 'رحلة الزيارات السابقة'],
    ['results', 'الطلبات والفحوصات'],
    ['ai', 'النماذج السبعة للمريض']
  ];

  return `
    ${pageHead(
      'الملف الطبي الموحد',
      `استعراض البيانات السريرية للمريض: ${esc(p.name)} (${p.id})`,
      link(icon('plus') + ' بدء زيارة سريرية', 'encounter/' + p.id, 'primary')
    )}

    ${patientBanner(p)}

    <div class="tabs" role="tablist">
      ${tabs.map(([k, t]) => `
        <button class="tab ${activeTab === k ? 'active' : ''}" data-action="record-tab" data-tab="${k}">
          ${t}
        </button>`).join('')}
    </div>

    ${activeTab === 'ai' ? modelCards() :
      activeTab === 'results' ? ordersForPatient() :
      activeTab === 'timeline' ? timeline(p) :
      `
      <div class="dashboard-grid">
        <div>
          <section class="card">
            <div class="card-header">
              <h2>المؤشرات السريرية الحالية</h2>
              ${badge('الزيارة الحالية', 'teal')}
            </div>
            <div class="card-body">
              <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
                <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px;">
                  <span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">سبب الاستشارة</span>
                  <strong style="font-size: 13px;">${esc(p.visit)}</strong>
                </div>
                <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px;">
                  <span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">العيادة المشرفة</span>
                  <strong style="font-size: 13px;">عيادة الصدرية والأورام</strong>
                </div>
                <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px;">
                  <span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">التقرير الموحد (Superior)</span>
                  <strong style="font-size: 13px; color: var(--primary);">بانتظار التحاليل</strong>
                </div>
              </div>
            </div>
          </section>

          ${timeline(p)}
        </div>

        <aside>
          <!-- Vital Signs Widget -->
          <section class="card">
            <div class="card-header">
              <h2>العلامات الحيوية</h2>
              ${button('تسجيل قراءات', 'vitals', 'ghost small')}
            </div>
            <div class="card-body">
              ${db.vitals[p.id] ? `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  ${[
                    ['النبض (Pulse)', db.vitals[p.id].pulse, 'bpm', +db.vitals[p.id].pulse > 100 || +db.vitals[p.id].pulse < 60],
                    ['ضغط الدم (BP)', db.vitals[p.id].pressure, 'mmHg', false],
                    ['الحرارة (Temp)', db.vitals[p.id].temp, '°C', +db.vitals[p.id].temp > 37.8],
                    ['تشبع الأكسجين (SpO2)', db.vitals[p.id].spo2, '%', +db.vitals[p.id].spo2 < 95]
                  ].map(([label, val, unit, isAlert]) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--line-light);">
                      <span style="font-size: 12px; color: var(--muted);">${label}</span>
                      <span class="font-en" style="font-weight: 700; font-size: 13px; color: ${isAlert ? 'var(--rose)' : 'var(--ink)'};">
                        ${val} ${unit}
                      </span>
                    </div>`).join('')}
                </div>` : empty('لم تُسجل علامات حيوية', 'قم بتسجيل قراءات المريض.')}
            </div>
          </section>

          <!-- Follow-up Appointments Widget -->
          <section class="card">
            <div class="card-header">
              <h2>المواعيد القادمة</h2>
            </div>
            <div class="card-body">
              ${db.appointments.filter(a => a.patient === p.id && a.status !== 'ملغي').map(a => `
                <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 13px;" class="font-en">${a.date}</strong>
                    ${badge(a.time, 'teal')}
                  </div>
                  <div style="font-size: 11px; color: var(--muted);">${a.doctor} · ${a.type}</div>
                </div>`).join('') || '<p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">لا يوجد موعد محجوز.</p>'}
              ${button(icon('calendar') + ' حجز موعد متابعة', 'book', 'secondary full')}
            </div>
          </section>
        </aside>
      </div>`}`;
}

// Patient Timeline
function timeline(p) {
  const visits = db.visits.filter(v => v.patient === p.id);
  return `
    <section class="card">
      <div class="card-header">
        <h2>التسلسل الزمني للزيارات</h2>
        <span class="badge gray">الأحدث أولاً</span>
      </div>
      <div class="card-body">
        <div style="position: relative; padding-inline-start: 24px; border-inline-start: 2px solid var(--line); display: flex; flex-direction: column; gap: 20px;">
          ${visits.map(v => `
            <div style="position: relative;">
              <span style="position: absolute; inset-inline-start: -31px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: ${v.approved ? 'var(--emerald)' : 'var(--amber)'}; border: 2px solid #fff;"></span>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: 13.5px;">زيارة تقييم سريري</strong>
                ${badge(v.approved ? 'معتمدة' : 'مسودة', v.approved ? 'emerald' : 'amber')}
              </div>
              <small style="color: var(--muted); font-family: var(--font-en);">${esc(v.date)}</small>
              <p style="margin: 6px 0; font-size: 12.5px;"><strong>سبب الزيارة:</strong> ${esc(v.reason || '—')}</p>
              <div style="background: var(--canvas); border-radius: var(--radius-xs); padding: 8px 12px; font-size: 12px; color: var(--ink-secondary);">
                <strong>الخطة المعتمدة:</strong> ${esc(v.plan || 'قيد الاستكمال')}
              </div>
            </div>`).join('')}

          <div style="position: relative;">
            <span style="position: absolute; inset-inline-start: -31px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); border: 2px solid #fff;"></span>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="font-size: 13.5px;">زيارة اليوم — عيادة الصدر</strong>
              ${badge('مجدولة اليوم', 'sky')}
            </div>
            <small style="color: var(--muted);" class="font-en">٤ نوفمبر ٢٠٢٦ · ${p.time}</small>
            <p style="margin: 6px 0; font-size: 12.5px;">الطبيب المعالج: ${esc(p.doctor)}</p>
          </div>

          <div style="position: relative;">
            <span style="position: absolute; inset-inline-start: -31px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; border: 2px solid #fff;"></span>
            <div style="font-size: 12.5px; font-weight: 600; color: var(--muted);">إنشاء الملف السريري الأولي</div>
            <small style="color: var(--muted-light);">نظام المستشفى التجريبي</small>
          </div>
        </div>
      </div>
    </section>`;
}

// Encounter (Clinical Consultation) View
function encounter() { return doctorEncounterPage(); }

// 7 Models Bento Grid Hub View
function modelCards() {
  return `
    <div class="model-grid">
      ${models.map(m => `
        <a class="model-card" href="#model/${m.id}">
          <div class="model-card-top">
            <div class="model-card-icon">${icon(m.icon)}</div>
            <span class="model-number">${m.num}</span>
          </div>
          <h3>${m.name}</h3>
          <span class="model-card-en">${m.en}</span>
          <p class="model-card-desc">${m.desc}</p>
          <div class="model-card-tags">
            <span class="model-card-tag">${m.inputTag}</span>
            <span class="model-card-tag">${m.outputTag}</span>
          </div>
          <div class="model-card-footer">
            <span class="status-badge-offline">
              <span class="status-dot"></span>
              <span>جاهز للربط</span>
            </span>
            <span style="font-size: 11.5px; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 4px;">
              فحص الوحدة ${icon('arrow')}
            </span>
          </div>
        </a>`).join('')}
    </div>`;
}

// Clinical Triage & Reception View
function queue() {
  return `
    ${pageHead(
      'الاستقبال والفرز السريري (Triage)',
      'إدارة تدفق المرضى، قياس العلامات الحيوية، وتوجيه الحالات حسب درجة الأولوية.',
      button(icon('plus') + ' تسجيل مريض جديد', 'new-patient', 'primary')
    )}

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-card-title">بانتظار الفرز</span>
          <div class="stat-card-icon">${icon('pulse')}</div>
        </div>
        <div class="stat-card-value">${db.patients.filter(p => p.status === 'بانتظار الفرز').length}</div>
        <div class="stat-card-foot">حالات بحاجة لقياس العلامات</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-card-title">أولوية عاجلة</span>
          <div class="stat-card-icon">${icon('shield')}</div>
        </div>
        <div class="stat-card-value">${db.patients.filter(p => p.priority === 'أولوية مراجعة').length}</div>
        <div class="stat-card-foot">توجيه فوري للطبيب</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-card-title">في غرفة الكشف</span>
          <div class="stat-card-icon">${icon('users')}</div>
        </div>
        <div class="stat-card-value">${db.patients.filter(p => p.status === 'قيد الزيارة').length}</div>
        <div class="stat-card-foot">جاري الفحص السريري</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-card-title">زيارات مكتملة</span>
          <div class="stat-card-icon">${icon('check')}</div>
        </div>
        <div class="stat-card-value">${db.patients.filter(p => p.status === 'مكتملة').length}</div>
        <div class="stat-card-foot">تم إنهاء الزيارة</div>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>قائمة طابور الانتظار وتحديث التوجيه</h2>
        ${badge('فرز سريري يدوي وموثق', 'teal')}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>المريض</th>
              <th>الحالة الحالية</th>
              <th>الأولوية المقررة</th>
              <th>الطبيب الموجه إليه</th>
              <th>العلامات المسجلة</th>
              <th>إجراء الموظف</th>
            </tr>
          </thead>
          <tbody>
            ${db.patients.map(p => `
              <tr>
                <td>${patientCell(p)}</td>
                <td>${badge(p.status, p.status === 'بانتظار الفرز' ? 'amber' : p.status === 'قيد الزيارة' ? 'sky' : 'gray')}</td>
                <td>${badge(p.priority, p.priority === 'أولوية مراجعة' ? 'rose' : 'gray')}</td>
                <td><strong>${esc(p.doctor)}</strong></td>
                <td>
                  ${db.vitals[p.id] ? `<span class="badge emerald font-en">SpO2: ${db.vitals[p.id].spo2}%</span>` : '<span style="color:var(--muted);font-size:11px;">غير مسجلة</span>'}
                </td>
                <td>
                  ${button(p.status === 'لم يصل' ? 'تسجيل وصول' : 'تحديث التوجيه', 'checkin', 'secondary small', `data-id="${p.id}"`)}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}

// Appointments Management View
function appointments() {
  const directory = bookingDirectory();
  const list = role === 'patient' ? db.appointments.filter(a => a.patient === patient().id) : db.appointments;
  if (role === 'patient') {
    const dateInfo = value => {
      const date = new Date(value+'T12:00:00');
      if (Number.isNaN(date.getTime())) return {day:'—',month:'',label:value};
      return {day:String(date.getDate()),month:date.toLocaleDateString('ar-EG',{month:'long'}),
        label:date.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};
    };
    const upcoming = list.filter(a => canEditBooking(a) || a.status === 'تم تسجيل الوصول')
      .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const upcomingIds = new Set(upcoming.map(a=>a.id));
    const past = list.filter(a=>!upcomingIds.has(a.id)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    const panel = (title, rows) => `<section class="card patient-bookings">
      <div class="card-header"><h2>${title}</h2>${badge(String(rows.length),'teal')}</div>
      <div class="card-body patient-booking-list">${rows.length ? rows.map(a=>{
        const date=dateInfo(a.date), doctor=directory[a.doctor];
        const actions = `data-id="${esc(a.id)}"`;
        return `<article class="patient-booking-row ${a.status==='ملغي'?'is-cancelled':''}">
          <time class="patient-booking-date" datetime="${esc(a.date)}"><strong>${esc(date.day)}</strong><span>${esc(date.month)}</span></time>
          <div class="patient-booking-copy"><strong>${esc(a.doctor)}</strong><p>${esc(date.label)} · <bdi>${esc(a.time)}</bdi></p>
            <small>${esc(a.type)}</small>${doctor ? `<small>${esc(doctor.specialty)} · ${esc(doctor.location)}</small>` : ''}</div>
          <div class="patient-booking-actions">${badge(esc(a.status),a.status==='ملغي'?'gray':a.status==='بانتظار التأكيد'?'amber':'emerald')}
            ${canEditBooking(a) ? button('تعديل الحجز','edit-booking','secondary small',actions) +
              button('إلغاء الموعد','cancel-booking','danger small',actions) : ''}</div></article>`;
      }).join('') : '<p class="patient-empty">لا توجد مواعيد في هذا القسم.</p>'}</div></section>`;
    return pageHead('مواعيدي','تابع حالة الحجز ومواعيدك القادمة والسابقة.',
      button(icon('plus')+' حجز موعد جديد','book','primary'),'بوابة المريض') +
      panel('المواعيد القادمة والجارية',upcoming) + panel('المواعيد السابقة والملغاة',past);
  }
  return `
    ${pageHead(
      role === 'patient' ? 'مواعيدي القادمة' : 'جدول المواعيد والمتابعات',
      'حجز وتنظيم مواعيد العيادة ومتابعة حالات الفحص الدوري.',
      button(icon('plus') + ' حجز موعد جديد', 'book', 'primary')
    )}

    <section class="card">
      <div class="card-header">
        <h2>المواعيد المسجلة</h2>
        ${badge(list.filter(a => a.status !== 'ملغي').length + ' موعد', 'teal')}
      </div>
      <div class="card-body">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${list.map(a => `
            <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; flex: none;">
                  ${icon('calendar')}
                </div>
                <div>
                  <strong style="font-size: 13.5px; display: block;">
                    ${role === 'patient' ? a.doctor : esc(db.patients.find(p => p.id === a.patient)?.name || a.patient)}
                  </strong>
                  <div style="font-size: 11.5px; color: var(--muted);" class="font-en">
                    ${a.date} · ${a.time} · ${a.type}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${badge(a.status, a.status === 'ملغي' ? 'gray' : 'emerald')}
                ${role === 'reception' && a.status === 'بانتظار التأكيد' ? button('تأكيد الحجز','confirm-appointment','primary small',`data-id="${esc(a.id)}"`) : ''}
                ${role === 'reception' && a.status === 'مؤكد' ? button('تسجيل الوصول','arrive-appointment','secondary small',`data-id="${esc(a.id)}"`) : ''}
                ${['مؤكد','بانتظار التأكيد'].includes(a.status) ? button('إلغاء الموعد','cancel-booking','danger small',`data-id="${esc(a.id)}"`) : ''}
              </div>
            </div>`).join('') || empty('لا توجد مواعيد مسجلة', 'يمكنك إضافة موعد جديد الآن.')}
        </div>
      </div>
    </section>`;
}

// Patient Orders
function ordersForPatient() {
  const orders = db.orders.filter(o => o.patient === selected);
  return `
    <section class="card">
      <div class="card-header">
        <h2>طلبات الفحوصات والتحاليل</h2>
      </div>
      <div class="card-body">
        ${orders.length ? orders.map(o => `
          <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${icon('flask')}
              <strong>${esc(o.type)}</strong>
            </div>
            <span class="font-en" style="color: var(--muted); font-size: 11px;">${esc(o.date)}</span>
          </div>`).join('') : empty('لا توجد طلبات مسجلة', 'يمكن للطبيب تسجيل طلب فحص من شاشة الزيارة.')}
      </div>
    </section>`;
}

// Documents & Orders Center
function documents() {
  return attachmentsPage();
}

// Audit & Security Log View
function audit() {
  return `
    ${pageHead(
      'سجل النشاط والرقابة السريرية',
      'تدقيق مسار الإجراءات والاعتمادات والأمان داخل النظام.',
      ''
    )}

    <section class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الإجراء المتخذ</th>
              <th>المورد / المريض</th>
              <th>الدور المنفّذ</th>
              <th>التوقيت</th>
            </tr>
          </thead>
          <tbody>
            ${db.audit.map(a => `
              <tr>
                <td><strong>${esc(a.action)}</strong></td>
                <td><span class="font-en">${esc(a.resource)}</span></td>
                <td><span class="badge gray">${esc(a.role)}</span>${a.actor ? ' · ' + esc(a.actor) : ''}</td>
                <td><span class="font-en" style="color: var(--muted); font-size: 11.5px;">${esc(a.time)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${!db.audit.length ? empty('لا توجد أحداث مسجلة بعد', 'سيتم تسجيل أي حفظ أو اعتماد أو تعديل هنا.') : ''}
      </div>
    </section>`;
}

// Modal Engine
function modal(title, body, footer='') {
  modalFocus = document.activeElement;
  $('#modal-root').innerHTML = `
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 id="modal-title">${title}</h2>
          <button type="button" class="icon-btn" data-action="close" aria-label="إغلاق">${icon('close')}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </section>
    </div>`;
  setTimeout(() => $('.modal input, .modal select, .modal textarea, .modal button')?.focus(), 0);
}

function closeModal() {
  $('#modal-root').innerHTML = '';
  modalFocus?.focus();
}

// Appointment Booking Engine
const morningClinicHours = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00'];
const middayClinicHours = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00'];
const afternoonClinicHours = ['13:00','13:30','14:00','14:30','15:00','15:30','16:00'];

const additionalClinicDoctors = [
  ['د. أحمد منصور','الباطنة العامة','استشاري الباطنة العامة','الأرضي',2,[0,2,4],morningClinicHours],
  ['د. مريم عادل','القلب والأوعية الدموية','استشاري أمراض القلب والأوعية الدموية','الأول',5,[1,3,6],middayClinicHours],
  ['د. يوسف حمدي','القلب والأوعية الدموية','أخصائي أمراض القلب','الأول',5,[0,2,4],afternoonClinicHours],
  ['د. ندى إبراهيم','الأطفال','استشاري طب الأطفال','الأرضي',3,[0,2,4],middayClinicHours],
  ['د. ريم حسن','النساء والتوليد','استشاري النساء والتوليد','الأول',6,[1,3,6],morningClinicHours],
  ['د. كريم عادل','العظام','أخصائي جراحة العظام','الثاني',7,[0,2,4],afternoonClinicHours],
  ['د. سلمى محمود','الجلدية','أخصائي الأمراض الجلدية','الثاني',8,[1,3,6],middayClinicHours],
  ['د. ياسر عاطف','الأنف والأذن والحنجرة','استشاري الأنف والأذن والحنجرة','الثاني',9,[0,2,4],morningClinicHours],
  ['د. هبة فؤاد','العيون','استشاري طب وجراحة العيون','الثاني',10,[1,3,6],afternoonClinicHours],
  ['د. مصطفى شريف','الجهاز الهضمي والكبد','استشاري الجهاز الهضمي والكبد','الأول',11,[0,2,4],middayClinicHours],
  ['د. آية سمير','المخ والأعصاب','أخصائي المخ والأعصاب','الثاني',12,[1,3,6],morningClinicHours],
  ['د. حسام فتحي','المسالك البولية','استشاري جراحة المسالك البولية','الثاني',13,[0,2,4],afternoonClinicHours],
  ['د. نهى علي','الجراحة العامة','استشاري الجراحة العامة','الأول',14,[1,3,6],middayClinicHours],
  ['د. محمود ناصر','الكلى','أخصائي أمراض الكلى','الأول',15,[0,2,4],morningClinicHours],
  ['د. إيمان صبري','الغدد الصماء والسكر','استشاري الغدد الصماء والسكر','الثاني',16,[1,3,6],afternoonClinicHours],
  ['د. شيماء أمين','الروماتيزم والمناعة','أخصائي الروماتيزم والمناعة','الثاني',17,[0,2,4],middayClinicHours],
  ['د. طارق هشام','الطب النفسي','استشاري الطب النفسي','الثالث',18,[1,3,6],afternoonClinicHours],
  ['د. منى جابر','الأسنان','أخصائي طب وجراحة الأسنان','الثالث',19,[0,2,4],morningClinicHours],
  ['د. عمر عبد الرحمن','العلاج الطبيعي والتأهيل','أخصائي العلاج الطبيعي والتأهيل','الثالث',20,[1,3,6],middayClinicHours],
  ['د. ليلى كمال','طب الأسرة','أخصائي طب الأسرة','الأرضي',21,[0,2,4],afternoonClinicHours],
  ['د. خالد أمين','أمراض الصدر','أخصائي أمراض الصدر','الأرضي',1,[1,4,6],afternoonClinicHours],
  ['د. ياسمين فريد','الأورام الصدرية','أخصائي الأورام الصدرية','الأول',4,[0,2,3],afternoonClinicHours],
  ['د. رانيا سالم','الباطنة العامة','أخصائي الباطنة العامة','الأرضي',2,[1,3,6],afternoonClinicHours],
  ['د. زياد فوزي','الأطفال','أخصائي طب الأطفال','الأرضي',3,[1,3,6],afternoonClinicHours],
  ['د. داليا أشرف','النساء والتوليد','أخصائي النساء والتوليد','الأول',6,[0,2,4],middayClinicHours],
  ['د. عمرو عزت','العظام','استشاري جراحة العظام','الثاني',7,[1,3,6],morningClinicHours],
  ['د. نورا سامي','الجلدية','استشاري الأمراض الجلدية','الثاني',8,[0,2,4],afternoonClinicHours],
  ['د. رامي عادل','الأنف والأذن والحنجرة','أخصائي الأنف والأذن والحنجرة','الثاني',9,[1,3,6],middayClinicHours],
  ['د. بسمة خالد','العيون','أخصائي طب وجراحة العيون','الثاني',10,[0,2,4],morningClinicHours],
  ['د. عادل فتحي','الجهاز الهضمي والكبد','أخصائي الجهاز الهضمي والكبد','الأول',11,[1,3,6],afternoonClinicHours],
  ['د. مروان عصام','المخ والأعصاب','استشاري المخ والأعصاب','الثاني',12,[0,2,4],afternoonClinicHours],
  ['د. شريف عادل','المسالك البولية','أخصائي جراحة المسالك البولية','الثاني',13,[1,3,6],morningClinicHours],
  ['د. هاني رشاد','الجراحة العامة','أخصائي الجراحة العامة','الأول',14,[0,2,4],morningClinicHours],
  ['د. أمنية فؤاد','الكلى','استشاري أمراض الكلى','الأول',15,[1,3,6],middayClinicHours],
  ['د. سامح نبيل','الغدد الصماء والسكر','أخصائي الغدد الصماء والسكر','الثاني',16,[0,2,4],morningClinicHours],
  ['د. دعاء نجيب','الروماتيزم والمناعة','استشاري الروماتيزم والمناعة','الثاني',17,[1,3,6],afternoonClinicHours],
  ['د. ميار حسن','الطب النفسي','أخصائي الطب النفسي','الثالث',18,[0,2,4],middayClinicHours],
  ['د. إبراهيم عصام','الأسنان','أخصائي طب وجراحة الأسنان','الثالث',19,[1,3,6],afternoonClinicHours],
  ['د. سحر كمال','العلاج الطبيعي والتأهيل','أخصائي العلاج الطبيعي والتأهيل','الثالث',20,[0,2,4],morningClinicHours],
  ['د. سيف جمال','طب الأسرة','أخصائي طب الأسرة','الأرضي',21,[1,3,6],morningClinicHours]
];

const defaultBookingDoctors = {
  'د. سارة أحمد': {
    department:'أمراض الصدر', specialty:'استشاري أمراض الصدر', clinic:'عيادة أمراض الصدر',
    location:'مبنى العيادات الخارجية · الدور الأرضي · عيادة ١',
    days:[0,2,3], hours:['09:00','09:30','10:00','10:30','11:00','11:30','12:00']
  },
  'د. عمر خالد': {
    department:'الأورام الصدرية', specialty:'أخصائي الأورام الصدرية', clinic:'عيادة الأورام الصدرية',
    location:'مبنى العيادات الخارجية · الدور الأول · عيادة ٤',
    days:[1,4,6], hours:['10:00','10:30','11:00','11:30','12:00','12:30','13:00']
  },
  ...Object.fromEntries(additionalClinicDoctors.map(([name,department,specialty,floor,room,days,hours]) => [name,{
    department, specialty, clinic:'عيادة ' + department,
    location:'مبنى العيادات الخارجية · الدور ' + floor + ' · عيادة ' + room,
    days, hours
  }]))
};
const bookingDayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const consultationTypes = ['كشف أول مرة','متابعة عقدة رئوية','استشارة أولية','مراجعة نتائج تحاليل وأشعة'];

function bookingDirectory() {
  return Object.assign(Object.create(null),defaultBookingDoctors,
    Object.fromEntries((db.doctorDirectory || []).map(entry => [entry.name,{...entry,...facilityBookingFields(entry.facilityId)}])));
}

function bookingDepartments() {
  return [...new Set(Object.values(bookingDirectory()).filter(d => d.active !== false).map(d => d.department))]
    .sort((a,b) => a.localeCompare(b,'ar'));
}

function bookingDoctorOptions(department, selectedDoctor, originalDoctor) {
  return Object.entries(bookingDirectory())
    .filter(([name,doctor]) => (doctor.active !== false || name === originalDoctor) &&
      (!department || doctor.department === department))
    .map(([name,doctor]) => `<option value="${esc(name)}" ${name === selectedDoctor ? 'selected' : ''}>${esc(name)} — ${esc(doctor.specialty)}${doctor.active === false ? ' (الحجز موقوف)' : ''}</option>`)
    .join('');
}

function bookingDateKey(date) {
  return [date.getFullYear(), date.getMonth()+1, date.getDate()]
    .map((value,index) => String(value).padStart(index === 0 ? 4 : 2,'0')).join('-');
}

function futureBookingSlot(date, time) {
  return new Date(date + 'T' + time) >= new Date();
}

function canEditBooking(appointment) {
  return ['مؤكد','بانتظار التأكيد'].includes(appointment?.status) && futureBookingSlot(appointment.date, appointment.time);
}

function availableBookingTimes(doctor, patientId, date) {
  const schedule = bookingDirectory()[doctor];
  if (!schedule || schedule.active === false || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const weekday = new Date(date + 'T12:00:00').getDay();
  if (!schedule.days.includes(weekday)) return [];
  return schedule.hours.filter(time => futureBookingSlot(date,time) && !db.appointments.some(a =>
    a.status !== 'ملغي' && a.date === date && a.time === time &&
    (a.doctor === doctor || a.patient === patientId)));
}

function firstBookingDay(doctor, patientId) {
  const date = new Date();
  for (let offset = 0; offset < 28; offset++, date.setDate(date.getDate()+1)) {
    const key = bookingDateKey(date);
    if (availableBookingTimes(doctor,patientId,key).length) return key;
  }
  return '';
}

function book(appointmentId,preferredDoctor,preferredPatient) {
  const original = appointmentId ? db.appointments.find(a => a.id === appointmentId &&
    (role === 'reception' || a.patient === demoSession?.patientId)) : null;
  const patientId = role === 'patient' ? demoSession?.patientId : original?.patient || preferredPatient || selected;
  if (appointmentId && (!['patient','reception'].includes(role) || !canEditBooking(original))) {
    toast('الحجز ده غير متاح للتعديل.');
    return;
  }
  const directory = bookingDirectory();
  const selectedDoctor = original && Object.hasOwn(directory,original.doctor) ? original.doctor :
    (Object.hasOwn(directory,preferredDoctor) && directory[preferredDoctor].active !== false ? preferredDoctor :
      Object.keys(directory).find(name => directory[name].active !== false));
  if (!selectedDoctor) { toast('لا يوجد أطباء متاحون للحجز حاليًا.'); return; }
  const initialDate = original?.date || firstBookingDay(selectedDoctor,patientId);
  const types = original ? [...new Set([original.type,...consultationTypes].filter(Boolean))] : consultationTypes;
  modal(original ? 'تعديل الحجز' : 'حجز موعد جديد بالعيادة', `
    <form id="book-form" class="form-grid">
      ${role !== 'patient' && !original ? `<label class="field full"><span>المريض *</span>
        <select name="patient" class="input">${db.patients.map(p => `<option value="${esc(p.id)}" ${p.id === patientId ? 'selected' : ''}>${esc(p.name)} (${esc(p.id)})</option>`).join('')}</select>
      </label>` : ''}
      <label class="field full"><span>التخصص</span>
        <select name="department" class="input">
          <option value="">كل التخصصات</option>
          ${bookingDepartments().map(name => `<option>${esc(name)}</option>`).join('')}
        </select>
      </label>
      <label class="field full"><span>الطبيب *</span>
        <select name="doctor" class="input" required>${bookingDoctorOptions('',selectedDoctor,original?.doctor)}</select>
      </label>
      ${original ? `<p class="booking-current full">موعدك الحالي مع ${esc(original.doctor)} · <bdi>${esc(original.date)} · ${esc(original.time)}</bdi></p>` : ''}
      <div class="booking-clinic-info full" aria-live="polite"></div>
      ${field('التاريخ *','date',initialDate,'date',`required min="${bookingDateKey(new Date())}"`)}
      <label class="field"><span>الوقت المتاح *</span><select name="time" class="input" required></select></label>
      <label class="field full"><span>نوع الاستشارة</span>
        <select name="type" class="input">${types.map(type => `<option>${esc(type)}</option>`).join('')}</select>
      </label>
      <p id="form-error" class="full" role="alert"></p>
      <div class="booking-form-actions full">
        <button class="button secondary" type="button" data-action="close">إلغاء</button>
        <button class="button primary" type="submit">${original ? 'حفظ التعديل' : role === 'patient' ? 'إرسال طلب الحجز' : 'تأكيد حجز الموعد'}</button>
      </div>
    </form>`);

  const form = $('#book-form');
  const {department,doctor,date,time} = form.elements;
  const targetPatient = () => role === 'patient' ? demoSession?.patientId : original?.patient || form.elements.patient?.value;
  const error = form.querySelector('#form-error');
  const submit = form.querySelector('[type=submit]');
  const canKeepCurrent = () => canEditBooking(original) && doctor.value === original.doctor && date.value === original.date;
  function refreshTimes(preferred = time.value) {
    const schedule = bookingDirectory()[doctor.value];
    const hours = availableBookingTimes(doctor.value,targetPatient(),date.value);
    const keepCurrent = canKeepCurrent();
    form.querySelector('.booking-clinic-info').innerHTML = `
      <strong>${esc(schedule.clinic)}</strong><span>${esc(hospitalProfile().name)} · ${esc(schedule.branch || 'الفرع الرئيسي')}</span><span>${esc(schedule.location)}</span>
      <span>أيام العيادة: ${schedule.days.map(day => bookingDayNames[day]).join('، ')} · <bdi>${schedule.hours[0]}–${schedule.hours.at(-1)}</bdi></span>
      <small>المكان والجدول بيانات للمعاينة.</small>`;
    const options = hours.map(hour => `<option>${hour}</option>`).join('');
    time.innerHTML = keepCurrent
      ? '<option value="">الاحتفاظ بالموعد الحالي</option>' + options
      : options || '<option value="">لا توجد مواعيد متاحة</option>';
    time.required = !keepCurrent;
    if (hours.includes(preferred)) time.value = preferred;
    submit.disabled = !hours.length && !keepCurrent;
    error.textContent = hours.length || keepCurrent ? '' : 'اختار يوم تاني من أيام عيادة الطبيب.';
  }
  refreshTimes();
  form.addEventListener('change', event => {
    if (event.target === department) doctor.innerHTML = bookingDoctorOptions(department.value,doctor.value,original?.doctor);
    if (event.target === department || event.target === doctor || event.target.name === 'patient') {
      date.value = firstBookingDay(doctor.value,targetPatient());
    }
    if (['department','doctor','patient','date'].includes(event.target.name)) refreshTimes();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const id = targetPatient();
    if (original && (original.patient !== id || !canEditBooking(original))) {
      error.textContent = 'الحجز ده غير متاح للتعديل.';
      return;
    }
    const keepCurrent = values.time === '' && canKeepCurrent();
    if (!db.patients.some(p => p.id === id) || !types.includes(values.type) ||
        (!keepCurrent && !availableBookingTimes(values.doctor,id,values.date).includes(values.time))) {
      refreshTimes();
      error.textContent = 'الموعد المختار غير متاح. راجع الأوقات واختر موعد تاني.';
      return;
    }
    const booking = {doctor:values.doctor,date:values.date,time:keepCurrent ? original.time : values.time,type:values.type};
    if (original) Object.assign(original,booking);
    else db.appointments.push({...booking,patient:id,id:'A' + Date.now(),status:role === 'patient' ? 'بانتظار التأكيد' : 'مؤكد'});
    log(original ? 'تعديل موعد استشارة' : 'حجز موعد استشارة',id);
    closeModal();
    render();
    toast(original ? 'تم حفظ تعديل الحجز.' : role === 'patient' ? 'تم إرسال الحجز للاستقبال للتأكيد.' : 'تم تأكيد حجز الموعد.');
  });
}

// Page Event Bindings
function bindPage() {
  const searchInput = $('#patient-search');
  searchInput?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    query = e.target.value;
    render();
    $('#patient-search')?.focus();
    $('#patient-search')?.setSelectionRange(pos, pos);
  });

  $('#patient-filter')?.addEventListener('change', e => {
    patientFilter = e.target.value;
    render();
  });

  $('#model-patient')?.addEventListener('change', e => {
    if (role !== 'doctor' || !doctorCanAccess(e.target.value)) return;
    selected = e.target.value;
    render();
  });


  $('#model-file-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    const model = models.find(m => m.id === activeModel);
    const extension = file ? '.' + file.name.split('.').pop().toLowerCase() : '';
    if (file && (!model.types.split(',').includes(extension) || file.size > 50 * 1024 * 1024)) {
      e.target.value = '';
      $('#file-upload-status').textContent = 'اختر نوع ملف مدعوم بحجم لا يتجاوز 50 MB.';
      return;
    }
    $('#file-upload-status').textContent = file
      ? `تم اختيار الملف: ${file.name} (المعاينة محلية، بدون رفع للمخدم).`
      : 'لم يتم اختيار ملف.';
  });

}

// Global Click Action Delegator
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (!allowAction(a, el)) return;

  if (a === 'close') closeModal();
  if (a === 'toggle-menu') {
    const open = $('#sidebar').classList.toggle('open');
    el.setAttribute('aria-expanded', String(open));
  }
  if (a === 'add-reception-staff') editReceptionStaff();
  if (a === 'edit-reception-staff' && el.dataset.id) editReceptionStaff(el.dataset.id);
  if (a === 'edit-hospital') editHospitalProfile();
  if (a === 'admin-add-facility') adminEditFacility();
  if (a === 'admin-edit-facility' && el.dataset.id) adminEditFacility(el.dataset.id);
  if (a === 'admin-add-employee') adminEditEmployee();
  if (a === 'admin-edit-employee' && el.dataset.id) adminEditEmployee(el.dataset.id);
  if (a === 'admin-add-stock') adminEditStock();
  if (a === 'admin-edit-stock' && el.dataset.id) adminEditStock(el.dataset.id);
  if (a === 'admin-export-csv') exportAdminReport();
  if (a === 'admin-print-report' && $('.admin-printable')) window.print();
  if (a === 'add-directory-doctor') editHospitalDoctor();
  if (a === 'edit-directory-doctor' && el.dataset.id) editHospitalDoctor(el.dataset.id);
  if (a === 'book') book();
  if (a === 'book-doctor') book(null,el.dataset.id);
  if (a === 'doctor-profile') showPatientDoctorProfile(el.dataset.id);
  if (a === 'edit-booking' && el.dataset.id) book(el.dataset.id);
  if (a === 'record-tab') { activeTab = el.dataset.tab; render(); }


  if (a === 'notifications') {
    modal('مركز الإشعارات والتنبيهات', empty('لا توجد تنبيهات عاجلة', 'تظهر هنا التنبيهات السريرية عند استلام نتائج النماذج.'));
  }

  if (a === 'check-service') {
    modal('خدمة التحليل السريري: وضع الاستعداد', `
      <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--amber-light); color: #d97706; display: flex; align-items: center; justify-content: center; flex: none;">
          ${icon('info')}
        </div>
        <div>
          <strong style="font-size: 13.5px;">الخدمة جاهزة للربط بالـ API</strong>
          <p style="font-size: 12.5px; color: var(--muted); margin-top: 4px;">
            وحدة ${models.find(m => m.id === activeModel).name} مهيأة وفق العقد المعتمد. لم يتم توليد نتائج عشوائية التزاماً بالمعايير الأخلاقية السريرية.
          </p>
        </div>
      </div>
    `, button('حسناً، فهمت', 'close', 'primary'));
  }

  if (a === 'ai-architecture') {
    modal('المخطط الهيكلي لمنظومة MNU 333 AI', `
      <div style="font-size: 12.5px; line-height: 1.8;">
        <p>تعتمد المنظومة على التوازي المتعدد والتجميع الموثق:</p>
        <ol style="padding-inline-start: 20px; margin-bottom: 16px;">
          <li><strong>مدخلات متعددة:</strong> صور أشعة الصدر، مقاطع الأشعة المقطعية، شرائح الباثولوجي، والتحاليل.</li>
          <li><strong>معالجة متخصصة:</strong> كل نموذج من النماذج الستة الأولى ينتج تقريره المستقل مع درجات الثقة وعدم اليقين.</li>
          <li><strong>وحدة Superior التجميعية:</strong> تقرأ التقارير المتاحة وتستخلص التوافقات ونقاط الاختلاف.</li>
          <li><strong>حاجز القرار البشري (Human-in-the-Loop):</strong> لا يُعتمد أي استنتاج دون مراجعة وتوقيع الطبيب البشري.</li>
        </ol>
      </div>
    `, button('إغلاق', 'close', 'primary'));
  }

  if (role === 'reception') {
    if (a === 'new-patient') { registerReceptionPatient(); return; }
    if (a === 'reception-person') receptionPatientDetails(el.dataset.id);
    if (a === 'reception-card') receptionPatientCard(el.dataset.id);
    if (a === 'reception-book-person') { closeModal(); book(null,null,el.dataset.id); }
    if (a === 'reception-print' && $('.reception-print-card')) window.print();
    if (a === 'reception-verify') verifyReceptionArrival(el.dataset.id);
    if (a === 'reception-queue-next') advanceReceptionQueue(el.dataset.id);
  }

  if (a === 'new-patient') {
    modal('تسجيل ملف مريض جديد', `
      <form id="patient-form" class="form-grid">
        ${field('الاسم الثلاثي للمريض *', 'name', '', 'text', 'required minlength="4"')}
        ${field('العمر *', 'age', '', 'number', 'required min="1" max="120"')}
        <label class="field">
          <span>الجنس *</span>
          <select name="gender" class="input">
            <option>ذكر</option>
            <option>أنثى</option>
          </select>
        </label>
        ${field('رقم الهاتف *', 'phone', '', 'tel', 'required pattern="[0-9+ ]{8,18}"')}
        <p id="patient-form-error" style="color: var(--rose); font-size: 12px; margin: 0;" class="full"></p>
        <div class="full" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button class="button secondary" type="button" data-action="close">إلغاء</button>
          <button class="button primary" type="submit">إنشاء وحفظ الملف</button>
        </div>
      </form>
    `);

    $('#patient-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(ev.target));
      if (db.patients.some(p => p.phone === v.phone || p.name === v.name)) {
        $('#patient-form-error').textContent = 'يوجد مريض مسجل بنفس الاسم أو الهاتف.';
        return;
      }
      const newId = 'CL-' + (Math.max(...db.patients.map(p => +p.id.slice(3) || 1000)) + 1);
      db.patients.push({
        ...v,
        id: newId,
        age: +v.age,
        visit: 'استشارة أولية',
        status: 'بانتظار الفرز',
        priority: 'لم يُراجع',
        doctor: 'د. سارة أحمد',
        time: '—',
        allergy: 'لم تُسجل بيانات الحساسية'
      });
      log('تسجيل مريض جديد', newId);
      selected = newId;
      closeModal();
      location.hash = 'patients';
      render();
      toast(`تم إنشاء الملف ${newId} بنجاح.`);
    });
  }

  if (a === 'checkin') {
    selected = el.dataset.id;
    const p = patient();
    if (p.status === 'لم يصل') {
      p.status = 'بانتظار الفرز';
      log('تسجيل حضور مريض', p.id);
      render();
      toast('تم تسجيل وصول المريض بنجاح.');
      return;
    }
    modal('تحديث الفرز السريري — ' + esc(p.name), `
      <form id="triage-form" class="form-grid">
        <label class="field full">
          <span>درجة الأولوية السريرية</span>
          <select name="priority" class="input">
            ${['لم يُراجع', 'عادية', 'أولوية مراجعة'].map(v => `<option ${p.priority === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="field full">
          <span>الطبيب المعالج</span>
          <select name="doctor" class="input">
            ${['د. سارة أحمد', 'د. عمر خالد'].map(v => `<option ${p.doctor === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="field full">
          <span>حالة الزيارة الحالية</span>
          <select name="status" class="input">
            ${['بانتظار الفرز', 'بانتظار الطبيب', 'قيد الزيارة', 'مكتملة'].map(v => `<option ${p.status === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <div class="full" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button class="button secondary" type="button" data-action="close">إلغاء</button>
          <button class="button primary" type="submit">تحديث التوجيه</button>
        </div>
      </form>
    `);

    $('#triage-form').addEventListener('submit', ev => {
      ev.preventDefault();
      Object.assign(p, Object.fromEntries(new FormData(ev.target)));
      log('تحديث الفرز والتوجيه', p.id);
      closeModal();
      render();
      toast('تم تحديث الفرز بنجاح.');
    });
  }

  if (a === 'vitals') {
    const patientId = selected;
    modal('تسجيل العلامات الحيوية للمريض', `
      <form id="vitals-form" class="form-grid">
        ${field('النبض (Pulse) — bpm', 'pulse', db.vitals[selected]?.pulse, 'number', 'min="30" max="250" placeholder="72"')}
        ${field('ضغط الدم (BP) — mmHg', 'pressure', db.vitals[selected]?.pressure, 'text', 'placeholder="120/80"')}
        ${field('درجة الحرارة (Temp) — °C', 'temp', db.vitals[selected]?.temp, 'number', 'min="34" max="42" step="0.1" placeholder="37.0"')}
        ${field('تشبع الأكسجين (SpO2) — %', 'spo2', db.vitals[selected]?.spo2, 'number', 'min="70" max="100" placeholder="98"')}
        <div class="full" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button class="button secondary" type="button" data-action="close">إلغاء</button>
          <button class="button primary" type="submit">حفظ العلامات</button>
        </div>
      </form>
    `);

    $('#vitals-form').addEventListener('submit', ev => {
      ev.preventDefault();
      if (demoSession?.role !== 'doctor' || !doctorCanAccess(patientId)) return;
      db.vitals[patientId] = Object.fromEntries(new FormData(ev.target));
      log('تسجيل العلامات الحيوية', patientId);
      closeModal();
      render();
      toast('تم حفظ وتحديث العلامات الحيوية.');
    });
  }

  if (a === 'doctor-report') showDoctorReport(el.dataset.id);
  if (a === 'doctor-print' && $('.doctor-print-report')) window.print();

  if (role === 'reception' && ['confirm-appointment','arrive-appointment'].includes(a)) {
    const appointment = db.appointments.find(item => item.id === el.dataset.id);
    const confirm = a === 'confirm-appointment';
    if (!appointment || appointment.status !== (confirm ? 'بانتظار التأكيد' : 'مؤكد') ||
      (confirm ? appointment.date < receptionToday() : appointment.date !== receptionToday())) return;
    appointment.status = confirm ? 'مؤكد' : 'تم تسجيل الوصول';
    if (!confirm) {
      recordReceptionArrival(appointment);
      closeModal();
    }
    const person = db.patients.find(p => p.id === appointment.patient);
    if (!confirm && person) {
      person.status = 'بانتظار الطبيب';
      person.doctor = appointment.doctor;
    }
    log(confirm ? 'تأكيد حجز من الاستقبال' : 'تسجيل وصول للموعد',appointment.id);
    render();
    toast(confirm ? 'تم تأكيد الحجز.' : 'تم تسجيل الوصول · رقم الانتظار ' + appointment.queueNumber + '.');
  }

  if (a === 'cancel-booking') {
    modal('إلغاء الموعد المحجوز', `
      <p style="font-size: 13px;">هل أنت متأكد من إلغاء هذا الموعد؟ سيتم تحديث حالته إلى "ملغي" في سجل المواعيد.</p>
    `, button('تأكيد الإلغاء', 'confirm-cancel', 'danger', `data-id="${el.dataset.id}"`) + button('الاحتفاظ بالموعد', 'close', 'secondary'));
  }

  if (a === 'confirm-cancel') {
    const ap = db.appointments.find(x => x.id === el.dataset.id);
    if (ap && ['مؤكد','بانتظار التأكيد'].includes(ap.status)) {
      ap.status = 'ملغي';
      log('إلغاء موعد محجوز', ap.patient);
    }
    closeModal();
    render();
    toast('تم إلغاء الموعد.');
  }

  if (a === 'contact') {
    const p = patient();
    modal('تعديل رقم هاتف المريض', `
      <form id="contact-form">
        ${field('رقم الهاتف الجديد', 'phone', p.phone, 'tel', 'required')}
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button class="button secondary" type="button" data-action="close">إلغاء</button>
          <button class="button primary" type="submit">حفظ التعديل</button>
        </div>
      </form>
    `);

    $('#contact-form').addEventListener('submit', ev => {
      ev.preventDefault();
      p.phone = new FormData(ev.target).get('phone');
      log('تحديث هاتف التواصل', p.id);
      closeModal();
      render();
      toast('تم تحديث رقم الهاتف.');
    });
  }

  if (a === 'document') {
    modal('إرفاق مستند سريري جديد', `
      <form id="doc-form" class="form-grid">
        <label class="field full">
          <span>المريض المرتبط *</span>
          <select name="patient" class="input">
            ${db.patients.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name} (${p.id})</option>`).join('')}
          </select>
        </label>
        ${field('عنوان المستند *', 'title', '', 'text', 'required placeholder="تقرير فحص أشعة، تحليل معملي..."')}
        ${field('تاريخ الفحص *', 'date', '2026-11-04', 'date', 'required')}
        <label class="field full">
          <span>اختيار الملف للمعاينة الوصفية</span>
          <input type="file" name="file" required class="input">
        </label>
        <div class="full" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button class="button secondary" type="button" data-action="close">إلغاء</button>
          <button class="button primary" type="submit">حفظ المستند</button>
        </div>
      </form>
    `);

    $('#doc-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const fData = new FormData(ev.target);
      db.attachments.push({
        patient: fData.get('patient'),
        title: fData.get('title'),
        date: fData.get('date'),
        filename: fData.get('file')?.name || 'document.pdf'
      });
      log('إرفاق مستند جديد', fData.get('patient'));
      closeModal();
      render();
      toast('تم حفظ بيانات المستند بنجاح.');
    });
  }

  if (a === 'reset') {
    modal('إعادة ضبط كافة البيانات التجريبية', `
      <p style="font-size: 13px; color: var(--rose);">
        تحذير: سيتم حذف كافة السجلات والزيارات والمواعيد التي تم إنشاؤها في هذا المتصفح، والعودة إلى البيانات الأولية للمشروع.
      </p>
    `, button('تأكيد إعادة الضبط', 'confirm-reset', 'danger') + button('تراجع', 'close', 'secondary'));
  }

  if (a === 'confirm-reset') {
    try { localStorage.removeItem(RECEPTION_STAFF_KEY); } catch {}
    db = structuredClone(initial);
    draft = {};
    save();
    closeModal();
    render();
    toast('تمت استعادة البيانات التجريبية الأولية.');
  }
});

// Modal Focus & Keyboard Management
document.addEventListener('keydown', e => {
  if (!$('.modal')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') {
    const focusable = [...$$('.modal button, .modal input, .modal select, .modal textarea, .modal a')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// URL Routing Hash Listener
window.addEventListener('hashchange', () => {
  draft = {};
  activeTab = 'overview';
  render();
  window.scrollTo(0, 0);
});

// experience.js supplies the public entry points and starts the preview.
