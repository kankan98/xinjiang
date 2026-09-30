<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { Close, FullScreen, ScaleToOriginal, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import travelLineUrl from '../../assets/images/travel-line.png'

const previewOpen = ref(false)
const previewTrigger = ref(null)
let removePinchZoom = null

function touchDistance(touches) {
  const [first, second] = touches
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

function installPinchZoom() {
  removePinchZoom?.()

  const toolbar = document.querySelector('.route-map-viewer__toolbar')
  const viewer = toolbar?.closest('.el-image-viewer__wrapper')
  if (!viewer) return

  viewer.classList.add('route-map-viewer')
  viewer.setAttribute('role', 'dialog')
  viewer.setAttribute('aria-modal', 'true')
  viewer.setAttribute('aria-label', '北疆自驾线路图全屏预览')

  let previousDistance = 0

  const handleTouchStart = (event) => {
    if (event.touches.length !== 2) return
    previousDistance = touchDistance(event.touches)
    event.preventDefault()
  }

  const handleTouchMove = (event) => {
    if (event.touches.length !== 2 || !previousDistance) return

    const nextDistance = touchDistance(event.touches)
    if (Math.abs(nextDistance - previousDistance) < 12) return

    viewer.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: nextDistance > previousDistance ? -100 : 100,
    }))
    previousDistance = nextDistance
    event.preventDefault()
  }

  const handleTouchEnd = () => {
    previousDistance = 0
  }

  viewer.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
  viewer.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
  viewer.addEventListener('touchend', handleTouchEnd, { capture: true })
  viewer.addEventListener('touchcancel', handleTouchEnd, { capture: true })

  removePinchZoom = () => {
    viewer.removeEventListener('touchstart', handleTouchStart, true)
    viewer.removeEventListener('touchmove', handleTouchMove, true)
    viewer.removeEventListener('touchend', handleTouchEnd, true)
    viewer.removeEventListener('touchcancel', handleTouchEnd, true)
    removePinchZoom = null
  }
}

async function openPreview() {
  previewOpen.value = true
  await nextTick()
  installPinchZoom()
}

async function closePreview() {
  removePinchZoom?.()
  previewOpen.value = false
  await nextTick()
  previewTrigger.value?.focus({ preventScroll: true })
}

onBeforeUnmount(() => removePinchZoom?.())
</script>

<template>
  <figure class="geo-map">
    <button
      ref="previewTrigger"
      type="button"
      class="geo-map__preview"
      aria-label="全屏预览北疆 v3.9 奎屯站起止线路图"
      @click="openPreview"
    >
      <img
        class="geo-map__image"
        :src="travelLineUrl"
        alt="北疆 v3.9 奎屯站起止八日自驾线路图：10 月 3 日乌鲁木齐火车赴奎屯、15:30 取车、验车后赴布尔津，10 月 4 日直达白哈巴并游览观鱼台，10 月 5 日神仙湾乘车到月亮湾、徒步到卧龙湾，目标15:45返白哈巴、16:30前出发去布尔津；16:00前返村且准备与路况支持时可选铁贾公路，10 月 6 日 10:00 布尔津经克拉玛依到奎屯；备选 10 月 5 日续住白哈巴、10 月 6 日 09:00 白哈巴去奎屯，10 月 7 日到赛里木湖环湖，10 月 8 日环湖后经果子沟到伊宁，10月9日伊宁08:00发车、库尔德宁骑马观景、住新源汉庭；10月10日经唐布拉接独库北段主选、那拉提条件备选，封路走精伊连霍，17:00—17:30到铁二路服务点，18:06火车回乌鲁木齐"
        width="2560"
        height="1440"
        loading="lazy"
        decoding="async"
      >
      <span class="geo-map__preview-action" aria-hidden="true">
        <el-icon><FullScreen /></el-icon>
        <span>预览大图</span>
      </span>
    </button>

    <figcaption class="geo-map__caption">
      路线走向示意 · 精确里程、时刻与住宿以 v3.9 逐日台账及临行实时导航为准
    </figcaption>

    <el-image-viewer
      v-if="previewOpen"
      :url-list="[travelLineUrl]"
      :z-index="5000"
      :teleported="true"
      :infinite="false"
      :hide-on-click-modal="true"
      :close-on-press-escape="true"
      :zoom-rate="1.25"
      :min-scale="0.35"
      :max-scale="8"
      @close="closePreview"
    >
      <template #toolbar="{ actions, reset }">
        <div class="route-map-viewer__toolbar" role="toolbar" aria-label="线路图预览控制">
          <el-tooltip content="缩小" placement="top">
            <button type="button" class="route-map-viewer__button" aria-label="缩小线路图" @click="actions('zoomOut')">
              <el-icon><ZoomOut /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip content="放大" placement="top">
            <button type="button" class="route-map-viewer__button" aria-label="放大线路图" @click="actions('zoomIn')">
              <el-icon><ZoomIn /></el-icon>
            </button>
          </el-tooltip>
          <span class="route-map-viewer__divider" aria-hidden="true" />
          <el-tooltip content="适应窗口 / 原始尺寸" placement="top">
            <button type="button" class="route-map-viewer__button" aria-label="切换适应窗口或原始尺寸" @click="reset">
              <el-icon><ScaleToOriginal /></el-icon>
            </button>
          </el-tooltip>
          <span class="route-map-viewer__divider" aria-hidden="true" />
          <el-tooltip content="关闭预览" placement="top">
            <button type="button" class="route-map-viewer__button" aria-label="关闭线路图预览" @click="closePreview">
              <el-icon><Close /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </template>
    </el-image-viewer>
  </figure>
</template>
