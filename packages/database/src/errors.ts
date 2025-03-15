import pg from "postgres";

export const isUniqueConstraintError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "23505";
};

export const isForeignKeyConstraintError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "23503";
};

export const isCheckConstraintError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "23514";
};

export const isNotNullConstraintError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "23502";
};

export const isInvalidDateError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "22008";
};

export const isEnumValueError = (error: unknown): boolean => {
    return error instanceof pg.PostgresError && error.code === "22P02";
};

export const isDatabaseConnectionError = (error: unknown): boolean => {
    return (
        error instanceof pg.PostgresError &&
        (error.code === "08006" || error.code === "08001" || error.code === "08004")
    );
};

export const getErrorMessage = (error: unknown): string => {
    if (error instanceof pg.PostgresError) {
        switch (error.code) {
            case "23505": {
                // Extract the constraint name to provide more specific error messages
                const match = error.message.match(/unique constraint "(.+?)"/);
                const constraint = match ? match[1] : "unknown";

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
                // Extract the column name from the error message
                const columnMatch = error.message.match(/column "(.+?)"/);
                const column = columnMatch ? columnMatch[1] : "unknown";
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
};
