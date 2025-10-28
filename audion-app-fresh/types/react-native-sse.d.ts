declare module 'react-native-sse' {
  export interface EventSourceOptions {
    headers?: Record<string, string>;
    method?: string;
    body?: string;
    debug?: boolean;
    timeoutBeforeConnection?: number;
    withCredentials?: boolean;
  }

  export interface MessageEvent<T = any> {
    data: T;
    type: string;
    lastEventId?: string;
  }

  export default class EventSource<T = never> {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSED: number;

    readonly readyState: number;
    readonly url: string;
    readonly withCredentials: boolean;

    onopen: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent<string>) => void) | null;
    onerror: ((event: Event | Error) => void) | null;

    constructor(url: string, options?: EventSourceOptions);

    addEventListener(type: string, listener: (event: MessageEvent) => void): void;
    removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
    close(): void;
    open(): void;
  }
}
