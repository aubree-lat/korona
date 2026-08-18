import type { RawHeaders, TransferrableResponse, ProxyTransport } from "@mercuryworkshop/proxy-transports";
export type LibcurlClientOptions = {
    wisp: string;
    websocket?: string;
    proxy?: string;
    transport?: string;
    connections?: Array<number>;
};
export default class LibcurlClient implements ProxyTransport {
    session: any;
    wisp: string;
    proxy?: string;
    transport?: string;
    connections?: Array<number>;
    constructor(options: LibcurlClientOptions);
    init(): Promise<void>;
    ready: boolean;
    meta(): Promise<void>;
    request(remote: URL, method: string, body: BodyInit | null, headers: RawHeaders, signal: AbortSignal | undefined): Promise<TransferrableResponse>;
    connect(url: URL, protocols: string[], requestHeaders: RawHeaders, onopen: (protocol: string, extensions: string) => void, onmessage: (data: Blob | ArrayBuffer | string) => void, onclose: (code: number, reason: string) => void, onerror: (error: string) => void): [
        (data: Blob | ArrayBuffer | string) => void,
        (code: number, reason: string) => void
    ];
}
export { LibcurlClient };
