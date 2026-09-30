<script setup>
// 复用型「证据口径」图章：把时间戳 / 证据组数等可信事实渲染为统一格式的图章组。
// 单元格 className 透传，便于各板块沿用既有视觉（如 intelligence-freshness / intelligence-evidence）。
defineProps({
  cells: { type: Array, required: true }, // [{ key, ariaLabel, label, value, detail, className }]
})
</script>

<template>
  <dl class="trust-stamp">
    <div
      v-for="cell in cells"
      :key="cell.key"
      :class="cell.className"
      :aria-label="cell.ariaLabel || cell.label"
    >
      <dt>{{ cell.label }}</dt>
      <dd>
        <strong>{{ cell.value }}</strong>
        <small v-if="cell.detail">{{ cell.detail }}</small>
      </dd>
    </div>
  </dl>
</template>
