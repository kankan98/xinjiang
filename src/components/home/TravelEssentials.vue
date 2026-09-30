<script setup>
import SectionHeading from '../ui/SectionHeading.vue'
import { packingGroups } from '../../data/travel-experience.js'
defineEmits(['navigate'])
</script>

<template>
  <section id="travelEssentials" class="travel-essentials experience-section" aria-labelledby="travelEssentialsTitle">
    <SectionHeading eyebrow="随行准备 / BEFORE YOU GO" title="把山里的冷，和路上的需要都带上" description="十月北疆按冷暖分层准备。所有时刻使用北京时间；日出、日落是规划参考，山体遮挡与天气会让可用光线更短。" heading-id="travelEssentialsTitle" />
    <div class="essentials-grid"><article v-for="(group, index) in packingGroups" :key="group.title"><span class="essentials-number">0{{ index + 1 }}</span><h3>{{ group.title }}</h3><ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul></article></div>
    <div class="essentials-footer"><p>重要信息另存手机和纸本，山里有信号再核动态。遇紧急情况，先到安全位置。</p><div><a href="tel:110">报警 110</a><a href="tel:120">急救 120</a><button type="button" class="quiet-link" @click="$emit('navigate', '专题-新疆旅行应急宝典.md')">打开应急手册 ↗</button></div></div>
  </section>
</template>
