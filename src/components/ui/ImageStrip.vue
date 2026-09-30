<script setup>
import { nextTick, onMounted, ref } from 'vue'

// 可复用的横向影像条：滚动快照 + 首尾渐变遮罩 + 桌面左右步进。
// 卡片是按钮，点击发出 navigate(file)，许可信息保留在图注内。
defineProps({
  images: { type: Array, required: true }, // [{ image, day, file }]
})

const emit = defineEmits(['navigate'])

const track = ref(null)
const canPrev = ref(false)
const canNext = ref(false)

function updateArrows() {
  const el = track.value
  if (!el) return
  const tolerance = 4
  canPrev.value = el.scrollLeft > tolerance
  canNext.value = el.scrollLeft < el.scrollWidth - el.clientWidth - tolerance
}

function step(direction) {
  const el = track.value
  if (!el) return
  const card = el.querySelector('.image-strip__card')
  const stride = (card?.getBoundingClientRect().width ?? 260) + 16
  el.scrollBy({ left: direction * stride, behavior: 'smooth' })
}

async function scrollToActive() {
  await nextTick()
  updateArrows()
}

onMounted(() => {
  scrollToActive()
  track.value?.addEventListener('scroll', updateArrows, { passive: true })
  window.addEventListener('resize', updateArrows)
})
</script>

<template>
  <div class="image-strip" role="list" aria-label="行程影像速写">
    <div class="image-strip__viewport">
      <div ref="track" class="image-strip__track" tabindex="0" aria-label="横向滚动查看影像">
        <button
          v-for="(item, index) in images"
          :key="`${item.day}-${index}`"
          type="button"
          class="image-strip__card"
          :aria-label="`打开${item.day}章节：${item.image.caption}`"
          @click="emit('navigate', item.file)"
        >
          <span class="image-strip__media">
            <img
              :src="item.image.src"
              :alt="item.image.alt"
              loading="lazy"
              decoding="async"
              :style="{ objectPosition: item.image.cardFocal || '50% 50%' }"
            >
            <span class="image-strip__gradient" aria-hidden="true" />
            <span class="image-strip__credit">{{ item.image.author }} · {{ item.image.license }}</span>
          </span>
          <span class="image-strip__copy">
            <b class="image-strip__day" aria-hidden="true">{{ item.day }}</b>
            <span class="image-strip__place">
              <small>{{ item.image.place }}</small>
              <strong>{{ item.image.caption }}</strong>
            </span>
          </span>
        </button>
      </div>
      <button
        v-if="canPrev"
        type="button"
        class="image-strip__arrow is-prev"
        aria-label="上一张影像"
        @click="step(-1)"
      >‹</button>
      <button
        v-if="canNext"
        type="button"
        class="image-strip__arrow is-next"
        aria-label="下一张影像"
        @click="step(1)"
      >›</button>
    </div>
  </div>
</template>
