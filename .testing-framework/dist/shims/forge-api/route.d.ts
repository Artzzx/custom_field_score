/**
 * Fake implementation of @forge/api's `route` tagged template literal.
 *
 * The real `route` function creates a safe URL by encoding interpolated values.
 * Our implementation does the same encoding but returns a Route object that
 * can be used for fixture matching.
 */
/**
 * A resolved route — the result of the `route` tagged template literal.
 * Matches the shape of @forge/api's Route type.
 */
export declare class Route {
    /** The fully resolved path string with interpolations applied */
    readonly value: string;
    constructor(
    /** The fully resolved path string with interpolations applied */
    value: string);
    toString(): string;
}
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
export declare function route(strings: TemplateStringsArray, ...values: unknown[]): Route;
