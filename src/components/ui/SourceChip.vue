<script setup>
defineProps({
  label: { type: String, required: true },
  href: { type: String, required: true },
  verifiedAt: { type: String, default: '' },
  variant: { type: String, default: 'muted' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <a
    class="source-chip"
    :class="[`is-${variant}`, { 'is-compact': compact }]"
    :href="href"
    :target="href.startsWith('#') ? undefined : '_blank'"
    rel="noreferrer"
  >
    <span class="source-chip__label">{{ label }}</span>
    <span v-if="verifiedAt" class="source-chip__verified">
      <i aria-hidden="true" />
      核验于 {{ verifiedAt }}
    </span>
    <span class="source-chip__arrow" aria-hidden="true">↗</span>
  </a>
</template>
