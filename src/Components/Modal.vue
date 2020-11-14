<template>
  <div class="fixed z-10 inset-0 z-40 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div 
        class="fixed inset-0 transition-opacity"
        @click="$emit('close')"
      >
        <div class="absolute inset-0 bg-black opacity-50"></div>
      </div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" role="dialog" aria-modal="true" aria-labelledby="modal-headline">
        <div class="bg-white p-4">
          <div class="flex justify-between">
            <h1 class="text-2xl"><slot name="title"></slot></h1>
            <i @click="$emit('close')" class="fas fa-times"></i>
          </div>
         <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {

}
</script>