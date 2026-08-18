(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ProxyTransports = {}));
})(this, (function (exports) { 'use strict';

	const WebSocketFields = {
	    CLOSED: WebSocket.CLOSED,
	    CONNECTING: WebSocket.CONNECTING,
	    OPEN: WebSocket.OPEN,
	};
	class BareCompatibleWebSocket extends EventTarget {
	    transport;
	    url;
	    readyState = WebSocketFields.CONNECTING;
	    extensions = "";
	    protocol = "";
	    _data;
	    _close;
	    constructor(remote, protocols, transport, requestHeaders) {
	        super();
	        this.transport = transport;
	        this.url = remote.toString();
	        if (!requestHeaders) {
	            requestHeaders = [];
	        }
	        if (!protocols) {
	            protocols = [];
	        }
	        if (typeof protocols === "string") {
	            protocols = [protocols];
	        }
	        const onopen = (protocol, extensions) => {
	            this.protocol = protocol;
	            this.extensions = extensions;
	            this.readyState = WebSocketFields.OPEN;
	            const event = new Event("open");
	            this.dispatchEvent(event);
	        };
	        const onmessage = async (payload) => {
	            const event = new MessageEvent("message", { data: payload });
	            this.dispatchEvent(event);
	        };
	        const onclose = (code, reason) => {
	            this.readyState = WebSocketFields.CLOSED;
	            const event = new CloseEvent("close", { code, reason });
	            this.dispatchEvent(event);
	        };
	        const onerror = () => {
	            this.readyState = WebSocketFields.CLOSED;
	            const event = new Event("error");
	            this.dispatchEvent(event);
	        };
	        (async () => {
	            if (!transport.ready) {
	                await transport.init();
	            }
	            const [_data, _close] = transport.connect(new URL(remote), protocols, requestHeaders, onopen, onmessage, onclose, onerror);
	            this._data = _data;
	            this._close = _close;
	        })();
	    }
	    async send(data) {
	        if (!this.transport.ready) {
	            await this.transport.init();
	        }
	        if (this.readyState === WebSocketFields.CONNECTING) {
	            throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.");
	        }
	        // we can't check typeof Uint8Array here directly as it may come from another realm
	        if (typeof data === "object" && "buffer" in data && data.buffer) {
	            let _data = data;
	            // this is neccesary in case the buffer is a slice of a larger array
	            // in which case you risk edge cases such as sending an entire wasm memory buffer over the websocket
	            data = _data.buffer.slice(_data.byteOffset, _data.byteOffset + _data.byteLength);
	        }
	        this._data(data);
	    }
	    close(code, reason) {
	        this._close(code, reason);
	    }
	}

	const validChars = "!#$%&'*+-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~";
	function validProtocol(protocol) {
	    for (let i = 0; i < protocol.length; i++) {
	        const char = protocol[i];
	        if (!validChars.includes(char)) {
	            return false;
	        }
	    }
	    return true;
	}
	const wsProtocols = ["ws:", "wss:"];
	const statusEmpty = [101, 204, 205, 304];
	const statusRedirect = [301, 302, 303, 307, 308];
	const nativeFetch = fetch;
	function headersObjectToEntries(headers) {
	    return [...headers];
	}
	/**
	 * A Response with additional properties.
	 */
	class BareResponse extends Response {
	    url;
	    rawHeaders;
	    redirected = false;
	    static fromTransferrableResponse(resp, url) {
	        const response = new BareResponse(statusEmpty.includes(resp.status) ? undefined : resp.body, {
	            headers: new Headers(resp.headers),
	            status: resp.status,
	            statusText: resp.statusText,
	        });
	        response.url = url;
	        response.redirected =
	            resp.status >= 300 &&
	                resp.status < 400 &&
	                resp.headers["location"] !== undefined;
	        response.rawHeaders = resp.headers;
	        return response;
	    }
	    static fromNativeResponse(resp) {
	        let body = statusEmpty.includes(resp.status) ? undefined : resp.body;
	        const response = new BareResponse(body, {
	            headers: resp.headers,
	            status: resp.status,
	            statusText: resp.statusText,
	        });
	        response.url = resp.url;
	        response.rawHeaders = headersObjectToEntries(resp.headers);
	        response.redirected = resp.redirected;
	        return response;
	    }
	}
	const defaultMaxRedirects = 20;
	class BareCompatibleClient {
	    transport;
	    /**
	     * Create a BareCompatibleClient using the provided transport. Calls to fetch and connect will wait for an implementation to be ready.
	     */
	    constructor(transport) {
	        this.transport = transport;
	    }
	    createWebSocket(remote, protocols = [], requestHeaders) {
	        try {
	            remote = new URL(remote);
	        }
	        catch (err) {
	            throw new DOMException(`Faiiled to construct 'WebSocket': The URL '${remote}' is invalid.`);
	        }
	        if (!wsProtocols.includes(remote.protocol))
	            throw new DOMException(`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${remote.protocol}' is not allowed.`);
	        if (!Array.isArray(protocols))
	            protocols = [protocols];
	        protocols = protocols.map(String);
	        for (const proto of protocols)
	            if (!validProtocol(proto))
	                throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`);
	        requestHeaders = requestHeaders || [];
	        const socket = new BareCompatibleWebSocket(remote, protocols, this.transport, requestHeaders);
	        return socket;
	    }
	    async fetch(url, init) {
	        if (!this.transport.ready) {
	            await this.transport.init();
	        }
	        let maxRedirects = init?.maxRedirects || defaultMaxRedirects;
	        const body = init?.body;
	        const headers = init?.headers || [];
	        const method = init?.method || "GET";
	        const redirect = init?.redirect || "follow";
	        let urlO = new URL(url);
	        if (urlO.protocol.startsWith("blob:")) {
	            const response = await nativeFetch(urlO);
	            return BareResponse.fromNativeResponse(response);
	        }
	        for (let i = 0;; i++) {
	            const resp = await this.transport.request(urlO, method, body, headers, undefined);
	            const bareresponse = BareResponse.fromTransferrableResponse(resp, urlO.toString());
	            if (statusRedirect.includes(bareresponse.status)) {
	                switch (redirect) {
	                    case "follow": {
	                        const location = bareresponse.headers.get("location");
	                        if (maxRedirects > i && location !== null) {
	                            urlO = new URL(location, urlO);
	                            continue;
	                        }
	                        else
	                            throw new TypeError("Failed to fetch");
	                    }
	                    case "error":
	                        throw new TypeError("Failed to fetch");
	                    case "manual":
	                        return bareresponse;
	                }
	            }
	            else {
	                return bareresponse;
	            }
	        }
	    }
	}

	exports.BareCompatibleClient = BareCompatibleClient;
	exports.BareCompatibleWebSocket = BareCompatibleWebSocket;
	exports.BareResponse = BareResponse;

}));
//# sourceMappingURL=index.js.map
