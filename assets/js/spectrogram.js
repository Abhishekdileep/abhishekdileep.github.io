/* spectrogram.js — the home page hero.

   Draws one synthetic street scene as a mel spectrogram and lets the visitor
   switch the recording device. Each device is a frequency response (gain in
   dB per mel band) plus a noise floor, applied to the same scene.

   Everything here is made up for illustration: the scene is synthesised below
   and the device curves are invented, not measured from real microphones.

   Layout of this file:
     1. mel scale helpers
     2. the scene (power per time frame and mel band, in dB)
     3. the three devices
     4. rendering (spectrogram + response curve)
     5. wiring (device switch, animation loop)
*/
(function () {
  "use strict";
  var root = document.querySelector("[data-spectrogram]");
  if (!root) return;

  var specCanvas = root.querySelector(".spec-canvas");
  var respCanvas = root.querySelector(".resp-canvas");
  var ticksBox = root.querySelector(".spec-ticks");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. mel scale ---- */
  var T = 420;            // time frames in the looping scene
  var F = 84;             // mel bands
  var F_MIN = 50, F_MAX = 16000;
  function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
  function melToHz(m) { return 700 * (Math.pow(10, m / 2595) - 1); }
  var MEL_LO = hzToMel(F_MIN), MEL_HI = hzToMel(F_MAX);
  function bandToHz(b) { return melToHz(MEL_LO + (MEL_HI - MEL_LO) * b / (F - 1)); }
  function hzToBand(hz) { return (hzToMel(hz) - MEL_LO) / (MEL_HI - MEL_LO) * (F - 1); }
  function log2(x) { return Math.log(x) / Math.LN2; }

  /* ---- 2. the scene ---- */
  var seed = 20261110;
  function rand() {       // small seeded generator so the scene is the same on every visit
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function dbToPower(db) { return Math.pow(10, db / 10); }

  var power = new Float32Array(T * F);
  function add(t, b, db) {
    t = ((Math.round(t) % T) + T) % T; b = Math.round(b);
    if (b >= 0 && b < F) power[t * F + b] += dbToPower(db);
  }
  // a narrow-band component spread over neighbouring bands
  function addTone(t, band, db) {
    for (var d = -2; d <= 2; d++) add(t, Math.round(band) + d, db - 5 * (Math.round(band) + d - band) * (Math.round(band) + d - band));
  }

  var t, b, k;
  // ambience: traffic rumble, strongest at low frequencies, slowly breathing
  for (t = 0; t < T; t++) {
    for (b = 0; b < F; b++) {
      var hz = bandToHz(b);
      var level = -30 - 5.2 * log2(Math.max(hz, 60) / 60);
      level += 3 * Math.sin(2 * Math.PI * (2 * t / T) + b * 0.07);
      level += (rand() - 0.5) * 6;
      power[t * F + b] = dbToPower(level);
    }
  }
  // a car passing: broadband swell plus an engine tone that drops in pitch (Doppler)
  for (t = 60; t < 200; t++) {
    var near = Math.exp(-Math.pow((t - 130) / 26, 2));
    for (b = 0; b < F; b++) {
      add(t, b, -21 - 3.2 * log2(Math.max(bandToHz(b), 80) / 80) + 10 * Math.log10(near + 1e-4) + (rand() - 0.5) * 4);
    }
    var engine = 170 * (1 + 0.07 * Math.tanh((130 - t) / 14));
    for (k = 1; k <= 4; k++) addTone(t, hzToBand(engine * k), -12 - 5 * k + 10 * Math.log10(near + 0.02));
  }
  // a horn: a stack of harmonics
  for (t = 236; t < 272; t++) {
    var attack = Math.min(1, (t - 235) / 3) * Math.min(1, (272 - t) / 4);
    for (k = 1; k <= 9; k++) addTone(t, hzToBand(415 * k), -9 - 2.6 * k + 10 * Math.log10(attack));
  }
  // birds: short high chirps
  for (var c = 0; c < 9; c++) {
    var start = Math.floor(rand() * T), up = rand() > 0.4 ? 1 : -1, base = 4800 + rand() * 2200;
    for (var j = 0; j < 8; j++) addTone(start + j, hzToBand(base * (1 + up * 0.05 * j)), -19 - Math.abs(j - 3.5));
  }
  // footsteps: regular broadband clicks
  for (t = 300; t < 400; t += 13) {
    for (var decay = 0; decay < 4; decay++) {
      for (b = Math.floor(hzToBand(140)); b < hzToBand(3200); b++) add(t + decay, b, -24 - 5 * decay - 2.2 * log2(bandToHz(b) / 140) + (rand() - 0.5) * 5);
    }
  }
  var sceneDb = new Float32Array(T * F);
  for (var i = 0; i < T * F; i++) sceneDb[i] = 10 * Math.log10(power[i]);
  var grain = new Float32Array(T * F);                // fixed texture for device noise floors
  for (i = 0; i < T * F; i++) grain[i] = (rand() - 0.5) * 5;

  /* ---- 3. the devices ---- */
  function bump(hz, centre, widthOct) { var d = log2(hz / centre) / widthOct; return Math.exp(-0.5 * d * d); }
  var DEVICES = {
    A: {    // reference: flat, quiet
      floor: -84,
      gain: function () { return 0; }
    },
    B: {    // thin low end, presence peak, soft top
      floor: -66,
      gain: function (hz) {
        return -12 * Math.max(0, log2(220 / hz)) + 6 * bump(hz, 3500, 0.5) - 18 * Math.max(0, log2(hz / 9000));
      }
    },
    C: {    // band-limited and noisy
      floor: -55,
      gain: function (hz) {
        return -18 * Math.max(0, log2(450 / hz)) - 2.5 * Math.max(0, log2(hz / 1000))
          - 9 * bump(hz, 2200, 0.18) - 30 * Math.max(0, log2(hz / 6500));
      }
    }
  };
  Object.keys(DEVICES).forEach(function (name) {
    var curve = new Float32Array(F);
    for (var band = 0; band < F; band++) curve[band] = DEVICES[name].gain(bandToHz(band));
    DEVICES[name].curve = curve;
  });

  // what is currently shown; eases toward the selected device
  var shownCurve = Float32Array.from(DEVICES.A.curve), shownFloor = DEVICES.A.floor;
  var fromCurve = shownCurve, fromFloor = shownFloor, target = DEVICES.A, blendStart = -1;
  var BLEND_MS = 520;

  /* ---- 4. rendering ---- */
  // colour ramp: deep navy -> blue -> teal -> amber -> pale
  var STOPS = [[0, 12, 26, 48], [0.3, 27, 68, 112], [0.55, 44, 140, 153], [0.8, 232, 145, 43], [1, 252, 233, 190]];
  var LUT = new Uint8ClampedArray(256 * 3);
  for (i = 0; i < 256; i++) {
    var x = i / 255, s = 0;
    while (s < STOPS.length - 2 && x > STOPS[s + 1][0]) s++;
    var lo = STOPS[s], hi = STOPS[s + 1], u = (x - lo[0]) / (hi[0] - lo[0]);
    for (k = 0; k < 3; k++) LUT[i * 3 + k] = lo[k + 1] + (hi[k + 1] - lo[k + 1]) * u;
  }
  var DB_LO = -82, DB_HI = -16;

  var buffer = document.createElement("canvas");       // the scene at native T x F resolution
  buffer.width = T; buffer.height = F;
  var bufferCtx = buffer.getContext("2d");
  var image = bufferCtx.createImageData(T, F);

  function paintBuffer() {
    for (var tt = 0; tt < T; tt++) {
      for (var bb = 0; bb < F; bb++) {
        var idx = tt * F + bb;
        var db = Math.max(sceneDb[idx] + shownCurve[bb], shownFloor + grain[idx]);
        var v = Math.round(255 * Math.min(1, Math.max(0, (db - DB_LO) / (DB_HI - DB_LO))));
        var px = ((F - 1 - bb) * T + tt) * 4;           // low frequencies at the bottom
        image.data[px] = LUT[v * 3]; image.data[px + 1] = LUT[v * 3 + 1]; image.data[px + 2] = LUT[v * 3 + 2]; image.data[px + 3] = 255;
      }
    }
    bufferCtx.putImageData(image, 0, 0);
  }

  function fit(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return dpr;
  }

  var scroll = 0;                                       // in scene frames
  function drawSpectrogram() {
    fit(specCanvas);
    var ctx = specCanvas.getContext("2d"), w = specCanvas.width, h = specCanvas.height;
    var sceneWidth = Math.max(w, h * 3.4);              // keep the scene from being squashed on wide screens
    var offset = (scroll / T) * sceneWidth;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buffer, -offset, 0, sceneWidth, h);
    ctx.drawImage(buffer, sceneWidth - offset, 0, sceneWidth, h);
  }

  function drawResponse() {
    var dpr = fit(respCanvas);
    var ctx = respCanvas.getContext("2d"), w = respCanvas.width, h = respCanvas.height;
    var GAIN_LO = -36, GAIN_HI = 12;
    function gx(db) { return (Math.min(GAIN_HI, Math.max(GAIN_LO, db)) - GAIN_LO) / (GAIN_HI - GAIN_LO) * w; }
    function by(band) { return h - (band + 0.5) / F * h; }
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#35507c"; ctx.lineWidth = dpr; ctx.setLineDash([3 * dpr, 4 * dpr]);   // 0 dB reference
    ctx.beginPath(); ctx.moveTo(gx(0), 0); ctx.lineTo(gx(0), h); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.moveTo(gx(0), by(0));
    for (var band = 0; band < F; band++) ctx.lineTo(gx(shownCurve[band]), by(band));
    ctx.lineTo(gx(0), by(F - 1)); ctx.closePath();
    ctx.fillStyle = "rgba(232,145,43,0.16)"; ctx.fill();

    ctx.beginPath();
    for (band = 0; band < F; band++) {
      if (band === 0) ctx.moveTo(gx(shownCurve[band]), by(band)); else ctx.lineTo(gx(shownCurve[band]), by(band));
    }
    ctx.strokeStyle = "#e8912b"; ctx.lineWidth = 2 * dpr; ctx.lineJoin = "round"; ctx.stroke();

    ctx.fillStyle = "#9fb3d1";
    ctx.font = (9 * dpr) + "px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("0", gx(0), h - 8 * dpr);
    ctx.fillText("−24", gx(-24), h - 8 * dpr);
  }

  // frequency tick labels, placed on the mel axis
  [100, 500, 2000, 8000].forEach(function (hz) {
    var el = document.createElement("span");
    el.textContent = hz >= 1000 ? (hz / 1000) + " kHz" : hz + " Hz";
    el.style.bottom = (hzToBand(hz) + 0.5) / F * 100 + "%";
    ticksBox.appendChild(el);
  });

  /* ---- 5. wiring ---- */
  function select(name) {
    fromCurve = Float32Array.from(shownCurve); fromFloor = shownFloor;
    target = DEVICES[name];
    if (reduceMotion) { shownCurve = Float32Array.from(target.curve); shownFloor = target.floor; paintBuffer(); drawSpectrogram(); drawResponse(); return; }
    blendStart = performance.now();
  }
  root.querySelectorAll('input[name="device"]').forEach(function (input) {
    input.addEventListener("change", function () { if (input.checked) select(input.value); });
  });

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(specCanvas);
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(100, now - last); last = now;
    if (visible) {
      if (blendStart >= 0) {
        var p = Math.min(1, (now - blendStart) / BLEND_MS);
        var e = p * p * (3 - 2 * p);
        for (var band = 0; band < F; band++) shownCurve[band] = fromCurve[band] + (target.curve[band] - fromCurve[band]) * e;
        shownFloor = fromFloor + (target.floor - fromFloor) * e;
        paintBuffer(); drawResponse();
        if (p >= 1) blendStart = -1;
      }
      scroll = (scroll + dt * 0.012) % T;               // about 12 frames per second
      drawSpectrogram();
    }
    requestAnimationFrame(frame);
  }

  paintBuffer(); drawSpectrogram(); drawResponse();
  window.addEventListener("resize", function () { drawSpectrogram(); drawResponse(); });
  if (!reduceMotion) requestAnimationFrame(frame);
})();
