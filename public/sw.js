importScripts('/uv/uv.bundle.js')
importScripts('/uv/uv.config.js')
importScripts('/uv/uv.sw.js')
importScripts('/controller/controller.sw.js')

const uv = new UVServiceWorker()

async function handleRequest(event) {
  if (uv.route(event)) {
    return await uv.fetch(event)
  }
  if ($scramjetController.shouldRoute(event)) {
    return await $scramjetController.route(event)
  }
  return await fetch(event.request)
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})
