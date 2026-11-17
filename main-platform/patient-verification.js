'use strict';

// A local demonstration for the built-in example account. Production codes
// must be issued and validated by an authenticated service.
function patientVerificationPage() {
  document.body.dataset.surface='patient-verify';
  document.title='استعادة الدخول | '+hospitalProfile().name;
  $('#app').innerHTML=`<main class="patient-verification">
    ${logo()}
    <section class="patient-verification-card" id="patient-recovery-phone">
    <h1>نسيت كلمة المرور؟</h1><p>أدخل رقم الهاتف المسجل لطلب رمز التحقق.</p>
    <form id="patient-code-request">
      ${field('رقم الهاتف','identifier','','tel','required maxlength="24" dir="ltr" autocomplete="tel"')}
      <p class="form-error" role="alert"></p><button type="submit" class="button primary">إرسال رمز التحقق</button>
    </form><p>رقم حساب العرض للتجربة <bdi>01000001024</bdi>.</p>
    ${link('العودة لتسجيل الدخول','login/patient','secondary patient-recovery-return')}</section>
    <section class="patient-verification-card" id="patient-recovery-code" hidden>
    <h1>أدخل رمز التحقق</h1><p id="patient-code-status" role="status"></p>
    <form id="patient-code-form"><fieldset disabled>
      <legend class="patient-sr-only">رمز التحقق المكوّن من 6 أرقام</legend>
      <div class="patient-code-fields" dir="ltr">${Array.from({length:6},(_,i)=>`<input class="input" inputmode="numeric"
        aria-label="الرقم ${i+1}" maxlength="1" required ${i===0?'autocomplete="one-time-code"':''}>`).join('')}</div>
      <p class="form-error" role="alert"></p><button type="submit" class="button primary">تأكيد</button>
    </fieldset></form><button class="patient-inline-link" type="button" id="patient-code-resend" disabled>إعادة الإرسال</button>
    <button class="patient-inline-link" type="button" id="patient-change-recovery-phone">تعديل رقم الهاتف</button>
    ${link('العودة لتسجيل الدخول','login/patient','secondary patient-recovery-return')}</section></main>`;

  const request=$('#patient-code-request'), form=$('#patient-code-form'), resend=$('#patient-code-resend');
  const digits=[...form.querySelectorAll('input')];
  const phoneStep=$('#patient-recovery-phone'), codeStep=$('#patient-recovery-code');
  const phoneInput=request.elements.identifier;
  let challenge;
  let timer;
  const normalize=value=>value.replace(/[٠-٩۰-۹]/g,char=>String(char.charCodeAt(0)-(char<='٩'?1632:1776)));
  const digitsOnly=value=>normalize(value).replace(/\D/g,'');
  function send() {
    if (challenge&&Date.now()<challenge.retryAt) return;
    const identifier=normalize(phoneInput.value).trim().replace(/[\s()-]/g,'').replace(/^(?:\+20|0020)(?=1)/,'0');
    db=readLocalDatabase()||db;
    const person=db.patients.find(row=>row.id==='CL-1024');
    if (!/^\d{11}$/.test(identifier)||!person||db.credentials?.[person.id]||person.phone!==identifier) {
      (codeStep.hidden?request:form).querySelector('[role=alert]').textContent='راجع الرقم. استعادة الدخول متاحة لحساب العرض في المعاينة.';
      return;
    }
    request.querySelector('[role=alert]').textContent='';
    form.querySelector('[role=alert]').textContent='';
    const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
    challenge={id:person.id,code,expiresAt:Date.now()+300000,retryAt:Date.now()+45000,attempts:0};
    phoneStep.hidden=true;
    codeStep.hidden=false;
    document.title='رمز التحقق | '+hospitalProfile().name;
    $('#patient-code-status').textContent='رمز العرض '+code+' · يظهر هنا للتجربة المحلية';
    form.querySelector('fieldset').disabled=false;
    form.reset();
    digits[0].focus();
    clearInterval(timer);
    const update=()=>{
      if (!request.isConnected) { clearInterval(timer);return; }
      const seconds=Math.max(0,Math.ceil((challenge.retryAt-Date.now())/1000));
      resend.textContent=seconds?'إعادة الإرسال بعد '+seconds+' ثانية':'إعادة الإرسال';
      resend.disabled=seconds>0;
      if (!seconds) clearInterval(timer);
    };
    timer=setInterval(update,1000);
    update();
  }
  request.addEventListener('submit',event=>{event.preventDefault();send();});
  resend.addEventListener('click',send);
  $('#patient-change-recovery-phone').addEventListener('click',()=>{
    clearInterval(timer);
    challenge=null;
    codeStep.hidden=true;
    form.querySelector('fieldset').disabled=true;
    phoneStep.hidden=false;
    document.title='استعادة الدخول | '+hospitalProfile().name;
    phoneInput.focus();
  });
  digits.forEach((input,i)=>{
    input.addEventListener('input',()=>{input.value=digitsOnly(input.value).slice(-1);if(input.value)digits[i+1]?.focus();});
    input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value)digits[i-1]?.focus();});
    input.addEventListener('paste',event=>{
      const value=digitsOnly(event.clipboardData.getData('text')).slice(0,6);
      if(value.length<2)return;
      event.preventDefault();
      digits.forEach((node,index)=>node.value=value[index]||'');
      digits[Math.min(value.length,5)].focus();
    });
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const error=form.querySelector('[role=alert]');
    if (!challenge||Date.now()>=challenge.expiresAt||challenge.attempts>=5) {
      error.textContent='انتهت صلاحية الرمز. اطلب رمزًا جديدًا.';return;
    }
    challenge.attempts++;
    if(digits.map(node=>node.value).join('')!==challenge.code) {error.textContent='رمز التحقق غير صحيح.';return;}
    const id=challenge.id;
    challenge=null;
    clearInterval(timer);
    db=readLocalDatabase()||db;
    if (!db.patients.some(row=>row.id===id)||db.credentials?.[id]) {error.textContent='استخدم كلمة المرور لهذا الحساب.';return;}
    demoSession={role:'patient',patientId:id};
    try {
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(demoSession));
      localStorage.removeItem(REMEMBER_KEY);
    } catch {}
    location.hash='portal';
  });
}
