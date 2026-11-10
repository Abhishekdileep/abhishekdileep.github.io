/* burgers.js — a small viscous Burgers solve for the lab preview.

     u_t + u u_x = nu u_xx      on a periodic domain [0, 2*pi)

   Finite differences: Rusanov (local Lax-Friedrichs) flux for the advection
   term, central differences for diffusion, forward Euler in time. It is a toy
   for the card, not the solver behind the service.
*/
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-burgers]").forEach(function (root) {
    var canvas = root.querySelector("canvas");
    var button = root.querySelector("[data-burgers-reset]");
    var ctx = canvas.getContext("2d");

    var N = 240, NU = 0.012, L = 2 * Math.PI, DX = L / N;
    var u = new Float64Array(N), next = new Float64Array(N), flux = new Float64Array(N);
    var u0 = new Float64Array(N);      // initial condition, kept for the ghost line
    var trail = [];                    // a few earlier profiles
    var time = 0, frames = 0;

    function init() {
      var k, i, peak = 0;
      var amp = [], phase = [];
      for (k = 1; k <= 3; k++) { amp.push((Math.random() * 2 - 1) / k); phase.push(Math.random() * L); }
      for (i = 0; i < N; i++) {
        var x = i * DX, v = 0;
        for (k = 1; k <= 3; k++) v += amp[k - 1] * Math.sin(k * x + phase[k - 1]);
        u[i] = v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      for (i = 0; i < N; i++) { u[i] /= peak; u0[i] = u[i]; }   // normalise to |u| <= 1
      trail = []; time = 0; frames = 0;
    }

    function step(dt) {
      var i, a, b, speed;
      for (i = 0; i < N; i++) {          // flux at the face between i and i+1
        a = u[i]; b = u[(i + 1) % N];
        speed = Math.max(Math.abs(a), Math.abs(b));
        flux[i] = 0.25 * (a * a + b * b) - 0.5 * speed * (b - a);
      }
      for (i = 0; i < N; i++) {
        var left = u[(i - 1 + N) % N], right = u[(i + 1) % N];
        next[i] = u[i]
          - dt / DX * (flux[i] - flux[(i - 1 + N) % N])
          + NU * dt / (DX * DX) * (right - 2 * u[i] + left);
      }
      var swap = u; u = next; next = swap;
      time += dt;
    }

    function advance(span) {
      var done = 0;
      while (done < span) {
        var peak = 1e-6;
        for (var i = 0; i < N; i++) if (Math.abs(u[i]) > peak) peak = Math.abs(u[i]);
        // stability: advection CFL and the explicit diffusion limit
        var dt = Math.min(0.4 * DX / peak, 0.4 * DX * DX / NU, span - done);
        step(dt);
        done += dt;
      }
    }

    function line(values, color, width, dash) {
      var w = canvas.width, h = canvas.height;
      ctx.beginPath();
      for (var i = 0; i <= N; i++) {
        var x = i / N * w;
        var y = h / 2 - values[i % N] * h * 0.4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function draw() {
      var dpr = window.devicePixelRatio || 1;
      var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "#22375a"; ctx.lineWidth = dpr;           // u = 0 axis
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      line(u0, "#5f789f", dpr, [4 * dpr, 5 * dpr]);                 // initial condition
      trail.forEach(function (p, j) {
        line(p, "rgba(232,145,43," + (0.12 + 0.1 * j) + ")", dpr);
      });
      line(u, "#e8912b", 2 * dpr);                                  // current solution

      ctx.fillStyle = "#9fb3d1";
      ctx.font = (10 * dpr) + "px ui-monospace, Menlo, Consolas, monospace";
      ctx.fillText("u(x, t)   t = " + time.toFixed(2) + "   ν = " + NU, 10 * dpr, 16 * dpr);
      ctx.fillText("dashed: initial condition", 10 * dpr, h - 9 * dpr);
    }

    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(canvas);
    }

    function tick() {
      if (visible) {
        advance(0.012);
        frames++;
        if (frames % 22 === 0) { trail.push(Float64Array.from(u)); if (trail.length > 4) trail.shift(); }
        if (time > 7) init();            // start over once the wave has diffused away
        draw();
      }
      requestAnimationFrame(tick);
    }

    button.addEventListener("click", function () {
      init();
      if (reduceMotion) { advance(0.8); draw(); }
    });
    window.addEventListener("resize", draw);

    init();
    if (reduceMotion) { advance(0.8); draw(); }   // one still frame showing a steepened wave
    else requestAnimationFrame(tick);
  });
})();
