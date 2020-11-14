module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        "productName": "Docker Helper",
        "linux": {
          "target": "AppImage"
        }
      }
    }
  }
}