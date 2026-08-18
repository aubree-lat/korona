import EpoxyTransport from "/epoxy/index.mjs";

function toPairs(headers) {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers;
  const pairs = [];
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) pairs.push([key, String(item)]);
    } else {
      pairs.push([key, String(value)]);
    }
  }
  return pairs;
}

function toRecord(pairs) {
  if (!pairs) return {};
  if (!Array.isArray(pairs)) return pairs;
  const record = {};
  for (const [key, value] of pairs) {
    const name = key.toLowerCase();
    if (name in record) {
      if (Array.isArray(record[name])) record[name].push(value);
      else record[name] = [record[name], value];
    } else {
      record[name] = value;
    }
  }
  return record;
}

export default class EpoxyBareMuxTransport {
  constructor(options) {
    this.inner = new EpoxyTransport(options);
  }

  get ready() {
    return this.inner.ready;
  }
  set ready(value) {
    this.inner.ready = value;
  }

  init() {
    return this.inner.init();
  }

  meta() {
    return this.inner.meta?.();
  }

  async request(remote, method, body, headers, signal) {
    const res = await this.inner.request(remote, method, body, toPairs(headers), signal);
    return {
      body: res.body,
      headers: toRecord(res.headers),
      status: res.status,
      statusText: res.statusText,
    };
  }

  connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
    return this.inner.connect(
      url,
      protocols,
      toPairs(requestHeaders),
      onopen,
      onmessage,
      onclose,
      onerror
    );
  }
}