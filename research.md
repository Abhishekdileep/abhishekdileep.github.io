---
layout: default
title: Research
permalink: /research/
---

# Research

## Publications

{% for pub in site.data.publications %}
<div class="entry">
  <div class="title">{{ pub.title }}</div>
  <div class="meta">{{ pub.authors }}</div>
  <div class="venue">{{ pub.venue }}</div>
  {% if pub.links.size > 0 %}
    <div class="meta">
      {% for link in pub.links %}<a href="{{ link.url }}">{{ link.name }}</a>{% unless forloop.last %} · {% endunless %}{% endfor %}
    </div>
  {% endif %}
</div>
{% endfor %}

## Projects

<div class="entry">
  <div class="title">LLaMA-Omni2.5 — End-to-End Speech-to-Speech Model</div>
  <div class="desc">Coupled a Whisper encoder to a Qwen2.5 LLM for speech-in / speech-out dialogue. CLI inference and evaluation harness.</div>
</div>

<div class="entry">
  <div class="title">Domain Adaptation for Acoustic Scene Classification</div>
  <div class="desc">Compared five adaptation methods on DCASE 2020 Mobile Urban Acoustic Scenes; ~10% accuracy gain over the baseline for cross-device classification.</div>
</div>

<div class="entry">
  <div class="title">Low-Dose to High-Dose CT Image Synthesis</div>
  <div class="desc">GAN-based synthesis of high-dose CT scans from low-dose inputs.</div>
</div>

<div class="entry">
  <div class="title">Quantised Side-Tuning for Parameter-Efficient LLM Fine-Tuning</div>
  <div class="desc">Reduced trainable parameters for LLaMA-7B while preserving task performance.</div>
</div>

## Ongoing

- **Sonar ASC at DRDO–NPOL** — end-to-end classifier for naval sonar data; using the Bellhop underwater acoustic propagation model to synthesise deployment-condition variability for domain-robust training (95% overall accuracy on the current internal benchmark).
- **Second UDA-for-ASC paper** — benchmarking and analysis, targeting ICASSP 2027.
