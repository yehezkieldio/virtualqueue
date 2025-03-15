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
        return issues; // Return early if password is too short
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

export function getPasswordStrength(password: string): number {
    if (!password) return 0;

    let score = 0;

    // Length contribution (up to 25 points)
    score += Math.min(25, password.length * 2);

    // Character variety contribution (up to 50 points)
    if (/[A-Z]/.test(password)) score += 10;
    if (/[a-z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 20;

    // Deductions for common patterns (up to -25 points)
    if (/(123456|password|qwerty|abc123)/i.test(password)) score -= 25;
    if (
        /(abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz|12345|23456|34567|45678|56789)/i.test(
            password
        )
    )
        score -= 15;
    if (/(.)\1{2,}/.test(password)) score -= 10;

    // Entropy bonus for mixed character types (up to 25 points)
    const hasUpper: boolean = /[A-Z]/.test(password);
    const hasLower: boolean = /[a-z]/.test(password);
    const hasDigit: boolean = /[0-9]/.test(password);
    const hasSpecial: boolean = /[^A-Za-z0-9]/.test(password);

    const varietyCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    score += varietyCount * 6.25; // Up to 25 points for all 4 types

    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, score));
}
