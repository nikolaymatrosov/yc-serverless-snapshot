/**
 * Return epoch timestamp
 */
export function now(): number {
    return Math.floor(new Date().getTime() / 1000)
}
