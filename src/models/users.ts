/**
 * Represents a user within the AgoraX application.
 * 
 * @interface UserModel
 * @description This interface defines the structure of user data stored in Firestore.
 * It supports both local authentication (email/password) and Firebase Auth integration.
 * 
 * @example
 * ```typescript
 * const user: UserModel = {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   age: 25,
 *   password: "hashedPassword123",
 *   firebaseUid: "firebase-uid-123",
 *   photoURL: "https://example.com/photo.jpg"
 * };
 * ```
 */
export interface UserModel {
    /**
     * The full name of the user.
     * @type {string}
     */
    name: string;

    /**
     * The email address of the user. Must be unique across all users.
     * @type {string}
     */
    email: string;

    /**
     * The age of the user in years.
     * @type {number}
     */
    age: number;

    /**
     * The hashed password for local authentication.
     * Optional for users managed exclusively by Firebase Auth.
     * Should be hashed using bcrypt before storage.
     * @type {string | null}
     * @optional
     */
    password?: string | null;

    /**
     * A unique token used for password reset operations.
     * Generated when user requests a password reset.
     * @type {string}
     * @optional
     */
    resetPasswordToken?: string;

    /**
     * The expiration timestamp for the password reset token.
     * Tokens are typically valid for 15 minutes.
     * @type {Date}
     * @optional
     */
    resetPasswordExpires?: Date;

    /**
     * The Firebase Authentication UID for users authenticated via Firebase.
     * Used to link Firebase Auth users with Firestore user records.
     * @type {string}
     * @optional
     */
    firebaseUid?: string;

    /**
     * URL to the user's profile photo or avatar.
     * Can be a Firebase Storage URL or external URL.
     * @type {string}
     * @optional
     */
    photoURL?: string;
};
