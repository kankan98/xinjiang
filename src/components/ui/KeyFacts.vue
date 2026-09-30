<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '关键信息' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <dl class="key-facts" :class="{ 'is-compact': compact }" :aria-label="ariaLabel">
    <div v-for="item in items" :key="item.key || item.label" class="key-fact" :class="item.tone ? `is-${item.tone}` : undefined">
      <dt>{{ item.label }}</dt>
      <dd>
        <strong>{{ item.value }}</strong>
        <small v-if="item.detail">{{ item.detail }}</small>
      </dd>
    </div>
  </dl>
</template>
