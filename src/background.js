'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import { uniq as _uniq } from 'lodash'

import Docker from 'dockerode'
let docker = new Docker({socketPath: '/var/run/docker.sock'})

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  docker.getEvents({}, (err, data) => {
    if (err) {
      console.log(err.message)
    } else {
      data.on('data', function(chunk) {
        let event = JSON.parse(chunk.toString('utf8'))
        let parsedEvent = {
          id: event.Actor.ID,
          status: event.status,
          action: event.Action
        }

        switch (parsedEvent.status) {
          case 'start':
            win.webContents.send('container-started', parsedEvent.id)
            break
          case 'stop':
            win.webContents.send('container-stopped', parsedEvent.id)
            break
        }
      })
    }
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// Docker stuff
async function getImageList() {
  const rawImages = await docker.listImages()
  const imageTags = _uniq(rawImages.flatMap(image => image.RepoTags))
  return imageTags
}

async function imageDownloaded(imageName) {
  return (await getImageList()).includes(imageName)
}

ipcMain.on('list-containers', (event, arg) => {
  docker.listContainers({all: true}).then((containers) => {
    event.reply('list-containers-result', containers)
  })
})

ipcMain.on('stop-container', (event, arg) => {
  docker.getContainer(arg).stop().then(() => {
    event.reply('container-stopped', arg)
  })
})

ipcMain.on('start-container', (event, arg) => {
  docker.getContainer(arg).start().then(() => {
    event.reply('container-started', arg)
  })
})

ipcMain.on('create-container', async (event, arg) => {
  let parsedArgs = JSON.parse(arg)

  let parsedPorts = {}
  let parsedExposedPorts = {}
  let parsedEnvs = []

  for (let port of parsedArgs.ports) {
    parsedPorts[`${port.container}/tcp`] = [
      {
        HostPort: port.host
      }
    ]

    parsedExposedPorts[`${port.container}/tcp`] = {}
  }

  for (let env of parsedArgs.envVariables) {
    parsedEnvs.push(`${env.key}=${env.value}`)
  }

  if (!await imageDownloaded(parsedArgs.image)) {
    await downloadImage(parsedArgs.image, event)
  }

  docker.createContainer({
    Image: parsedArgs.image,
    name: parsedArgs.name,
    ExposedPorts: parsedExposedPorts,
    HostConfig: {
      PortBindings: parsedPorts
    },
    Env: parsedEnvs,
  }).then((err, container) => {
    event.reply('container-created', container)
  }).catch(err => {
    event.reply('container-creation-failed', JSON.stringify(err))
  })
})

ipcMain.on('delete-container', (event, arg) => {
  docker.getContainer(arg).inspect().then((data) => {
    if (data.State.Status == 'running') {
      return docker.getContainer(arg).stop().then(() => {
        return docker.getContainer(arg)
      })
    } else {
      return docker.getContainer(arg)
    }
  }).then((container) => {
    return container.remove()
  }).then(() => {
    event.reply('container-deleted', arg)
  })
})

// ipcMain.on('download-image', (event, arg) => {
//   var thisEvent = event

//   docker.pull(arg, (pullErr, stream) => {
//     if (pullErr) {
//       thisEvent.reply('image-download-failed', JSON.stringify(pullErr))
//     } else {
//       docker.modem.followProgress(stream, onFinished, onProgress)

//       function onFinished(finishedErr, output) {
//         if (finishedErr) {
//           thisEvent.reply('image-download-failed', JSON.stringify(finishedErr))
//         } else {
//           thisEvent.reply('image-downloaded', arg)
//         }
//       }

//       function onProgress(event) {
//         thisEvent.reply('downloading-image', JSON.stringify(event))
//       }
//     }
//   })
// })

async function downloadImage(imageName, event = null) {
  var thisEvent = event
  const stream = await docker.pull(imageName)

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (finishedErr, output) => {
      if (finishedErr) {
        if (thisEvent) thisEvent.reply('image-download-failed', JSON.stringify(finishedErr))
        return reject(finishedErr)
      } else {
        if (thisEvent) thisEvent.reply('image-downloaded', imageName)
        return resolve(output)
      }
    }, (progressEvent) => {
      if (thisEvent) thisEvent.reply('downloading-image', JSON.stringify({
        image: imageName,
        payload: progressEvent
      }))
    })
  })

  // docker.pull(arg, (pullErr, stream) => {
  //   if (pullErr) {
  //     thisEvent.reply('image-download-failed', JSON.stringify(pullErr))
  //   } else {
  //     docker.modem.followProgress(stream, onFinished, onProgress)

  //     function onFinished(finishedErr, output) {
  //       if (finishedErr) {
  //         thisEvent.reply('image-download-failed', JSON.stringify(finishedErr))
  //       } else {
  //         thisEvent.reply('image-downloaded', arg)
  //       }
  //     }

  //     function onProgress(event) {
  //       thisEvent.reply('downloading-image', JSON.stringify(event))
  //     }
  //   }
  // })
}

// docker.pull('hello-world', (err, stream) => {
//   // stream.on('data', (chunk) => {
//   //   console.log(`received ${chunk.length} bytes of data`)
//   // })

//   // stream.on('end', () => {
//   //   console.log('no more data.')
//   // })

//   docker.modem.followProgress(stream, onFinished, onProgress)

//   function onFinished(err, output) {
//     console.log('done.')
//   }

//   function onProgress(event) {
//     console.log(event)
//   }
// })