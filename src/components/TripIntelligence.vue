<script setup>
import { computed, ref, watch } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import { gateLabels } from '../data/travel-experience.js'
import { readPlannerState, writePlannerState } from '../lib/storage.js'

const props = defineProps({ intelligence: { type: Object, required: true }, gates: { type: Array, required: true } })
defineEmits(['navigate'])
const saved = readPlannerState('departure-checks', [])
const checked = ref(Array.isArray(saved) ? saved.filter((id) => props.gates.some((gate) => gate.id === id)) : [])
const completed = computed(() => new Set(checked.value).size)
watch(checked, (value) => writePlannerState('departure-checks', [...new Set(value)]), { deep: true })
</script>

<template>
  <section id="intelligence" class="departure-section experience-section" aria-labelledby="intelligenceTitle">
    <SectionHeading eyebrow="05 / READY FOR THE ROAD" title="准备妥当，出发就从容。" description="住宿已订，也要确认接驳与保房。按下面七项逐一检查，动态信息在游览日前再核一次。" heading-id="intelligenceTitle">
      <template #meta><div class="departure-count" role="status"><strong>{{ completed }}<small> / {{ gates.length }}</small></strong><span>项已自行核对</span></div></template>
    </SectionHeading>
    <div class="departure-progress" role="progressbar" aria-label="本机行前核对进度" :aria-valuenow="completed" aria-valuemin="0" :aria-valuemax="gates.length"><span :style="{ width: `${completed / gates.length * 100}%` }" /></div>
    <p class="experience-note">每确认一项，再勾选一项，并另存对应的订单、公告或书面答复。勾选只记录在当前浏览器，不能代替订票或通行许可；此前勾过的证件、收费、接驳及还车事项，请按更新后的说明再看一遍。</p>
    <div class="departure-grid">
      <article v-for="gate in gates" :key="gate.id" class="departure-item" :class="{ 'is-checked': checked.includes(gate.id) }">
        <label><input v-model="checked" type="checkbox" :value="gate.id" :aria-label="`已核对 ${gate.id} ${gateLabels[gate.id]}`"><span><small>{{ gate.id }}</small><strong>{{ gateLabels[gate.id] || gate.name }}</strong></span></label>
        <p class="departure-item__when">{{ gate.deadline }}</p>
        <details><summary>确认什么，变化时怎么办</summary><div><p>{{ gate.pass }}</p><p class="departure-item__fallback"><strong>条件不满足时</strong>{{ gate.fallback }}</p><button type="button" class="quiet-link" @click="$emit('navigate', gate.id === 'G3' ? 'Day2-布尔津-白哈巴.md' : gate.file, gate.id === 'G7' ? '独库不通时怎么走' : gate.id === 'G3' ? '边防证与票务前置' : '临行硬闸门')">查看完整说明 ↗</button></div></details>
      </article>
      <article class="departure-note"><span class="eyebrow">校审提醒 · {{ intelligence.critical.reviewedAt || intelligence.reviewedAt }}</span><h3>{{ intelligence.critical.title }}</h3><p>{{ intelligence.critical.summary }}</p><button type="button" class="quiet-link" @click="$emit('navigate', '04-来源与复核日志.md', '20260930边防证流程')">查看本次复核依据 ↗</button></article>
    </div>
    <details class="departure-timeline"><summary>按日期展开准备安排 <span>{{ intelligence.timeline.length }} 个窗口</span></summary><ol><li v-for="item in intelligence.timeline" :key="item.title"><time>{{ item.when }}</time><div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></div></li></ol></details>
  </section>
</template>
