<script setup>
import { Calendar, Menu as MenuIcon, Moon, Search, Sunny } from '@element-plus/icons-vue'

defineProps({
  menuOpen: { type: Boolean, default: false },
  searchOpen: { type: Boolean, default: false },
  reading: { type: Boolean, default: false },
  theme: { type: String, default: 'light' },
})

defineEmits(['action', 'filter'])
</script>

<template>
  <nav class="mobile-command-bar" aria-label="移动端快捷导航">
    <button type="button" :aria-pressed="menuOpen" @click="$emit('action', 'toggle-menu')">
      <MenuIcon aria-hidden="true" />
      <span>目录</span>
    </button>
    <button type="button" :aria-pressed="searchOpen" @click="$emit('action', 'toggle-search')">
      <Search aria-hidden="true" />
      <span>搜索</span>
    </button>
    <button type="button" aria-label="每日速查" @click="$emit('action', 'open-daily')">
      <Calendar aria-hidden="true" />
      <span>日程</span>
    </button>
    <button type="button" aria-label="主题" :title="theme === 'dark' ? '切换日间主题' : '切换夜间主题'" :aria-pressed="theme === 'dark'" @click="$emit('action', 'toggle-theme')">
      <Moon v-if="theme === 'dark'" aria-hidden="true" />
      <Sunny v-else aria-hidden="true" />
      <span>{{ theme === 'dark' ? '夜间' : '日间' }}</span>
    </button>
  </nav>
</template>
