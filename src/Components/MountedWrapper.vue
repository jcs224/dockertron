<template>
  <slot />
</template>

<script setup>
  import { onMounted, defineEmits } from 'vue'
  
  const emits = defineEmits()

  onMounted(() => {
    emits('after-mounted')
  })
</script>