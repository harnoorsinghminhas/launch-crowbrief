/* Crow Brief · crowbrief.com
   No innerHTML anywhere: the page runs under require-trusted-types-for 'script'.
   Sign-up posts exactly the fields the SI network pages send: email, hp, site, landing_path, tz, query. */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

var API = "https://acp9reat3l.execute-api.us-east-1.amazonaws.com/signal/request-link";
var SITE = "crowbrief.com";
var LANDING_RE = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]{0,199}$/;
var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

function validEmail(v) { return v.length <= 254 && EMAIL_RE.test(v); }
function payload(email, hp) {
  var b = { email: email, hp: hp || "", site: SITE };
  if (LANDING_RE.test(location.pathname)) b.landing_path = location.pathname;
  try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && tz.length <= 40) b.tz = tz; } catch (e) { /* the API falls back */ }
  var q = location.search;
  if (q && q.length <= 2048 && /[?&](utm_[a-z]+|ref)=/i.test(q)) b.query = q;
  return b;
}
function post(body) {
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = ctl ? window.setTimeout(function () { ctl.abort(); }, 15000) : 0;
  return fetch(API, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { window.clearTimeout(timer); return { status: r.status, code: j && j.error }; }); },
          function () { window.clearTimeout(timer); return { status: 0, code: "network" }; });
}
function errText(res) {
  var s = res.status, c = res.code;
  if (s === 400 && c === "invalid_email") return "That email address doesn't look right. Check it for a typo?";
  if (s === 400) return "Something in the form didn't go through. Please try again.";
  if (s === 415) return "Your browser sent the form in a format we can't read. Refresh the page and try again.";
  if (s === 429) return "Lots of sign-ups from your network just now. Wait a minute, then try again.";
  if (s === 403) return "Sign-up only works on our own site. Open crowbrief.com and try again.";
  if (s >= 500) return "Our sign-up desk hit a snag. Please try again in a moment.";
  return "We couldn't reach the sign-up desk. Check your connection and try again.";
}

$$(".js-join").forEach(function (form) {
  var em = $('input[type="email"]', form), hp = $('input[name="website"]', form), err = $(".js-err", form);
  var btn = $('button[type="submit"]', form), ok = $(".js-ok", form.parentNode), busy = false;
  em.addEventListener("blur", function () {
    var v = em.value.trim();
    if (v && !validEmail(v)) { err.textContent = "That email address doesn't look right yet."; em.setAttribute("aria-invalid", "true"); }
    else { err.textContent = ""; em.removeAttribute("aria-invalid"); }
  });
  em.addEventListener("input", function () {
    if (em.getAttribute("aria-invalid") && validEmail(em.value.trim())) { err.textContent = ""; em.removeAttribute("aria-invalid"); }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var v = em.value.trim();
    if (!validEmail(v)) { err.textContent = "Please enter your email address, like name@example.com."; em.setAttribute("aria-invalid", "true"); em.focus(); return; }
    busy = true; btn.disabled = true; var label = btn.textContent; btn.textContent = "Sending…"; err.textContent = "";
    post(payload(v, hp ? hp.value : "")).then(function (res) {
      busy = false; btn.disabled = false; btn.textContent = label;
      if (res.status === 200) {
        form.hidden = true;
        if (ok) { $(".js-ok-email", ok).textContent = v; ok.hidden = false; $(".js-ok-h", ok).focus(); }
        return;
      }
      err.textContent = errText(res);
      if (res.code === "invalid_email") { em.setAttribute("aria-invalid", "true"); em.focus(); }
    });
  });
});

/* ---------- reservation / purchase preview dialog (Stripe connects here later; nothing is charged) ---------- */
var dlg = $("#dlg"), lastBtn = null;
function openDlg() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
$$("[data-dlg]").forEach(function (b) {
  b.addEventListener("click", function () {
    lastBtn = b;
    $("#dlg-h").textContent = b.getAttribute("data-title");
    $("#dlg-price").textContent = b.getAttribute("data-price");
    $("#dlg-line").textContent = b.getAttribute("data-line");
    $("#dlg-pay").textContent = b.getAttribute("data-pay");
    $("#dlg-status").textContent = "";
    openDlg();
  });
});
$("#dlg-pay").addEventListener("click", function () {
  $("#dlg-status").textContent = "Preview build: Stripe's hosted checkout connects here (test mode first). No payment was taken.";
});
$("#dlg-close").addEventListener("click", closeDlg);
dlg.addEventListener("close", function () { if (lastBtn) lastBtn.focus(); });
})();
