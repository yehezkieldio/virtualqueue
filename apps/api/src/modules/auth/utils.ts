// Expires in 15 minutes
export const ACCESS_TOKEN_EXPIRATION: number = 15 * 60;

// Expires in 30 days
export const REFRESH_TOKEN_EXPIRATION: number = 30 * 86_400;

export function getExpireTimestamp(seconds: number): number {
    const currentTimeMillis: number = Date.now();
    const secondsIntoMillis: number = seconds * 1000;
    const expirationTimeMillis: number = currentTimeMillis + secondsIntoMillis;

    return Math.floor(expirationTimeMillis / 1000);
}
