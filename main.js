/* Zupkeep site interactions. No dependencies. */
(function () {
  'use strict';
  var doc = document;
  doc.documentElement.classList.add('js');

  /* Header border on scroll */
  var header = doc.querySelector('.header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Mobile menu */
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.getElementById('site-nav');
  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 820) setMenu(false); });
  }

  /* FAQ accordion */
  doc.querySelectorAll('.faq__q').forEach(function (btn) {
    var panel = doc.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* Section reveal: content stays readable if this never runs */
  var items = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('is-in'); }); }

  /* Conversion tracking: one event name per CTA, pushed to dataLayer for GA4, GTM or GHL */
  window.dataLayer = window.dataLayer || [];
  function track(name, detail) {
    var payload = Object.assign({ event: name, page: location.pathname }, detail || {});
    window.dataLayer.push(payload);
    doc.dispatchEvent(new CustomEvent('zupkeep:track', { detail: payload }));
  }
  doc.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { placement: el.getAttribute('data-placement') || '' });
  });

  /* Lead forms: validate, build a flat JSON payload, POST to data-endpoint when one is set.
     Works with GoHighLevel inbound webhooks, Zapier, Make, Airtable or any JSON endpoint. */
  doc.querySelectorAll('form[data-lead-form]').forEach(function (form) {
    var status = form.querySelector('.form__status');
    function setError(input, msg) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      var slot = doc.getElementById(input.id + '-error');
      if (slot) slot.textContent = msg || '';
    }
    function validate(input) {
      if (input.type === 'checkbox' && input.required && !input.checked) { setError(input, 'Please check this box to continue.'); return false; }
      if (input.required && !input.value.trim()) { setError(input, 'This field is required.'); return false; }
      if (input.type === 'email' && input.value && !/^\S+@\S+\.\S+$/.test(input.value)) { setError(input, 'Enter an email like name@example.com.'); return false; }
      if (input.type === 'tel' && input.value && input.value.replace(/\D/g, '').length < 10) { setError(input, 'Enter a 10 digit phone number.'); return false; }
      if (input.name === 'zip' && input.value && !/^\d{5}$/.test(input.value)) { setError(input, 'Enter a 5 digit ZIP code.'); return false; }
      setError(input, ''); return true;
    }
    form.addEventListener('blur', function (e) { if (e.target.matches('input, select, textarea') && e.target.id) validate(e.target); }, true);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      form.querySelectorAll('input[id], select[id], textarea[id]').forEach(function (i) {
        if (i.name === 'service_needed') return;
        if (!validate(i)) { ok = false; first = first || i; }
      });
      if (!ok) { first.focus(); return; }
      var data = {}; var fd = new FormData(form);
      fd.forEach(function (v, k) { data[k] = data[k] ? data[k] + ', ' + v : v; });
      data.form_name = form.getAttribute('data-lead-form');
      data.submitted_at = new Date().toISOString();
      var endpoint = form.getAttribute('data-endpoint');
      var done = function (sent) {
        track(form.getAttribute('data-track-submit') || 'form_submit', { form: data.form_name });
        if (status) { status.hidden = false; status.textContent = sent ? 'Thanks. We have your request and will call you at the time you chose.' : 'Prototype mode: the form validated, but no endpoint is connected yet, so nothing was sent.'; status.focus(); }
        if (sent) form.reset();
      };
      if (!endpoint) { done(false); return; }
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(); done(true); })
        .catch(function () { if (status) { status.hidden = false; status.textContent = 'We could not send your request. Please call (945) 468-2622 and we will take it by phone.'; } });
    });
  });
})();
