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
            class="flex-1 p-2 rounded-l transition duration-200 ease-in-out flex"
            :class="[ct.State == 'running' ? 'bg-white' : 'bg-gray-400']"
          >
            <span
              class="mr-3"
            >
              {{ ct.Names[0].slice(1) }}
            </span>
            <div v-if="visiblePorts(ct.Id).length > 0">
              <div v-for="(p, index) in visiblePorts(ct.Id)" :key="index">
                <div 
                  class="flex items-stretch"
                  :class="index > 0 && 'mt-2'"
                >
                  <div class="text-sm bg-blue-500 text-white rounded-l-sm px-1">
                    {{ p.PublicPort }}
                  </div>
                  <div class="bg-gray-300">
                    <i class="fas fa-arrow-right px-1"></i>
                  </div>
                  <div class="text-sm bg-blue-500 text-white rounded-r-sm px-1">
                    {{ p.PrivatePort }}
                  </div>
                </div>
              </div>
            </div>
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
        @click="createContainerDialog = true"
      ><i class="fas fa-plus mr-2"></i>Create</button>
    </div>
  </div>

  <o-modal
    :active="createContainerDialog"
    @close="createContainerDialog = false"
    contentClass="w-1/2 p-3 rounded"
    mobileClass="p-3"
    mobileBreakpoint="750px"
    :autoFocus="false"
  >
    <template v-slot:title>Create container</template>
    <main>
      <MountedWrapper @after-mounted="afterCreateModalOpen">
        <label class="block" for="">name</label>
        <input ref="new-container-name" type="text" v-model="newContainer.name" class="bg-gray-300 p-2 w-full rounded">
      </MountedWrapper>

      <div class="mt-2">
        <label class="block" for="">image</label>
        <input type="text" v-model="newContainer.image" class="bg-gray-300 p-2 w-full rounded">
      </div>

      <div 
        v-if="isImageDownloading"
        class="mt-3"
      >
        Downloading {{ imageDownloadingName }}...
        <div class="bg-blue-200 flex w-full h-3 mt-1 relative rounded">
          <div class="bg-blue-500 rounded transition duration-200 ease-in-out" :style="`width: ${imageDownloadingPercentage}%`"></div>
        </div>
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

      <button 
        class="text-white p-2 mt-4 rounded" 
        :disabled="isCreatingContainer"
        @click="createContainer"
        :class="[
          isCreatingContainer ? 'bg-green-400 cursor-wait' : 'bg-green-500'
        ]"
        >
          <span v-if="isCreatingContainer"><i class="fas fa-spinner fa-spin"></i></span>
          <span v-else>create</span>
        </button>
    </main>
  </o-modal>
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

.o-modal__overlay {
  @apply bg-black opacity-50 !important
}

</style>

<script>
import { ipcRenderer } from 'electron'
import MountedWrapper from './Components/MountedWrapper.vue'

export default {

  components: {
    MountedWrapper,
  },

  data() {
    return {
      containers: [],
      newContainer: {
        name: '',
        image: '',
        ports: [],
        envVariables: [],
      },
      stateChanging: [],
      createContainerDialog: false,
      isImageDownloading: false,
      imageDownloading: {},
      isCreatingContainer: false,
      deletingContainerId: null,
    }
  },

  computed: {
    imageDownloadingPercentage() {
      if (this.imageDownloading && this.imageDownloading.payload && this.imageDownloading.payload.progressDetail) {
        const progress = this.imageDownloading.payload.progressDetail
        return (progress.current / progress.total) * 100
      } else {
        return 0
      }
    },

    imageDownloadingName() {
      if (this.imageDownloading && this.imageDownloading.image) {
        return this.imageDownloading.image
      } else {
        return ''
      }
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
      this.clearNewContainerForm()
      this.isCreatingContainer = false
      this.createContainerDialog = false
      self.listContainers()
    })

    ipcRenderer.on('container-creation-failed', (event, arg) => {
      this.isCreatingContainer = false
      const errParsed = JSON.parse(arg)
      alert(errParsed.reason)
    })

    ipcRenderer.on('container-deleted', () => {
      this.deletingContainerId = null
      self.listContainers()
    })

    ipcRenderer.on('downloading-image', (event, arg) => {
      const parsedArg = JSON.parse(arg)

      this.isImageDownloading = true
      this.imageDownloading = parsedArg
    })

    ipcRenderer.on('image-downloaded', () => {
      this.isImageDownloading = false
      this.imageDownloading = null
    })

    ipcRenderer.on('image-download-failed', (event, arg) => {
      alert(JSON.parse(arg))
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
      this.isCreatingContainer = true
      ipcRenderer.send('create-container', JSON.stringify(this.newContainer))
    },

    deleteContainer(id) {
      this.deletingContainerId = id
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
    },

    afterCreateModalOpen() {
      this.$refs['new-container-name'].focus()
    },

    visiblePorts(containerID) {
      let container = this.containers.filter(ct => ct.Id == containerID)[0]
      let ports = container.Ports

      let filteredPorts = ports.filter(p => p.PublicPort && p.PrivatePort && p.IP && p.IP != '::')

      return filteredPorts
    }
  }
}
</script>
