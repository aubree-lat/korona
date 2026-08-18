import { FetchBodyType, RawHeaders, ProxyTransport, TransferrableResponse } from "./types";
import { BareCompatibleWebSocket } from "./websocket";
export declare function validProtocol(protocol: string): boolean;
/**
 * A Response with additional properties.
 */
export declare class BareResponse extends Response {
    url: string;
    rawHeaders: RawHeaders;
    redirected: boolean;
    static fromTransferrableResponse(resp: TransferrableResponse, url: string): BareResponse;
    static fromNativeResponse(resp: Response): BareResponse;
}
export type BareRequestInit = {
    body?: FetchBodyType | null;
    headers?: RawHeaders;
    method?: string;
    redirect?: RequestRedirect;
    maxRedirects?: number;
};
export declare class BareCompatibleClient {
    transport: ProxyTransport;
    /**
     * Create a BareCompatibleClient using the provided transport. Calls to fetch and connect will wait for an implementation to be ready.
     */
    constructor(transport: ProxyTransport);
    createWebSocket(remote: string | URL, protocols?: string | string[] | undefined, requestHeaders?: RawHeaders): BareCompatibleWebSocket;
    fetch(url: string | URL, init?: BareRequestInit): Promise<BareResponse>;
}
