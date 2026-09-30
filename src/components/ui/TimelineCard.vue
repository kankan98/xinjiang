<script setup>
defineProps({
  item: { type: Object, required: true }, // { when, tone, title, detail }
})
</script>

<template>
  <article class="timeline-card" :class="`is-${item.tone}`">
    <span class="timeline-card__head">
      <i
        class="led-dot"
        :class="item.tone === 'success' ? 'ok' : item.tone === 'primary' ? 'info' : ''"
        aria-hidden="true"
      />
      <b class="timeline-card__when readout">{{ item.when }}</b>
    </span>
    <strong>{{ item.title }}</strong>
    <p>{{ item.detail }}</p>
  </article>
</template>
