# Proxy Transports

A universal interface for designing "transports", i.e. ways of sending https+wss traffic from the browser through a proxy.

A transport is an object that implements the `ProxyTransport` interface.

```js
export interface ProxyTransport {
	init: () => Promise<void>;
	ready: boolean;
	connect: (
		url: URL,
		protocols: string[],
		requestHeaders: RawHeaders,
		onopen: (protocol: string, extensions: string) => void,
		onmessage: (data: WebSocketDataType) => void,
		onclose: (code: number, reason: string) => void,
		onerror: (error: string) => void
	) => [
		(data: WebSocketDataType) => void,
		(code: number, reason: string) => void,
	];

	request: (
		remote: URL,
		method: string,
		body: BodyInit | null,
		headers: RawHeaders,
		signal: AbortSignal | undefined
	) => Promise<TransferrableResponse>;
}
```

Successor to [bare-mux](https://github.com/MercuryWorkshop/bare-mux)
