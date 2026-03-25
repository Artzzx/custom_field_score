/**
 * Fake implementation of @forge/bridge.
 *
 * Provides mock implementations of invoke(), view, router, showFlag(), events,
 * and Modal — all spyable/assertable for tests.
 *
 * Usage in tests:
 *   import { FakeBridge } from '@forge/testing-framework';
 *
 *   const bridge = new FakeBridge();
 *   bridge.setContext({ extension: { issue: { key: 'TEST-1' } } });
 *   bridge.mockInvoke('getIssue', { key: 'TEST-1', summary: 'Test' });
 *
 *   // In component under test:
 *   const data = await invoke('getIssue', { issueKey: 'TEST-1' });
 *   const ctx = await view.getContext();
 */
export type InvokePayload = {
    [key in number | string]: unknown;
};
export type FlagAppearance = 'info' | 'success' | 'warning' | 'error';
export interface FlagAction {
    text: string;
    onClick: () => void;
}
export interface FlagOptions {
    id: number | string;
    title?: string;
    description?: string;
    type?: FlagAppearance;
    appearance?: FlagAppearance;
    actions?: FlagAction[];
    isAutoDismiss?: boolean;
}
export interface Flag {
    close: () => Promise<boolean | void>;
}
export interface Subscription {
    unsubscribe: () => void;
}
export interface ModalOptions {
    resource?: string | null;
    onClose?: (payload: unknown) => unknown;
    size?: string;
    context?: unknown;
    closeOnEscape?: boolean;
    closeOnOverlayClick?: boolean;
}
export interface FullContext {
    accountId?: string;
    cloudId?: string;
    workspaceId?: string;
    extension: Record<string, unknown>;
    environmentId: string;
    environmentType: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
    license?: Record<string, unknown>;
    localId: string;
    locale: string;
    moduleKey: string;
    siteUrl: string;
    timezone: string;
    theme?: Record<string, unknown> | null;
    surfaceColor?: string | null;
    userAccess?: {
        enabled: boolean;
        hasAccess: boolean;
    };
}
export interface RecordedInvoke {
    functionKey: string;
    payload?: InvokePayload;
    timestamp: number;
}
export interface RecordedFlag {
    options: FlagOptions;
    timestamp: number;
}
export interface RecordedNavigation {
    action: 'navigate' | 'open' | 'reload';
    location?: string | Record<string, unknown>;
    timestamp: number;
}
export interface RecordedEvent {
    event: string;
    payload?: unknown;
    timestamp: number;
}
export interface RecordedModal {
    options: ModalOptions;
    timestamp: number;
}
export interface RecordedViewAction {
    action: 'submit' | 'close' | 'open' | 'refresh' | 'changeWindowTitle' | 'emitReadyEvent';
    payload?: unknown;
    timestamp: number;
}
export interface RecordedProductRequest {
    product: 'jira' | 'confluence' | 'bitbucket';
    path: string;
    method: string;
    body?: unknown;
    headers?: Record<string, string>;
    timestamp: number;
}
export interface RecordedRealtimeAction {
    action: 'publish' | 'subscribe' | 'publishGlobal' | 'subscribeGlobal';
    channel: string;
    payload?: unknown;
    timestamp: number;
}
export interface ProductRequestFixture {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
}
export interface InvokeEndpointInput {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
}
export declare class FakeBridge {
    private context;
    private invokeHandlers;
    readonly invocations: RecordedInvoke[];
    readonly flags: RecordedFlag[];
    readonly navigations: RecordedNavigation[];
    readonly emittedEvents: RecordedEvent[];
    readonly modals: RecordedModal[];
    readonly viewActions: RecordedViewAction[];
    readonly productRequests: RecordedProductRequest[];
    readonly realtimeActions: RecordedRealtimeAction[];
    private eventSubscriptions;
    private productFixtures;
    private realtimeSubscriptions;
    private translations;
    /**
     * Set the context returned by view.getContext().
     */
    setContext(context: Partial<FullContext>): void;
    /**
     * Register a mock handler for invoke() calls.
     * When invoke(functionKey, payload) is called, the handler is called and its return value is returned.
     */
    mockInvoke(functionKey: string, responseOrHandler: unknown | ((payload?: InvokePayload) => unknown)): void;
    /**
     * Set the context returned by view.getContext().
     * Alias for setContext() — named to mirror mockInvoke() for discoverability.
     */
    mockGetContext(context: Partial<FullContext>): void;
    /**
     * Set translations for a locale (used by i18n.getTranslations).
     */
    setTranslations(locale: string, translations: Record<string, string | Record<string, unknown>>): void;
    /**
     * Register a mock fixture for product API requests (requestJira, requestConfluence, requestBitbucket).
     *
     * @param method - HTTP method (GET, POST, etc.)
     * @param path - URL path pattern (e.g. '/rest/api/3/issue/TEST-1')
     * @param fixture - Response fixture with status, body, and optional headers
     *
     * @example
     *   bridge.addProductFixture('GET', '/rest/api/3/issue/TEST-1', {
     *     status: 200,
     *     body: { key: 'TEST-1', fields: { summary: 'Test issue' } },
     *   });
     */
    addProductFixture(method: string, path: string, fixture: ProductRequestFixture): void;
    /**
     * Clear all recorded interactions, handlers, and context. Call between tests.
     */
    reset(): void;
    /**
     * Get the invoke function (matches @forge/bridge's `invoke` export).
     */
    get invoke(): <T = unknown>(functionKey: string, payload?: InvokePayload) => Promise<T>;
    /**
     * Get the view object (matches @forge/bridge's `view` export).
     */
    get view(): {
        getContext: () => Promise<FullContext>;
        submit: (payload?: unknown) => Promise<void>;
        close: (payload?: unknown) => Promise<void>;
        open: () => Promise<void>;
        refresh: (payload?: unknown) => Promise<void>;
        changeWindowTitle: (title: string) => Promise<void>;
        emitReadyEvent: () => Promise<void>;
        theme: {
            enable: () => Promise<void>;
        };
        createHistory: () => Promise<{
            push: () => void;
            replace: () => void;
            go: () => void;
            back: () => void;
            forward: () => void;
            listen: () => () => void;
            location: {
                pathname: string;
                search: string;
                hash: string;
                state: undefined;
                key: string;
            };
            action: "POP";
            createHref: () => string;
            block: () => () => void;
        }>;
    };
    /**
     * Get the router object (matches @forge/bridge's `router` export).
     */
    get router(): {
        navigate: (location: string | Record<string, unknown>) => Promise<void>;
        open: (location: string | Record<string, unknown>) => Promise<void>;
        reload: () => Promise<void>;
        getUrl: (_location: Record<string, unknown>) => Promise<URL | null>;
    };
    /**
     * Get the showFlag function (matches @forge/bridge's `showFlag` export).
     */
    get showFlag(): (options: FlagOptions) => Flag;
    /**
     * Get the events object (matches @forge/bridge's `events` export).
     */
    get events(): {
        emit: (event: string, payload?: unknown) => Promise<void>;
        on: (event: string, callback: (payload?: unknown) => unknown) => Promise<Subscription>;
    };
    /**
     * Get the i18n object (matches @forge/bridge's `i18n` export).
     */
    get i18n(): {
        getTranslations: (locale: string, options?: {
            fallback?: boolean;
        }) => Promise<{
            locale: string;
            translations: Record<string, string | Record<string, unknown>> | null;
        }>;
    };
    private productRequest;
    /**
     * Get the requestJira function (matches @forge/bridge's `requestJira` export).
     * Requires fixtures registered via addProductFixture().
     */
    get requestJira(): (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
    /**
     * Get the requestConfluence function (matches @forge/bridge's `requestConfluence` export).
     */
    get requestConfluence(): (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
    /**
     * Get the requestBitbucket function (matches @forge/bridge's `requestBitbucket` export).
     */
    get requestBitbucket(): (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
    /**
     * Get the realtime object (matches @forge/bridge's `realtime` export).
     * Provides publish/subscribe/publishGlobal/subscribeGlobal.
     */
    get realtime(): {
        publish: (channel: string, payload: unknown, _options?: {
            token?: string;
        }) => Promise<void>;
        subscribe: (channel: string, callback: (payload?: unknown) => unknown, _options?: {
            replay?: number;
            token?: string;
        }) => Promise<{
            unsubscribe: () => Promise<void>;
        }>;
        publishGlobal: (channel: string, payload: unknown, _options?: {
            token?: string;
        }) => Promise<void>;
        subscribeGlobal: (channel: string, callback: (payload?: unknown) => unknown, _options?: {
            replay?: number;
            token?: string;
        }) => Promise<{
            unsubscribe: () => Promise<void>;
        }>;
    };
    /**
     * Get the invokeRemote function (matches @forge/bridge's `invokeRemote` export).
     * Throws by default since remote endpoints require specific configuration.
     */
    get invokeRemote(): (input: InvokeEndpointInput) => Promise<Record<string, unknown> | void>;
    /**
     * Get the invokeService function (matches @forge/bridge's `invokeService` export).
     * Throws by default since container services require specific configuration.
     */
    get invokeService(): (input: InvokeEndpointInput) => Promise<Record<string, unknown> | void>;
    /**
     * Create a Modal instance (matches @forge/bridge's `Modal` export).
     */
    createModal(options?: ModalOptions): {
        open: () => Promise<void>;
    };
}
declare const _bridge: FakeBridge;
declare function resetForgeBridgeShim(): void;
/** Default export: the bridge instance */
export default _bridge;
/** Named exports matching `import { invoke, view, router, showFlag, events, i18n, ... } from '@forge/bridge'` */
export declare const invoke: <T = unknown>(functionKey: string, payload?: InvokePayload) => Promise<T>;
export declare const view: {
    getContext: () => Promise<FullContext>;
    submit: (payload?: unknown) => Promise<void>;
    close: (payload?: unknown) => Promise<void>;
    open: () => Promise<void>;
    refresh: (payload?: unknown) => Promise<void>;
    changeWindowTitle: (title: string) => Promise<void>;
    emitReadyEvent: () => Promise<void>;
    theme: {
        enable: () => Promise<void>;
    };
    createHistory: () => Promise<{
        push: () => void;
        replace: () => void;
        go: () => void;
        back: () => void;
        forward: () => void;
        listen: () => () => void;
        location: {
            pathname: string;
            search: string;
            hash: string;
            state: undefined;
            key: string;
        };
        action: "POP";
        createHref: () => string;
        block: () => () => void;
    }>;
};
export declare const router: {
    navigate: (location: string | Record<string, unknown>) => Promise<void>;
    open: (location: string | Record<string, unknown>) => Promise<void>;
    reload: () => Promise<void>;
    getUrl: (_location: Record<string, unknown>) => Promise<URL | null>;
};
export declare const showFlag: (options: FlagOptions) => Flag;
export declare const events: {
    emit: (event: string, payload?: unknown) => Promise<void>;
    on: (event: string, callback: (payload?: unknown) => unknown) => Promise<Subscription>;
};
export declare const i18n: {
    getTranslations: (locale: string, options?: {
        fallback?: boolean;
    } | undefined) => Promise<{
        locale: string;
        translations: Record<string, string | Record<string, unknown>> | null;
    }>;
};
export declare const requestJira: (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
export declare const requestConfluence: (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
export declare const requestBitbucket: (restPath: string, fetchOptions?: RequestInit) => Promise<Response>;
export declare const realtime: {
    publish: (channel: string, payload: unknown, _options?: {
        token?: string;
    } | undefined) => Promise<void>;
    subscribe: (channel: string, callback: (payload?: unknown) => unknown, _options?: {
        replay?: number;
        token?: string;
    } | undefined) => Promise<{
        unsubscribe: () => Promise<void>;
    }>;
    publishGlobal: (channel: string, payload: unknown, _options?: {
        token?: string;
    } | undefined) => Promise<void>;
    subscribeGlobal: (channel: string, callback: (payload?: unknown) => unknown, _options?: {
        replay?: number;
        token?: string;
    } | undefined) => Promise<{
        unsubscribe: () => Promise<void>;
    }>;
};
export declare const invokeRemote: (input: InvokeEndpointInput) => Promise<Record<string, unknown> | void>;
export declare const invokeService: (input: InvokeEndpointInput) => Promise<Record<string, unknown> | void>;
/** Modal constructor matching `import { Modal } from '@forge/bridge'` */
export declare class Modal {
    private options;
    constructor(options?: ModalOptions);
    open(): Promise<void>;
}
export { _bridge, resetForgeBridgeShim };
export { _bridge as bridge };
