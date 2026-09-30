<script setup>
defineProps({ images: Object, open: Boolean })
defineEmits(['update:open'])
</script>

<template>
  <section class="image-credits" aria-label="图片来源与许可">
    <div class="image-credits-head">
      <span class="aside-label">图片来源与许可</span>
      <span class="disclosure-count">{{ Object.keys(images).length }} 张已署名影像</span>
    </div>
    <div class="credits-grid">
      <article v-for="(asset, id) in images" :id="`credit-${id}`" :key="id" class="credit-item">
        <strong>{{ asset.place }}</strong><span>{{ asset.caption }}</span>
        <small>
          来源：{{ asset.author }} ·
          <template v-if="asset.sourceUrl"><a :href="asset.sourceUrl" target="_blank" rel="noreferrer">原始作品页</a> · </template>
          <a v-if="asset.licenseUrl" :href="asset.licenseUrl" target="_blank" rel="noreferrer">{{ asset.license }}</a><span v-else>{{ asset.license }}</span>
          <br>{{ asset.modified }}
        </small>
      </article>
    </div>
  </section>
</template>
