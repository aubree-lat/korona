let wispUrl = "";

function buildWispUrl() {
  return (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
}

const uvConnection = new BareMux.BareMuxConnection("/baremux/worker.js");

let scramjetCtrl = null;
let proxyFrame   = null;
let lastURL      = "";

const scramjetStores = ["config","cookies","redirectTrackers","referrerPolicies","publicSuffixList"];

async function repairScramjetDatabase() {
  const broken = await new Promise((resolve) => {
    const req = indexedDB.open("$scramjet", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of scramjetStores) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      resolve(false);
    };
    req.onsuccess = () => {
      const db = req.result;
      const missing = scramjetStores.some(s => !db.objectStoreNames.contains(s));
      db.close();
      resolve(missing);
    };
    req.onerror = () => resolve(true);
  });
  if (!broken) return;
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("$scramjet");
    req.onsuccess = () => resolve();
    req.onerror  = () => reject(req.error);
    req.onblocked = () => { console.warn("Scramjet DB repair blocked"); resolve(); };
  });
}

async function setupUVTransport() {
  try {
    await uvConnection.setTransport("/transports/epoxy-baremux.mjs", [{ wisp: wispUrl }]);
  } catch (e) {
    console.warn("[korona] UV transport failed:", e);
  }
}

async function setupScramjetTransport() {
  const { default: EpoxyTransport } = await import("/epoxy/index.mjs");
  const t = new EpoxyTransport({ wisp: wispUrl });
  await t.init();
  return t;
}

const proxyReady = (async () => {
  if (!navigator.serviceWorker) {
    console.warn("Service workers not supported");
    return;
  }

  await navigator.serviceWorker.register("/sw.js?v=4");
  await navigator.serviceWorker.ready;
  await repairScramjetDatabase();

  wispUrl = buildWispUrl();

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })
    );
  }
  const serviceworker = navigator.serviceWorker.controller;

  const [scramjetTransport] = await Promise.all([
    setupScramjetTransport(),
    setupUVTransport(),
  ]);

  scramjetCtrl = new $scramjetController.Controller({
    config: {
      prefix:       "/~/sj/",
      scramjetPath: "/scram/scramjet.js",
      injectPath:   "/controller/controller.inject.js",
      wasmPath:     "/scram/scramjet.wasm",
    },
    serviceworker,
    transport: scramjetTransport,
  });

  await scramjetCtrl.wait();

  const iframeEl =
    document.getElementById("iframeid") ||
    document.getElementById("proxy-frame");
  if (iframeEl) {
    proxyFrame = scramjetCtrl.createFrame(iframeEl);
  }
})();

function getProxyType() {
  const selector = document.getElementById("proxysel");
  return selector ? selector.value : (localStorage.getItem("proxyBackend") || "uv");
}

function search(input) {
  const template = "https://duckduckgo.com/?t=h_&ia=web&q=%s";
  try { return new URL(input).toString(); } catch {}
  try {
    const u = new URL(`https://${input}`);
    if (u.hostname.includes(".")) return u.toString();
  } catch {}
  return template.replace("%s", encodeURIComponent(input));
}

function encodeProxyUrl(url, proxyType = getProxyType()) {
  const fixed = search(url);
  if (proxyType === "uv") {
    return __uv$config.prefix + __uv$config.encodeUrl(fixed);
  }
  if (proxyFrame && scramjetCtrl) {
    return proxyFrame.prefix + scramjetCtrl.config.codec.encode(fixed);
  }
  return null;
}

function decodeProxyUrl(url) {
  try {
    const href = new URL(url, location.href).href;
    const uvPrefix = location.origin + __uv$config.prefix;
    if (href.startsWith(uvPrefix)) {
      return __uv$config.decodeUrl(href.slice(uvPrefix.length));
    }
    if (proxyFrame && scramjetCtrl) {
      const pathname = new URL(href).pathname;
      if (pathname.startsWith(proxyFrame.prefix)) {
        return scramjetCtrl.config.codec.decode(pathname.slice(proxyFrame.prefix.length));
      }
    }
  } catch {}
  return "";
}

function getElements() {
  return {
    form:   document.getElementById("homework-searchbar") || document.getElementById("idk"),
    input:  document.getElementById("homework-lookupbar") || document.getElementById("url"),
    iframe: document.getElementById("iframeid")           || document.getElementById("iframe"),
  };
}

function updateSearchFromIframe() {
  const { iframe, input } = getElements();
  if (!iframe || !input) return;
  try {
    const currentURL = iframe.contentWindow.location.href;
    if (currentURL === lastURL) return;
    lastURL = currentURL;
    const decoded = decodeProxyUrl(currentURL);
    if (decoded) {
      localStorage.setItem("decoded", decoded);
      input.value = decoded;
    }
  } catch {}
}

async function navigate(url) {
  const { iframe } = getElements();
  if (!iframe) return;

  await proxyReady;

  const fixed     = search(url);
  const proxyType = getProxyType();
  const encoded   = encodeProxyUrl(fixed, proxyType);

  if (!encoded) { console.error("[korona] could not encode URL"); return; }

  sessionStorage.setItem("encodedUrl", encoded);
  sessionStorage.setItem("proxyType",  proxyType);

  iframe.src = encoded;
}

function fn_reload() {
  const { iframe } = getElements();
  try { iframe.contentWindow.location.reload(); }
  catch { if (iframe) iframe.src = iframe.src; }
}
function goback()       { const { iframe } = getElements(); try { iframe.contentWindow.history.back();    } catch {} }
function rotatetozone() { const { iframe } = getElements(); try { iframe.contentWindow.history.forward(); } catch {} }

window.fn_reload    = fn_reload;
window.goback       = goback;
window.rotatetozone = rotatetozone;

window.KoronaProxy = {
  ready:     proxyReady,
  encodeUrl: encodeProxyUrl,
  decodeUrl: decodeProxyUrl,
  getProxyType,
  search,
};

document.addEventListener("DOMContentLoaded", async () => {
  const { form, input, iframe } = getElements();
  if (!form || !input || !iframe) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = input.value.trim();
    if (url) navigate(url);
  });

  setInterval(updateSearchFromIframe, 1000);
  iframe.addEventListener("load", updateSearchFromIframe);

  try {
    await proxyReady;

    const pendingUrl = sessionStorage.getItem("pendingUrl");
    if (pendingUrl) {
      input.value = pendingUrl;
      sessionStorage.removeItem("pendingUrl");
      await navigate(pendingUrl);
      return;
    }

    const encodedUrl = sessionStorage.getItem("encodedUrl");
    if (encodedUrl) {
      const decoded = decodeProxyUrl(encodedUrl);
      input.value = decoded || input.value;
      iframe.src  = encodedUrl;
    }
  } catch (error) {
    console.error("[korona] Failed to initialize proxy:", error);
  }
});