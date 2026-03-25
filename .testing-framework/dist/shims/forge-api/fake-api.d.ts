/**
 * Fake implementation of @forge/api.
 *
 * Provides asApp() and asUser() methods that return product request methods
 * (requestJira, requestConfluence, requestBitbucket). All requests are matched
 * against the fixture store and recorded via the call recorder.
 */
import { FixtureStore } from '../../fixtures/fixture-store.js';
import type { FixtureHandler, FixtureResponse, FixtureStoreOptions } from '../../fixtures/types.js';
import { SpecLoader } from '../../openapi/spec-loader.js';
import { CallRecorder } from './call-recorder.js';
import type { RecordedApiCall } from './call-recorder.js';
import type { MockApiResponse } from './mock-response.js';
import { Route } from './route.js';
/** Options for a product API request, matching @forge/api's RequestInit-like interface */
export interface ProductRequestInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}
/** The methods returned by asApp() and asUser() */
export interface ProductRequestMethods {
    requestJira(route: Route | string, init?: ProductRequestInit): Promise<MockApiResponse>;
    requestConfluence(route: Route | string, init?: ProductRequestInit): Promise<MockApiResponse>;
    requestBitbucket(route: Route | string, init?: ProductRequestInit): Promise<MockApiResponse>;
}
export interface FakeApiOptions {
    /** Fixture store to use for resolving API responses */
    fixtureStore?: FixtureStore;
    /** Fixture store options (used if fixtureStore is not provided) */
    fixtureStoreOptions?: FixtureStoreOptions;
    /**
     * When true, emit console.warn() if an API call targets a deprecated endpoint
     * (as determined by the OpenAPI specs in the specs/ directory).
     * Defaults to false.
     */
    warnOnDeprecatedAPIs?: boolean;
    /** Custom SpecLoader instance (for testing / custom specs dir) */
    specLoader?: SpecLoader;
}
export declare class FakeApi {
    readonly fixtureStore: FixtureStore;
    readonly callRecorder: CallRecorder;
    private warnOnDeprecatedAPIs;
    private specLoader;
    /** Tracks deprecated endpoints already warned about to avoid duplicate warnings */
    private deprecationWarningsEmitted;
    constructor(options?: FakeApiOptions);
    /**
     * Enable or disable deprecated API warnings at runtime.
     */
    setWarnOnDeprecatedAPIs(enabled: boolean, specLoader?: SpecLoader): void;
    /**
     * Returns product request methods authenticated as the app.
     */
    asApp(): ProductRequestMethods;
    /**
     * Returns product request methods authenticated as the current user.
     */
    asUser(): ProductRequestMethods;
    /**
     * Get all recorded API calls, optionally filtered.
     */
    get apiCalls(): RecordedApiCall[];
    /**
     * Override a fixture for a specific method + path (for per-test customisation).
     */
    override(method: string, path: string, response: FixtureResponse): void;
    /**
     * Add a programmatic fixture handler.
     */
    addHandler(handler: FixtureHandler): void;
    /**
     * Clear all recorded calls, fixture overrides, and programmatic handlers.
     * Call between tests for full isolation.
     */
    reset(): void;
    private createRequestMethods;
    private request;
    private checkForDeprecation;
    private checkRouteParams;
}
