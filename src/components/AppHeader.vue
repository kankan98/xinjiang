<script setup>
import { computed } from "vue";
import { Menu as MenuIcon, Moon, Printer, Search, Sunny } from "@element-plus/icons-vue";

const props = defineProps({
  current: Object,
  filterLabel: String,
  searchOpen: Boolean,
  menuOpen: Boolean,
  theme: String,
  version: String,
});

const compactVersion = computed(() => props.version?.match(/^v[\d.]+/i)?.[0] || props.version);

defineEmits(["action"]);
</script>

<template>
  <header class="site-head">
    <div class="topbar">
      <div class="topbar-left">
        <el-button
          text
          class="icon-btn menu-toggle"
          :icon="MenuIcon"
          :aria-expanded="menuOpen"
          aria-controls="sidebar"
          aria-label="切换目录"
          @click="$emit('action', 'toggle-menu')"
        >
          <span class="menu-label">目录</span>
        </el-button>
        <el-button text class="head-brand" title="回到路书首页" @click="$emit('action', 'open-all')">
          <svg class="brand-symbol" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor" /><path d="m8 29 10-18 6 12 5-8 4 14H8Z" stroke="#fffaf5" stroke-width="1.7" stroke-linejoin="round" /><path d="m14 19 4 3 3-4" stroke="#fffaf5" stroke-width="1.5" stroke-linecap="round" /><circle cx="29" cy="10" r="2" fill="#fffaf5" /></svg>
          <span class="brand-copy"><strong class="brand-wordmark">北疆路书</strong><span class="brand-model" aria-hidden="true">NORTH XINJIANG · 2026</span></span>
        </el-button>
        <div class="breadcrumb" aria-label="当前位置">
          <span>RoadBook</span><b>/</b><strong>{{ current?.title || '秋日旅行手册' }}</strong>
        </div>
      </div>
      <div class="topbar-actions">
        <el-button
          text
          class="icon-btn utility-btn search-toggle"
          :icon="Search"
          :aria-expanded="searchOpen"
          aria-haspopup="dialog"
          :aria-label="searchOpen ? '关闭搜索' : '打开搜索'"
          @click="$emit('action', 'toggle-search')"
        ></el-button>
        <button
          type="button"
          class="search-trigger"
          aria-haspopup="dialog"
          :aria-expanded="searchOpen"
          aria-label="打开搜索"
          @click="$emit('action', 'toggle-search')"
        >
          <Search aria-hidden="true" />
          <span class="search-trigger__placeholder">搜索目的地、行程…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <el-button v-if="current" text class="icon-btn utility-btn print-toggle" :icon="Printer" aria-label="打印当前章节" @click="$emit('action', 'print')"
          ><span class="utility-label">打印</span></el-button
        >
        <el-button text class="icon-btn utility-btn theme-toggle" :icon="theme === 'dark' ? Sunny : Moon" :aria-label="theme === 'dark' ? '切换日间主题' : '切换夜间主题'" @click="$emit('action', 'toggle-theme')"><span class="theme-toggle__label">{{ theme === 'dark' ? '夜行' : '日间' }}</span></el-button>
        <span class="head-version" :aria-label="`当前版本：${version}`" :title="version">
          <i class="version-dot" aria-hidden="true" />
          <span class="head-version__full">{{ version }}</span>
          <span class="head-version__compact" aria-hidden="true">{{ compactVersion }}</span>
        </span>
      </div>
    </div>
  </header>
</template>
