<script setup>
defineProps({
  image: { type: Object, required: true },
  variant: { type: String, default: 'hero' },
  eager: { type: Boolean, default: false },
  assetId: { type: String, default: '' },
})

defineEmits(['credit'])
</script>

<template>
  <figure v-if="variant === 'hero'" class="hero-media" :data-asset="assetId || undefined">
    <div class="hero-image-wrap">
      <img
        :src="image.src"
        :alt="image.alt"
        :width="image.width"
        :height="image.height"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : 'auto'"
        decoding="async"
        :style="{ objectPosition: image.heroFocal || '50% 50%' }"
      >
    </div>
    <figcaption class="media-meta">
      <span class="media-caption">
        <small>{{ image.place.toUpperCase() }}</small>
        <strong>{{ image.caption }}</strong>
      </span>
      <el-button link class="media-credit" :aria-label="`查看照片来源与许可：${image.author}，${image.license}`" @click="$emit('credit')">
        摄影 {{ image.author }} · 许可详情
      </el-button>
    </figcaption>
  </figure>

  <figure v-else class="reader-media" :data-asset="assetId || undefined">
    <img
      :src="image.src"
      :alt="image.alt"
      :width="image.width"
      :height="image.height"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      :style="{ objectPosition: image.heroFocal || '50% 50%' }"
    >
    <figcaption>
      <strong>{{ image.place }}</strong>
      <span>{{ image.caption }}</span>
      <small>
        {{ image.author }} ·
        <a :href="image.licenseUrl" target="_blank" rel="noreferrer">{{ image.license }}</a> ·
        <el-button link class="credit-link" @click="$emit('credit')">许可详情</el-button>
      </small>
    </figcaption>
  </figure>
</template>
