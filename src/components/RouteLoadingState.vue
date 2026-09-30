<script setup>
defineProps({
  error: { type: Boolean, default: false },
})
</script>

<template>
  <el-result v-if="error" class="route-state route-state-error" icon="error" title="本章暂时无法打开" sub-title="请刷新页面重试，或返回章节索引选择其他内容。" role="status" aria-live="polite" />
  <div v-else class="route-state" role="status" aria-live="polite">
    <span class="eyebrow accent">正在载入</span>
    <h2>正在准备章节内容</h2>
    <p>正文已拆分为独立页面，首次打开本章时按需加载。</p>
    <el-skeleton animated :rows="5" />
  </div>
</template>
