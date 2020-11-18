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
            class="flex-1 p-2 rounded-l transition duration-200 ease-in-out"
            :class="[ct.State == 'running' ? 'bg-white' : 'bg-gray-400']"
          >
            {{ ct.Names[0].slice(1) }}
          </div>
          <button
            class="bg-purple-500 text-white px-2 w-10"
            @click="startOrStopContainer(ct.Id)"
          >
            <template v-if="stateChanging.includes(ct.Id)">
              <i class="fas fa-spinner fa-spin"></i>
            </template>
            <template v-else>
              <i v-if="ct.State == 'running'" class="fas fa-stop"></i>
              <i v-else class="fas fa-play"></i>
            </template>
          </button>
          <button 
            class="bg-red-500 text-white px-2 w-10 rounded-r"
            @click="deleteContainer(ct.Id)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </li>
      </transition-group>
      <button 
        class="bg-green-500 text-white w-full p-2 mt-2 rounded"
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
        <input type="text" v-model="newContainer.name" class="bg-gray-300 p-2 w-full rounded">
      </div>

      <div class="mt-2">
        <label class="block" for="">image</label>
        <input type="text" v-model="newContainer.image" class="bg-gray-300 p-2 w-full rounded">
      </div>

      <div class="mt-2">
        <label class="block" for="">ports</label>
        <transition-group
          name="port-list"
          tag="div"
          class="relative"
        >
          <template
            v-for="(port, index) in newContainer.ports"
            :key="index"        
          >
            <div class="flex port-list-item">
              <div class="flex-1">
                <label class="block">host</label>
                <input type="text" v-model="newContainer.ports[index].host" class="bg-gray-300 p-2 w-full rounded">
              </div>
              <div class="flex items-center mt-6 mx-2">
                <i class="fas fa-arrow-right"></i>
              </div>
              <div class="flex-1">
                <label class="block">container</label>
                <input type="text" v-model="newContainer.ports[index].container" class="bg-gray-300 p-2 w-full rounded">
              </div>
              <div class="flex items-end ml-2">
                <button
                  class="bg-red-500 text-white h-10 w-10 rounded"
                  @click="removePort(index)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </template>
        </transition-group>
        <button 
          @click="addPort"
          class="bg-gray-700 text-white p-2 mt-4 rounded"
        ><i class="fas fa-plus mr-2"></i>add port pair</button>
      </div>

      <div class="mt-2">
        <label class="block" for="">environment variables</label>
        <transition-group
          name="env-list"
          tag="div"
          class="relative"
        >
          <template
            v-for="(port, index) in newContainer.envVariables"
            :key="index"        
          >
            <div class="flex env-list-item">
              <div class="flex-1">
                <label class="block">key</label>
                <input type="text" v-model="newContainer.envVariables[index].key" class="bg-gray-300 p-2 w-full rounded">
              </div>
              <div class="flex items-center mt-6 mx-2">
                <i class="fas fa-arrow-right"></i>
              </div>
              <div class="flex-1">
                <label class="block">value</label>
                <input type="text" v-model="newContainer.envVariables[index].value" class="bg-gray-300 p-2 w-full rounded">
              </div>
              <div class="flex items-end ml-2">
                <button
                  class="bg-red-500 text-white h-10 w-10 rounded"
                  @click="removeEnv(index)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </template>
        </transition-group>
        <button 
          @click="addEnv"
          class="bg-gray-700 text-white p-2 mt-4 rounded"
        ><i class="fas fa-plus mr-2"></i>add environment variable</button>
      </div>

      <button class="bg-green-500 text-white p-2 mt-4 rounded" @click="createContainer">create</button>
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

.port-list-item {
  transition: all 0.2s ease;
}

.port-list-enter-from,
.port-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.port-list-leave-active {
  position: absolute;
  width: 100%;
}

.env-list-item {
  transition: all 0.2s ease;
}

.env-list-enter-from,
.env-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.env-list-leave-active {
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
        ports: [],
        envVariables: [],
      },
      stateChanging: [],
    }
  },
  
  mounted() {
    var self = this
    ipcRenderer.on('list-containers-result', (event, arg) => {
      self.containers = arg
    })

    ipcRenderer.on('container-stopped', (event, arg) => {
      let ctStateIndex = self.stateChanging.findIndex(ctId => ctId == arg)
      self.stateChanging.splice(ctStateIndex, 1)
      self.listContainers()
    })

    ipcRenderer.on('container-started', (event, arg) => {
      let ctStateIndex = self.stateChanging.findIndex(ctId => ctId == arg)
      self.stateChanging.splice(ctStateIndex, 1)
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

    startOrStopContainer(id) {
      this.stateChanging.push(id)

      if (this.containers.filter(ct => id == ct.Id)[0].State == 'running') {
        this.stopContainer(id)
      } else {
        this.startContainer(id)
      }
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
      this.newContainer.image = '',
      this.newContainer.ports = []
      this.newContainer.envVariables = []
    },

    addPort() {
      this.newContainer.ports.push({
        'host': '',
        'container': '',
      })
    },

    removePort(index) {
      this.newContainer.ports.splice(index, 1)
    },

    addEnv() {
      this.newContainer.envVariables.push({
        'key': '',
        'value': '',
      })
    },

    removeEnv(index) {
      this.newContainer.envVariables.splice(index, 1)
    }
  }
}
</script>
