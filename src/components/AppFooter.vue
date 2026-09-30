<script setup>
defineProps({
  version: String,
  plannedDrivingDistanceKm: Number,
  isPartial: Boolean,
})
defineEmits(['navigate'])
</script>

<template>
  <footer class="site-footer">
    <div class="footer-brand">
      <strong class="footer-wordmark">北疆路书 · AUTUMN 2026</strong>
      <span class="footer-meta">{{ version }}</span>
      <el-button text class="text-btn" @click="$emit('navigate', '专题-新疆摄影地图.md')">打开摄影地图 <span>↗</span></el-button>
    </div>
    <div class="footer-odo">
      <span class="footer-odo__label">{{ isPartial ? '已测分段 · 未计D7伊宁进镇导行，不是全程' : '计划自驾 · 含D7绕行预算与条件段' }}</span>
      <span class="footer-odo__value readout">≈ {{ plannedDrivingDistanceKm.toLocaleString('en-US') }} KM</span>
    </div>
  </footer>
</template>
