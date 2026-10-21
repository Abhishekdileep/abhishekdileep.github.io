---
layout: default
title: Talks
permalink: /talks/
---

# Talks

{% for talk in site.data.talks %}
<div class="entry">
  <div class="title">{{ talk.title }}</div>
  <div class="meta">
    {{ talk.venue }}{% if talk.date and talk.date != "TODO" %} · {{ talk.date | date: "%b %Y" }}{% endif %}
  </div>

  {% if talk.abstract %}<div class="desc">{{ talk.abstract }}</div>{% endif %}

  {% if talk.youtube_id and talk.youtube_id != "" %}
  <div class="video-embed">
    <iframe
      src="https://www.youtube-nocookie.com/embed/{{ talk.youtube_id }}"
      title="{{ talk.title | escape }}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  {% endif %}

  {% if talk.slides_url and talk.slides_url != "" %}
  <div class="meta"><a href="{{ talk.slides_url | relative_url }}">slides (PDF) ↓</a></div>
  {% endif %}
</div>
{% endfor %}
