<script setup>
defineProps({
  tags: { type: Array, default: () => [] },
  label: { type: String, default: '证据标签' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <p class="evidence-tags" :class="{ 'is-compact': compact }" :aria-label="label">
    <span v-for="tag in tags" :key="tag">{{ tag }}</span>
  </p>
</template>
