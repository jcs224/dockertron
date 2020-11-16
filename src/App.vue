<template>
  <div class="bg-gray-200 h-screen">
    <div class="p-2">
      <h1 class="text-center text-2xl">Containers</h1>
      <transition-group 
        name="container-list" 
        tag="ul"
        class="relative"
      >
        <li 
          v-for="ct in containers" 
          :key="ct.Id"
          class="container-list-item mt-2 flex"
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
          <button 
            class="bg-red-500 text-white px-2 w-10"
            @click="deleteContainer(ct.Id)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </li>
      </transition-group>
      <button 
        class="bg-green-500 text-white w-full p-2 mt-2"
        @click="createModalShowing = true"
      ><i class="fas fa-plus mr-2"></i>Create</button>
    </div>
  </div>

  <modal
    :showing="createModalShowing"
    @close="createModalShowing = false"
  >
    <template v-slot:title>Create container</template>
    <main>
      <div>
        <label class="block" for="">name</label>
        <input type="text" v-model="newContainer.name" class="bg-gray-300 p-2 w-full">
      </div>

      <div class="mt-2">
        <label class="block" for="">image</label>
        <input type="text" v-model="newContainer.image" class="bg-gray-300 p-2 w-full">
      </div>

      <button class="bg-green-500 text-white p-2 mt-4" @click="createContainer">create</button>
    </main>
  </modal>
</template>

<style>
.container-list-item {
  transition: all 0.3s ease;
}

.container-list-enter-from,
.container-list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.container-list-leave-active {
  position: absolute;
  width: 100%;
}
</style>

<script>
import { ipcRenderer } from 'electron'
import Modal from './Components/Modal'

export default {
  components: {
    'modal': Modal
  },

  data() {
    return {
      containers: [],
      createModalShowing: false,
      newContainer: {
        name: '',
        image: '',
      }
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

    ipcRenderer.on('container-created', () => {
      self.listContainers()
    })

    ipcRenderer.on('container-deleted', () => {
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
    },

    createContainer() {
      ipcRenderer.send('create-container', JSON.stringify(this.newContainer))
      this.clearNewContainerForm()
      this.createModalShowing = false
    },

    deleteContainer(id) {
      ipcRenderer.send('delete-container', id)
    },

    clearNewContainerForm() {
      this.newContainer.name = ''
      this.newContainer.image = ''
    }
  }
}
</script>
