---
title: "PDE Solutions as a Service — 1D Burgers"
short: "PDE solver, 1D Burgers"
order: 1
status: live            # live | planned
service_url: "https://inkl-2023.tail355f98.ts.net/"
summary: "Neural solvers for the 1D viscous Burgers equation, compared against a classical spectral solve."
stack: ["FNO", "PINTO", "PDEBench"]
repo: ""                # link to the code when it is public
preview: burgers        # shows the in-browser Burgers preview
embed: false            # true puts the live app in a frame on this page
---

The service solves the 1D viscous Burgers equation, u<sub>t</sub> + u u<sub>x</sub> = ν u<sub>xx</sub>.

You choose a neural solver, FNO (supervised, one-shot field prediction) or PINTO
(physics-informed, with cross-attention), and an input: your own initial
condition as a sum of sines, or a PDEBench test case. The page reports inference
time and the relative L2 error against a classical spectral solve.

<!-- TODO (Abhishek): training setup, what the error numbers look like, what you learned. -->
