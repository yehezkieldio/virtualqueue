import type { ColorName } from "consola/utils";
import { getColor as c } from "consola/utils";
import Elysia from "elysia";
import { logger } from "#utils/logger";

const STATUS_COLOR_MAP: { [k in number]?: ColorName } = {
    200: "green",
    201: "green",
    204: "yellow",
    400: "yellow",
    401: "magenta",
    403: "cyan",
    404: "green",
    500: "red",
};

function formatStatus(status: string | number | undefined): string {
    if (status === undefined) {
        return "";
    }

    const color: ColorName = STATUS_COLOR_MAP[Number(status)] || "gray";
    return c(color)(status.toString());
}

function formatTime(time: number): string {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
}

export function useLoggerMiddleware() {
    return new Elysia({
        name: "Middleware.Logger",
    })
        .derive(
            {
                as: "scoped",
            },
            ({ headers }) => {
                return {
                    startTime: Date.now(),
                    ip: headers["x-forwarded-for"] || headers["x-real-ip"] || headers["x-client-ip"] || "",
                };
            }
        )
        .onAfterHandle({ as: "global" }, (ctx) => {
            const method: string = c("bold")(ctx.request.method.padEnd(4));
            let url: string = c("white")(new URL(ctx.request.url).pathname.padEnd(4));
            const statusCode: string = c("bold")(formatStatus(ctx.set.status));
            const duration: string = c("gray")(`${formatTime(Date.now() - (ctx.startTime || Date.now()))}`);

            const { headers, body, query, params, cookie } = ctx;
            if (query) {
                const params = new URLSearchParams();

                // Only add parameters that have valid values
                for (const [key, value] of Object.entries(query)) {
                    if (value !== undefined && value !== null && value !== "") {
                        params.append(key, String(value));
                    }
                }

                const queryString = params.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
            }

            logger.info(`${method} ${url} ${statusCode} ${duration}`);
            const requestData = {
                ...(headers && { headers }),
                ...(body !== undefined && { body }),
                ...(Object.keys(query || {}).length && { query }),
                ...(Object.keys(params || {}).length && { params }),
                ...(Object.keys(cookie || {}).length && { cookie }),
            };

            if (Object.keys(requestData).length) {
                logger.trace("Request: ", JSON.stringify(requestData, null, 2));
            }
        })
        .onError({ as: "global" }, (ctx) => {
            const error = ctx.error;

            const method: string = c("bold")(ctx.request.method.padEnd(4));
            const url: string = c("white")(new URL(ctx.request.url).pathname.padEnd(4));
            const statusCode: string = formatStatus(ctx.set.status);
            const duration: string = c("gray")(`${formatTime(Date.now() - (ctx.startTime || Date.now()))}`);

            logger.error(`${method} ${url} ${statusCode} ${duration}`);
            logger.trace("Error: ", error);

            const { headers, body, query, params, cookie } = ctx;
            const requestData = {
                ...(headers && { headers }),
                ...(body !== undefined && { body }),
                ...(Object.keys(query || {}).length && { query }),
                ...(Object.keys(params || {}).length && { params }),
                ...(Object.keys(cookie || {}).length && { cookie }),
            };

            if (Object.keys(requestData).length) {
                logger.trace("Request: ", JSON.stringify(requestData, null, 2));
            }
        });
}
