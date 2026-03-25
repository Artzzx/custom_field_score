"use strict";
/**
 * Fake implementation of @forge/api's `route` tagged template literal.
 *
 * The real `route` function creates a safe URL by encoding interpolated values.
 * Our implementation does the same encoding but returns a Route object that
 * can be used for fixture matching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
exports.route = route;
/**
 * A resolved route — the result of the `route` tagged template literal.
 * Matches the shape of @forge/api's Route type.
 */
class Route {
    value;
    constructor(
    /** The fully resolved path string with interpolations applied */
    value) {
        this.value = value;
    }
    toString() {
        return this.value;
    }
}
exports.Route = Route;
/**
 * Tagged template literal that builds a safe API route.
 *
 * Encodes interpolated values using encodeURIComponent to prevent injection,
 * matching the behaviour of @forge/api's route function.
 *
 * Usage:
 *   route`/rest/api/3/issue/${issueKey}`
 *   // → Route { value: "/rest/api/3/issue/TEST-123" }
 */
function route(strings, ...values) {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            result += encodeURIComponent(String(values[i]));
        }
    }
    return new Route(result);
}
