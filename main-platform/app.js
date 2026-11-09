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
  sharedReports: []
};

// Safe Local Storage Load
let db;
try {
  const saved = JSON.parse(localStorage.getItem('clarimed-demo-v1'));
  db = saved && Array.isArray(saved.patients) ? { ...structuredClone(initial), ...saved } : structuredClone(initial);
} catch {
  db = structuredClone(initial);
}

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
  ['queue', 'pulse', 'الفرز السريري'],
  ['ai', 'brain', 'مركز النماذج السبعة'],
  ['documents', 'file', 'الطلبات والفحوصات'],
  ['audit', 'shield', 'سجل النشاط والأمان'],
  ['settings', 'settings', 'الإعدادات والمكدس']
];

const allowed = {
  doctor: ['dashboard', 'consultations', 'patients', 'record', 'encounter', 'appointments', 'ai', 'model', 'documents', 'settings'],
  radiologist: ['documents'],
  reception: ['dashboard', 'patients', 'appointments', 'queue', 'settings'],
  patient: ['portal', 'appointments', 'patient-reports', 'patient-attachments', 'patient-profile'],
  admin: ['dashboard', 'audit', 'settings']
};

const patient = () => db.patients.find(p => p.id === selected) || db.patients[0];

const save = () => {
  try {
    localStorage.setItem('clarimed-demo-v1', JSON.stringify(db));
  } catch {
    toast('تعذّر الحفظ التلقائي في المتصفح.');
  }
};

function log(action, resource) {
  db.audit.unshift({
    action,
    resource,
    role: roles[role],
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
function encounter() {
  const p = patient();
  const existing = db.visits.find(v => v.patient === p.id && !v.approved);
  draft = { ...(existing || {}), ...(draft.patient === p.id ? draft : {}), patient: p.id };

  return `
    ${pageHead(
      'فحص الزيارة السريرية',
      `تسجيل ومراجعة بيانات زيارة المريض: ${esc(p.name)} (${p.id})`,
      link('الرجوع لملف المريض', 'record/' + p.id, 'secondary')
    )}

    ${patientBanner(p)}

    <form id="encounter-form">
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px;">
        <section class="card">
          <div class="card-header">
            <h2>الأعراض والفحص السريري</h2>
            ${badge('مسودة زيارة', 'amber')}
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            ${field('سبب الزيارة الرئيسي *', 'reason', draft.reason, 'text', 'required placeholder="مثال: سعال مستمر، ألم صدري..."')}
            <label class="field">
              <span>الفحص الإكلينيكي وملاحظات الطبيب</span>
              <textarea class="input" name="notes" rows="4" placeholder="سجّل نتائج فحص الرئتين وتاريخ التدخين...">${esc(draft.notes || '')}</textarea>
            </label>
            <label class="field">
              <span>التقييم الأولي للورم / العقدة</span>
              <textarea class="input" name="assessment" rows="3" placeholder="تقييم احتمالية الإصابة بناءً على الفحوصات...">${esc(draft.assessment || '')}</textarea>
            </label>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h2>الخطة العلاجية وطلبات الفحص</h2>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            <label class="field">
              <span>خطة المتابعة والتعليمات الموجهة *</span>
              <textarea class="input" name="plan" rows="4" required placeholder="تعليمات العلاج وتوصيات الزيارة القادمة...">${esc(draft.plan || '')}</textarea>
            </label>
            ${field('الأدوية المصروفة', 'medications', draft.medications, 'text', 'placeholder="أدوية موسعة للشعب، مضادات..."')}
            <label class="field">
              <span>طلب فحص تشخيصي إضافي</span>
              <select name="order" class="input">
                <option value="">لا يوجد فحص مطلوب</option>
                <option>أشعة صدر X-ray أمامية</option>
                <option>أشعة مقطعية عالية الدقة CT</option>
                <option>تحليل دلالات أورام المعمل</option>
                <option>فحص عينة أنسجة باثولوجي</option>
                <option>تسجيل أصوات التنفس الرقمي</option>
              </select>
            </label>
            ${field('موعد المتابعة المقترح', 'followup', draft.followup, 'date')}
          </div>
        </section>
      </div>

      <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 24px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; box-shadow: var(--shadow-sm);">
        <div style="display: flex; align-items: center; gap: 10px; color: var(--ink-secondary); font-size: 12.5px;">
          ${icon('shield')}
          <span>الاعتماد الطبي يسجل قرار الطبيب النهائي ويمنح الإذن بإتاحة الإرشادات للمريض.</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="submit" class="button secondary" name="mode" value="draft">حفظ مسودة</button>
          <button type="submit" class="button primary" name="mode" value="approve">
            مراجعة واعتماد الزيارة ${icon('check')}
          </button>
        </div>
      </div>
    </form>`;
}

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
  const list = role === 'patient' ? db.appointments.filter(a => a.patient === patient().id) : db.appointments;
  if (role === 'patient') {
    const ordered = list.slice().sort((a,b)=>(a.status==='ملغي')-(b.status==='ملغي') || (a.date+a.time).localeCompare(b.date+b.time));
    const dateInfo = value => {
      const date = new Date(value+'T12:00:00');
      if (Number.isNaN(date.getTime())) return {day:'—',month:'',label:value};
      return {day:String(date.getDate()),month:date.toLocaleDateString('ar-EG',{month:'long'}),label:date.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};
    };
    const activeCount=ordered.filter(a=>a.status!=='ملغي').length;
    const countLabel=activeCount===1?'موعد واحد':activeCount===2?'موعدان':activeCount+' مواعيد';
    return `${pageHead('مواعيدي القادمة','تابع مواعيد الكشف أو أضف حجزًا جديدًا.',button(icon('plus')+' حجز موعد جديد','book','primary'),'بوابة المريض')}
      <section class="card patient-bookings"><div class="card-header"><h2>المواعيد المسجلة</h2>${badge(countLabel,'teal')}</div>
        <div class="card-body"><div class="patient-booking-list">${ordered.length ? ordered.map(a=>{const date=dateInfo(a.date);return `<article class="patient-booking-row ${a.status==='ملغي'?'is-cancelled':''}">
          <time class="patient-booking-date" datetime="${esc(a.date)}"><strong>${esc(date.day)}</strong><span>${esc(date.month)}</span></time>
          <div class="patient-booking-copy"><strong>${esc(a.doctor)}</strong><p>${esc(date.label)} · <bdi>${esc(a.time)}</bdi></p><small>${esc(a.type)}</small></div>
          <div class="patient-booking-actions">${badge(a.status,a.status==='ملغي'?'gray':'emerald')}${a.status!=='ملغي'?button('إلغاء الموعد','cancel-booking','danger small',`data-id="${esc(a.id)}"`):''}</div>
        </article>`}).join('') : empty('لا توجد مواعيد مسجلة','يمكنك إضافة موعد جديد الآن.')}</div></div></section>`;
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
                ${a.status !== 'ملغي' ? button('إلغاء الموعد', 'cancel-booking', 'danger small', `data-id="${a.id}"`) : ''}
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
                <td><span class="badge gray">${a.role}</span></td>
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
function book() {
  modal('حجز موعد جديد بالعيادة', `
    <form id="book-form" class="form-grid">
      ${role !== 'patient' ? `
        <label class="field full">
          <span>المريض *</span>
          <select name="patient" class="input">
            ${db.patients.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)} (${p.id})</option>`).join('')}
          </select>
        </label>` : `<input type="hidden" name="patient" value="${esc(patient().id)}">`}
      <label class="field full">
        <span>الطبيب والتخصص *</span>
        <select name="doctor" class="input">
          <option value="د. سارة أحمد">د. سارة أحمد — استشاري أمراض الصدر</option>
          <option value="د. عمر خالد">د. عمر خالد — أخصائي الأورام الصدرية</option>
        </select>
      </label>
      ${field('التاريخ *', 'date', '2026-11-11', 'date', 'required min="${DEMO_TODAY}"')}
      <label class="field">
        <span>الوقت المتاح *</span>
        <select name="time" class="input">
          ${['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'].map(t => `<option>${t}</option>`).join('')}
        </select>
      </label>
      <label class="field full">
        <span>نوع الاستشارة</span>
        <select name="type" class="input">
          <option>كشف أول مرة</option>
          <option>متابعة عقدة رئوية</option>
          <option>استشارة أولية</option>
          <option>مراجعة نتائج تحاليل وأشعة</option>
        </select>
      </label>
      <p id="form-error" style="color: var(--rose); font-size: 12px; margin: 0;" class="full" role="alert"></p>
      <div class="full" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
        <button class="button secondary" type="button" data-action="close">إلغاء</button>
        <button class="button primary" type="submit">تأكيد حجز الموعد</button>
      </div>
    </form>
  `);

  $('#book-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (role === 'patient') v.patient = patient().id;
    if (db.appointments.some(a => a.status !== 'ملغي' && a.doctor === v.doctor && a.date === v.date && a.time === v.time)) {
      $('#form-error').textContent = 'هذا الموعد محجوز مسبقاً لدى الطبيب. يُرجى اختيار توقيت آخر.';
      return;
    }
    db.appointments.push({ ...v, id: 'A' + Date.now(), status: 'مؤكد' });
    log('حجز موعد استشارة', v.patient);
    closeModal();
    render();
    toast('تم تأكيد حجز الموعد بنجاح.');
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

  const f = $('#encounter-form');
  if (f && draft.order) f.elements.order.value = draft.order;
  f?.addEventListener('input', () => {
    draft = { ...draft, ...Object.fromEntries(new FormData(f)) };
  });

  f?.addEventListener('submit', e => {
    e.preventDefault();
    draft = { ...draft, ...Object.fromEntries(new FormData(f)) };
    if (e.submitter.value === 'approve') {
      modal('مراجعة واعتماد الزيارة السريرية', `
        <div style="font-size: 13px;">
          <p>سيتم تسجيل تقييمك وخطتك في ملف <strong>${esc(patient().name)}</strong> كزيارة معتمدة رسمياً.</p>
          <div style="background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 14px;">
            <strong style="color: var(--primary); display: block; margin-bottom: 4px;">الخطة العلاجية:</strong>
            <p style="margin: 0; font-size: 12.5px;">${esc(draft.plan)}</p>
          </div>
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; cursor: pointer;">
            <input type="checkbox" id="share-plan" style="accent-color: var(--primary);">
            <span>إتاحة تعليمات المتابعة للمريض في بوابته الصحية</span>
          </label>
        </div>
      `, button('تأكيد الاعتماد الطبي', 'confirm-visit', 'primary') + button('العودة للمسودة', 'close', 'secondary'));
    } else {
      persistVisit(false);
    }
  });
}

// Encounter Persistence
function persistVisit(approved) {
  const p = patient();
  const fromWorkspace = location.hash === '#dashboard';
  const share = !!$('#share-plan')?.checked;
  const v = {
    ...draft,
    patient: p.id,
    id: draft.id || 'V' + Date.now(),
    approved,
    date: new Date().toLocaleDateString('ar-EG')
  };

  const idx = db.visits.findIndex(x => x.id === v.id);
  if (idx >= 0) db.visits[idx] = v;
  else db.visits.push(v);

  if (v.order && !db.orders.some(o => o.visit === v.id && o.type === v.order)) {
    db.orders.push({ patient: p.id, visit: v.id, type: v.order, date: v.date });
  }

  if (approved) {
    p.status = 'مكتملة';
    if (share) db.sharedReports.push({ patient: p.id, plan: v.plan, date: v.date });
  } else {
    p.status = 'قيد الزيارة';
  }

  log(approved ? 'اعتماد زيارة سريرية' : 'حفظ مسودة زيارة', p.id);
  workspaceDrafts.delete(p.id);
  draft = {};
  closeModal();
  if (!fromWorkspace) location.hash = 'record/' + p.id;
  render();
  toast(approved ? 'تم اعتماد الزيارة وحفظها بالملف الطبي.' : 'تم حفظ مسودة الزيارة بنجاح.');
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
  if (a === 'book') book();
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
      db.vitals[selected] = Object.fromEntries(new FormData(ev.target));
      log('تسجيل العلامات الحيوية', selected);
      closeModal();
      render();
      toast('تم حفظ وتحديث العلامات الحيوية.');
    });
  }

  if (a === 'confirm-visit') persistVisit(true);

  if (a === 'cancel-booking') {
    modal('إلغاء الموعد المحجوز', `
      <p style="font-size: 13px;">هل أنت متأكد من إلغاء هذا الموعد؟ سيتم تحديث حالته إلى "ملغي" في سجل المواعيد.</p>
    `, button('تأكيد الإلغاء', 'confirm-cancel', 'danger', `data-id="${el.dataset.id}"`) + button('الاحتفاظ بالموعد', 'close', 'secondary'));
  }

  if (a === 'confirm-cancel') {
    const ap = db.appointments.find(x => x.id === el.dataset.id);
    if (ap) {
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
