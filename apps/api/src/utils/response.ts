import { type Static, type TSchema, t } from "elysia";

const BaseResponseSchema = t.Object({
    path: t.String(),
    message: t.String(),
    timestamp: t.String(),
});

export const SuccessResponseSchema = t.Composite([
    BaseResponseSchema,
    t.Object({
        data: t.Any(),
        meta: t.Any(),
        status: t.Union([t.Number(), t.String()]),
    }),
]);

export type SuccessResponse = Static<typeof SuccessResponseSchema>;

export const ErrorResponseSchema = t.Composite([
    BaseResponseSchema,
    t.Object({
        details: t.Any(),
        status: t.Union([t.Number(), t.String()]),
        code: t.String(),
        message: t.String(),
        raw: t.Any(),
    }),
]);

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const PaginationQuerySchema = t.Object({
    page: t.Optional(
        t.String({ pattern: "^[1-9][0-9]*$", default: "1", description: "Page number.", minLength: 0, maxLength: 100 })
    ),
    limit: t.Optional(
        t.String({
            pattern: "^[1-9][0-9]*$",
            default: "10",
            description: "Number of items per page.",
            minLength: 1,
            maxLength: 3,
            transform: (v: string): string => {
                const num: number = Number.parseInt(v);
                return num > 100 ? "100" : v;
            },
        })
    ),
    search: t.Optional(
        t.String({
            description: "Search by user fullname or email.",
            minLength: 3,
            maxLength: 100,
        })
    ),
    role: t.Optional(
        t.String({
            description: "Filter by user role.",
            enum: ["USER", "ADMIN", "SUPERADMIN"],
        })
    ),
    sortBy: t.Optional(
        t.String({
            description: "Sort by field, either 'fullname', 'email', or 'createdAt'.",
            enum: ["fullname", "email", "createdAt"],
        })
    ),
    sortOrder: t.Optional(
        t.String({
            description: "Sort order, either 'asc' or 'desc'.",
            enum: ["asc", "desc"],
        })
    ),
});

export const PaginationModelSchema = t.Object({
    page: t.Number({ minimum: 1, default: 1 }),
    limit: t.Number({ minimum: 1, default: 10 }),
    totalItems: t.Number(),
    totalPages: t.Number(),
    hasNext: t.Boolean(),
    hasPrev: t.Boolean(),
});

export const createPaginatedSchema = <T extends TSchema>(dataSchema: T) =>
    t.Object({
        data: t.Array(dataSchema),
        meta: PaginationModelSchema,
    });
