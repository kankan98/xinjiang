<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  headingId: { type: String, default: undefined },
  headingTag: { type: String, default: 'h2' },
  compact: { type: Boolean, default: false },
  tone: { type: String, default: 'default' },
})
</script>

<template>
  <header class="section-heading" :class="[`is-${tone}`, { 'is-compact': compact }]">
    <div class="section-heading__copy">
      <span v-if="eyebrow" class="section-heading__eyebrow">{{ eyebrow }}</span>
      <component :is="headingTag" :id="headingId" class="section-heading__title">{{ title }}</component>
      <p v-if="description" class="section-heading__description">{{ description }}</p>
    </div>
    <div v-if="$slots.meta || $slots.actions" class="section-heading__aside">
      <slot name="meta" />
      <div v-if="$slots.actions" class="section-heading__actions"><slot name="actions" /></div>
    </div>
  </header>
</template>
