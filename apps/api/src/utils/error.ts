import type { ValueErrorIterator, ValueErrorType } from "@sinclair/typebox/errors";
import type { TSchema } from "elysia";

type HttpErrorStatusString =
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "METHOD_NOT_ALLOWED"
    | "NOT_ACCEPTABLE"
    | "PROXY_AUTHENTICATION_REQUIRED"
    | "REQUEST_TIMEOUT"
    | "CONFLICT"
    | "GONE"
    | "LENGTH_REQUIRED"
    | "PRECONDITION_FAILED"
    | "PAYLOAD_TOO_LARGE"
    | "URI_TOO_LONG"
    | "UNSUPPORTED_MEDIA_TYPE"
    | "RANGE_NOT_SATISFIABLE"
    | "EXPECTATION_FAILED"
    | "IM_A_TEAPOT"
    | "MISDIRECTED_REQUEST"
    | "UNPROCESSABLE_ENTITY"
    | "TOO_EARLY"
    | "UPGRADE_REQUIRED"
    | "PRECONDITION_REQUIRED"
    | "TOO_MANY_REQUESTS"
    | "REQUEST_HEADER_FIELDS_TOO_LARGE"
    | "UNAVAILABLE_FOR_LEGAL_REASONS"
    | "INTERNAL_SERVER_ERROR"
    | "NOT_IMPLEMENTED"
    | "BAD_GATEWAY"
    | "SERVICE_UNAVAILABLE"
    | "GATEWAY_TIMEOUT"
    | "HTTP_VERSION_NOT_SUPPORTED"
    | "VARIANT_ALSO_NEGOTIATES"
    | "INSUFFICIENT_STORAGE"
    | "LOOP_DETECTED"
    | "NOT_EXTENDED"
    | "NETWORK_AUTHENTICATION_REQUIRED";

const ERROR_STATUS_MAP: Record<HttpErrorStatusString, number> = {
    // 4xx Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

// a function that takes in the number of the status code and returns the value name of the status code
export function getStatusName(status: number): HttpErrorStatusString {
    return Object.keys(ERROR_STATUS_MAP).find(
        (key) => ERROR_STATUS_MAP[key as HttpErrorStatusString] === status
    ) as HttpErrorStatusString;
}

export type ValidationResult = {
    summary: string;
    type: ValueErrorType;
    message: string;
    schema: TSchema;
    path: string;
    value: unknown;
    errors: ValueErrorIterator[];
};

export type ValidationSchemaError = {
    type: string;
    message: string;
    schema: TSchema;
};

export type ValidationErrorAll = { summary: undefined } | ValidationResult;

export type ValidationErrorCollection = Exclude<ValidationResult, { summary: undefined }>[];
