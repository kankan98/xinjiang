<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import RoadbookLayout from './layouts/RoadbookLayout.vue'
</script>

<template>
  <el-config-provider :locale="zhCn" namespace="el" :z-index="2000">
    <RoadbookLayout />
  </el-config-provider>
</template>
