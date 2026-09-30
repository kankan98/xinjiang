<script setup>
import SectionHeading from '../ui/SectionHeading.vue'
import { foodJourney } from '../../data/travel-experience.js'

defineEmits(['navigate'])
const marks = ['鸡', '鱼', '饭', '馕', '面', '串']
</script>

<template>
  <section id="foodJourney" class="food-journey experience-section" aria-labelledby="foodJourneyTitle">
    <SectionHeading eyebrow="03 / A TASTE OF XINJIANG" title="风景在路上，好味在桌上。" description="按四位成人先点一轮，够不够再加。大盘鸡、抓饭和烤肉错开吃，让每一天都有一点不同。" heading-id="foodJourneyTitle">
      <template #actions><button type="button" class="quiet-link" @click="$emit('navigate', '专题-美食指南.md')">餐厅与点餐完整指南 <span aria-hidden="true">↗</span></button></template>
    </SectionHeading>
    <div class="food-grid">
      <article v-for="(food, index) in foodJourney" :key="food.id" class="food-card">
        <div class="food-card__top"><span class="food-mark" aria-hidden="true">{{ marks[index] }}</span><div><span class="food-card__day">{{ food.day }}</span><p>{{ food.place }}</p></div></div>
        <h3>{{ food.title }}</h3>
        <span class="food-card__flavor">{{ food.flavor }}</span>
        <p class="food-card__order">{{ food.order }}</p>
        <details class="food-card__tip"><summary>点单时多问一句</summary><p>{{ food.tip }}</p></details>
        <footer><small>{{ food.budget }}</small><button type="button" :aria-label="`查看${food.place}餐饮安排`" @click="$emit('navigate', food.file, food.section)">当天怎么吃 <span aria-hidden="true">↗</span></button></footer>
      </article>
    </div>
    <p class="experience-note">费用是整桌的规划参考，按食量和当日菜单调整；餐厅名单保留原资料快照，营业与排队到店前再核。司机选水或茶，卡瓦斯等发酵饮料需先确认酒精含量。</p>
  </section>
</template>
