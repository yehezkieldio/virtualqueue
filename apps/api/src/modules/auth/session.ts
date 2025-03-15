import { record } from "@elysiajs/opentelemetry";
import { db } from "@virtualqueue/database";
import { cuid } from "@virtualqueue/database/cuid";
import { and, eq, isNull } from "@virtualqueue/database/drizzle";
import { sessions } from "@virtualqueue/database/schema";

export async function createSession(
    userId: string,
    token: string,
    metadata: {
        userAgent?: string;
        ip?: string;
        expiresAt: Date;
    }
) {
    return await record("database.sessions.create", async () => {
        return await db
            .insert(sessions)
            .values({
                id: cuid(),
                userId,
                token,
                userAgent: metadata.userAgent,
                ip: metadata.ip,
                expiresAt: metadata.expiresAt,
                createdAt: new Date(),
                lastActiveAt: new Date(),
            })
            .returning();
    });
}

export async function getActiveSessions(userId: string) {
    return await record("database.sessions.getActive", async () => {
        return await db.query.sessions.findMany({
            where: and(eq(sessions.userId, userId), isNull(sessions.expiresAt)),
            orderBy: (sessions, { desc }) => [desc(sessions.lastActiveAt)],
        });
    });
}

export async function updateSessionActivity(tokenId: string) {
    return await record("database.sessions.update", async () => {
        return await db.update(sessions).set({ lastActiveAt: new Date() }).where(eq(sessions.id, tokenId));
    });
}

export async function terminateSession(tokenId: string) {
    return await record("database.sessions.terminate", async () => {
        return await db.update(sessions).set({ expiresAt: new Date() }).where(eq(sessions.id, tokenId));
    });
}
