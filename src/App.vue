<template>
  <div class="bg-gray-200 h-screen">
    <div class="p-2">
      <h1 class="text-center text-2xl">Containers</h1>
      <ul>
        <li 
          v-for="ct in containers" 
          :key="ct.Id"
          class="mt-2 flex"
        >
          <div 
            class="flex-1 p-2"
            :class="[ct.State == 'running' ? 'bg-white' : 'bg-gray-400']"
          >
            {{ ct.Names[0].slice(1) }}
          </div>
          <button 
            v-if="ct.State == 'running'" 
            class="bg-purple-500 text-white px-2 w-10"
            @click="stopContainer(ct.Id)"
          >
            <i class="fas fa-stop"></i>
          </button>
          <button 
            v-else 
            class="bg-purple-500 text-white px-2 w-10"
            @click="startContainer(ct.Id)"
          >
            <i class="fas fa-play"></i>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data() {
    return {
      containers: []
    }
  },
  
  mounted() {
    var self = this
    ipcRenderer.on('list-containers-result', (event, arg) => {
      self.containers = arg
    })

    ipcRenderer.on('container-stopped', () => {
      self.listContainers()
    })

    ipcRenderer.on('container-started', () => {
      self.listContainers()
    })

    this.listContainers()
  },

  methods: {
    listContainers() {
      ipcRenderer.send('list-containers')
    },
    
    stopContainer(id) {
      ipcRenderer.send('stop-container', id)
    },

    startContainer(id) {
      ipcRenderer.send('start-container', id)
    }
  }
}
</script>
