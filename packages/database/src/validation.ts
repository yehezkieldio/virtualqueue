import { env } from "@virtualqueue/environment";

export function validatePassword(password: string): boolean {
    if (!password || password.length < 8) {
        return false;
    }

    if (env.NODE_ENV === "development") {
        return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
    }

    const hasUpperCase: boolean = /[A-Z]/.test(password);
    const hasLowerCase: boolean = /[a-z]/.test(password);
    const hasNumbers: boolean = /[0-9]/.test(password);
    const hasSpecialChar: boolean = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    const hasNoCommonPatterns: boolean = !/(123456|password|qwerty|abc123)/i.test(password);

    const hasNoSequences: boolean =
        !/(abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz|12345|23456|34567|45678|56789)/i.test(
            password
        );

    // Check for repeating characters (like "aaa" or "111")
    const hasNoRepeats: boolean = !/(.)\1{2,}/.test(password);

    if (env.NODE_ENV === "test") {
        return hasUpperCase && hasLowerCase && hasNumbers;
    }

    return (
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar &&
        hasNoCommonPatterns &&
        hasNoSequences &&
        hasNoRepeats
    );
}

export function getPasswordValidationIssues(password: string): string[] {
    const issues: string[] = [];

    if (!password || password.length < 8) {
        issues.push("Password must be at least 8 characters long");
        return issues;
    }

    if (env.NODE_ENV === "development") {
        if (!/[A-Za-z]/.test(password)) {
            issues.push("Password must contain at least one letter");
        }
        if (!/[0-9]/.test(password)) {
            issues.push("Password must contain at least one number");
        }
        return issues;
    }

    if (!/[A-Z]/.test(password)) {
        issues.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
        issues.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
        issues.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        issues.push("Password must contain at least one special character");
    }

    if (/(123456|password|qwerty|abc123)/i.test(password)) {
        issues.push("Password contains a common pattern that is easily guessable");
    }

    if (
        /(abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz|12345|23456|34567|45678|56789)/i.test(
            password
        )
    ) {
        issues.push("Password contains a sequential pattern");
    }

    if (/(.)\1{2,}/.test(password)) {
        issues.push("Password contains repeating characters");
    }

    return issues;
}
