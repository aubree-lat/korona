import { RawHeaders, ProxyTransport, WebSocketDataType } from "./types";
export declare const WebSocketFields: {
    prototype: {
        send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
    };
    CLOSED: 3;
    CLOSING: 2;
    CONNECTING: 0;
    OPEN: 1;
};
export declare class BareCompatibleWebSocket extends EventTarget {
    transport: ProxyTransport;
    url: string;
    readyState: number;
    extensions: string;
    protocol: string;
    private _data;
    private _close;
    constructor(remote: string | URL, protocols: string | string[] | undefined, transport: ProxyTransport, requestHeaders?: RawHeaders);
    send(data: WebSocketDataType): Promise<void>;
    close(code: number, reason: string): void;
}
