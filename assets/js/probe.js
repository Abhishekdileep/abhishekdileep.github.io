/* probe.js — reachability badges for lab services.

   Every element with a data-probe attribute gets checked once per page load:
     data-probe=""        -> stays "planned" (nothing is requested)
     data-probe="https…"  -> one request from the visitor's browser

   The browser does not let this page read a response from another site, so a
   reply of any kind counts as "reachable". It proves something answered at
   that address, not that the model behind it is healthy.
*/
(function () {
  "use strict";
  var TIMEOUT_MS = 7000;
  var cache = {};   // one request per address, even if several badges show it

  function check(url) {
    if (cache[url]) return cache[url];
    var started = performance.now();
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
    cache[url] = fetch(url, { mode: "no-cors", cache: "no-store", signal: ctl.signal })
      .then(function () {
        clearTimeout(timer);
        return { ok: true, ms: Math.round(performance.now() - started) };
      })
      .catch(function () {
        clearTimeout(timer);
        return { ok: false, ms: null };
      });
    return cache[url];
  }

  function paint(el, state, text) {
    el.setAttribute("data-state", state);
    var label = el.querySelector("[data-probe-label]");
    if (label) label.textContent = text;
  }

  var readout = document.querySelector("[data-route-readout]");
  var route = document.querySelector(".route");

  document.querySelectorAll("[data-probe]").forEach(function (el) {
    var url = el.getAttribute("data-probe");
    if (!url) { paint(el, "planned", "planned"); return; }

    paint(el, "checking", "checking");
    check(url).then(function (r) {
      if (r.ok) paint(el, "online", "reachable · " + r.ms + " ms");
      else paint(el, "offline", "offline");

      // the lab page's route diagram reports the first live service
      if (readout && el.hasAttribute("data-probe-primary")) {
        readout.setAttribute("data-state", r.ok ? "online" : "offline");
        readout.textContent = r.ok
          ? "Route is up. My machine answered your browser in " + r.ms + " ms."
          : "No answer from my machine. It is probably switched off; try again later.";
        if (route) route.setAttribute("data-route", r.ok ? "online" : "offline");
      }
    });
  });
})();
