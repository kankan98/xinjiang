<script setup>
defineProps({
  item: { type: Object, required: true }, // { place, title, meta, action }
})
</script>

<template>
  <article class="intelligence-card">
    <span>{{ item.place }}</span>
    <h4>{{ item.title }}</h4>
    <small>{{ item.meta }}</small>
    <p>{{ item.action }}</p>
  </article>
</template>
