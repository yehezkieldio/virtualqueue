import pg from "postgres";

export function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "23505";
}

export function isForeignKeyConstraintError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "23503";
}

export function isCheckConstraintError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "23514";
}

export function isNotNullConstraintError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "23502";
}

export function isInvalidDateError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "22008";
}

export function isEnumValueError(error: unknown): boolean {
    return error instanceof pg.PostgresError && error.code === "22P02";
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof pg.PostgresError) {
        switch (error.code) {
            case "23505": {
                const match: RegExpMatchArray | null = error.message.match(/unique constraint "(.+?)"/);
                const constraint: string | undefined = match ? match[1] : "unknown";

                if (!constraint) {
                    return "A record with this information already exists";
                }

                if (constraint.includes("email")) {
                    return "Email address is already in use";
                }
                if (constraint.includes("unique_code")) {
                    return "Ticket code already exists";
                }
                return "A record with this information already exists";
            }

            case "23503":
                return "Operation failed due to related records in other tables";

            case "23514": {
                if (error.message.includes("event_dates_check")) {
                    return "End date must be after start date";
                }
                return "The provided data failed validation rules";
            }

            case "23502": {
                const columnMatch: RegExpMatchArray | null = error.message.match(/column "(.+?)"/);
                const column: string | undefined = columnMatch ? columnMatch[1] : "unknown";
                return `The ${column} field is required`;
            }

            case "22P02": {
                if (error.message.includes("enum")) {
                    return "Invalid enum value provided";
                }
                return "Invalid data format";
            }

            case "22008":
                return "Invalid date or time value";

            default:
                return "Database error occurred";
        }
    }

    return error instanceof Error ? error.message : "An unknown error occurred";
}

export function isDatabaseError(error: unknown): boolean {
    return (
        error instanceof pg.PostgresError &&
        (isUniqueConstraintError(error) ||
            isForeignKeyConstraintError(error) ||
            isCheckConstraintError(error) ||
            isNotNullConstraintError(error) ||
            isInvalidDateError(error) ||
            isEnumValueError(error))
    );
}
