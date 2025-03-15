import Elysia, {} from "elysia";
import { getStatusName } from "#utils/error";
import type { ErrorResponse, SuccessResponse } from "#utils/response";

const excludePaths: string[] = ["/health", "/reference", "/metrics"];

function shouldExcludePath(path: string): boolean {
    const normalizedPath: string = path.replace(/\/+$/, "");

    return excludePaths.some((excluded: string): boolean => {
        const normalizedExcluded: string = excluded.replace(/\/+$/, "");
        return normalizedPath === normalizedExcluded || normalizedPath.startsWith(`${normalizedExcluded}/`);
    });
}

type ErrorGuard = {
    code: number;
    response: number | string;
};

export function useResponseMapperMiddleware() {
    return new Elysia({
        name: "Middleware.ResponseMapper",
    })
        .onAfterHandle({ as: "global" }, (ctx) => {
            const path: string = new URL(ctx.request.url).pathname;

            if (shouldExcludePath(path)) {
                return;
            }

            const message: string = "success";
            const timestamp: string = new Date().toISOString();
            const response = ctx.response;
            const status = ctx.set.status ?? 200;

            // Check if response is an object with data and meta properties
            const hasDataAndMeta = response && typeof response === "object" && "data" in response && "meta" in response;

            const _response = {
                path: path,
                message: message,
                ...(hasDataAndMeta
                    ? {
                          data: response.data,
                          meta: response.meta,
                      }
                    : {
                          data: response,
                          meta: {},
                      }),
                status: status,
                timestamp: timestamp,
            } satisfies SuccessResponse;

            ctx.set.status = status;

            return Response.json(_response);
        })
        .onError({ as: "global" }, (ctx) => {
            const error = ctx.error as ErrorGuard;

            const _response = {
                path: new URL(ctx.request.url).pathname,
                message: "error",
                code: getStatusName(Number(error.code)),
                details: error.response,
                status: error.code,
                raw: "",
                timestamp: new Date().toISOString(),
            } satisfies ErrorResponse;

            ctx.set.status = error.code;

            return Response.json(_response);
        });
}
