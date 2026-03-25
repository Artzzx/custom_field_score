"use strict";
/**
 * Fake implementation of @forge/api.
 *
 * Provides asApp() and asUser() methods that return product request methods
 * (requestJira, requestConfluence, requestBitbucket). All requests are matched
 * against the fixture store and recorded via the call recorder.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeApi = void 0;
const fixture_store_js_1 = require("../../fixtures/fixture-store.js");
const api_catalog_js_1 = require("../../openapi/api-catalog.js");
const spec_loader_js_1 = require("../../openapi/spec-loader.js");
const call_recorder_js_1 = require("./call-recorder.js");
const mock_response_js_1 = require("./mock-response.js");
const route_js_1 = require("./route.js");
class FakeApi {
    fixtureStore;
    callRecorder;
    warnOnDeprecatedAPIs;
    specLoader;
    /** Tracks deprecated endpoints already warned about to avoid duplicate warnings */
    deprecationWarningsEmitted = new Set();
    constructor(options = {}) {
        this.fixtureStore = options.fixtureStore ?? new fixture_store_js_1.FixtureStore(options.fixtureStoreOptions);
        this.callRecorder = new call_recorder_js_1.CallRecorder();
        this.warnOnDeprecatedAPIs = options.warnOnDeprecatedAPIs ?? false;
        this.specLoader = options.specLoader ?? null;
    }
    /**
     * Enable or disable deprecated API warnings at runtime.
     */
    setWarnOnDeprecatedAPIs(enabled, specLoader) {
        this.warnOnDeprecatedAPIs = enabled;
        if (specLoader) {
            this.specLoader = specLoader;
        }
        else if (enabled && !this.specLoader) {
            // Lazily create a default SpecLoader
            this.specLoader = new spec_loader_js_1.SpecLoader();
        }
    }
    /**
     * Returns product request methods authenticated as the app.
     */
    asApp() {
        return this.createRequestMethods('asApp');
    }
    /**
     * Returns product request methods authenticated as the current user.
     */
    asUser() {
        return this.createRequestMethods('asUser');
    }
    /**
     * Get all recorded API calls, optionally filtered.
     */
    get apiCalls() {
        return this.callRecorder.getCalls();
    }
    /**
     * Override a fixture for a specific method + path (for per-test customisation).
     */
    override(method, path, response) {
        this.fixtureStore.override(method, path, response);
    }
    /**
     * Add a programmatic fixture handler.
     */
    addHandler(handler) {
        this.fixtureStore.addHandler(handler);
    }
    /**
     * Clear all recorded calls, fixture overrides, and programmatic handlers.
     * Call between tests for full isolation.
     */
    reset() {
        this.callRecorder.reset();
        this.fixtureStore.reset();
        this.deprecationWarningsEmitted.clear();
    }
    createRequestMethods(mode) {
        return {
            requestJira: (route, init) => this.request('jira', mode, route, init),
            requestConfluence: (route, init) => this.request('confluence', mode, route, init),
            requestBitbucket: (route, init) => this.request('bitbucket', mode, route, init),
        };
    }
    async request(product, mode, routeOrPath, init) {
        const path = routeOrPath instanceof route_js_1.Route ? routeOrPath.value : String(routeOrPath);
        const method = (init?.method ?? 'GET').toUpperCase();
        const body = init?.body ? JSON.parse(init.body) : undefined;
        // Record the call
        this.callRecorder.record({
            product,
            method,
            path,
            body,
            headers: init?.headers,
            mode,
            timestamp: Date.now(),
        });
        // Check for deprecated endpoints
        this.checkForDeprecation(product, method, path);
        // Check for route parameter type mismatches (e.g. string where integer expected)
        this.checkRouteParams(product, method, path);
        // Look up fixture
        const result = this.fixtureStore.lookup(method, path, {
            body,
            headers: init?.headers,
        });
        if (!result.found || !result.response) {
            const errorMessage = this.fixtureStore.buildMissingFixtureError(method, path);
            throw new Error(errorMessage);
        }
        return (0, mock_response_js_1.createMockResponse)(result.response);
    }
    checkForDeprecation(product, method, path) {
        if (!this.warnOnDeprecatedAPIs || !this.specLoader)
            return;
        const cacheKey = `${method}:${path.split('?')[0]}`;
        if (this.deprecationWarningsEmitted.has(cacheKey))
            return;
        try {
            const info = (0, api_catalog_js_1.checkDeprecated)(this.specLoader, product, method, path);
            if (info.deprecated) {
                this.deprecationWarningsEmitted.add(cacheKey);
                const summary = info.summary ? ` (${info.summary})` : '';
                const matchedPath = info.matchedPath ? ` [spec: ${info.matchedPath}]` : '';
                console.warn(`⚠️  DEPRECATED API: ${method} ${path}${matchedPath}${summary}. ` +
                    `This endpoint is deprecated and may be removed. Check the Atlassian REST API docs for the replacement.`);
            }
        }
        catch {
            // Silently ignore spec loading errors — deprecation checking is best-effort
        }
    }
    checkRouteParams(product, method, path) {
        if (!this.specLoader) {
            // Lazily create a SpecLoader — route param checking is always on
            try {
                this.specLoader = new spec_loader_js_1.SpecLoader();
            }
            catch {
                return;
            }
        }
        const cacheKey = `route:${method}:${path.split('?')[0]}`;
        if (this.deprecationWarningsEmitted.has(cacheKey))
            return;
        try {
            const warnings = (0, api_catalog_js_1.checkRouteParameters)(this.specLoader, product, method, path);
            for (const warning of warnings) {
                this.deprecationWarningsEmitted.add(cacheKey);
                const lines = [
                    `⚠️  [test-harness] Route parameter type mismatch: ${method} ${path}`,
                    `   Parameter "${warning.paramName}" expects ${warning.expectedType} but received "${warning.actualValue}"`,
                    `   Matched spec: ${method} ${warning.matchedPath}`,
                    `   This API call will likely fail at runtime with a 400 error.`,
                ];
                if (warning.suggestion) {
                    lines.push(`   Tip: ${warning.suggestion}`);
                }
                console.warn(lines.join('\n'));
            }
        }
        catch {
            // Silently ignore — route checking is best-effort
        }
    }
}
exports.FakeApi = FakeApi;
