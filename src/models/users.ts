/**
 * Represents a user within the application.
 */
export interface UserModel {
    name: string;
    email: string;
    age: number;
    // password is optional for users managed by Firebase Auth
    password?: string | null;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    // Firebase UID (if user authenticated via Firebase Auth)
    firebaseUid?: string;
    // URL to user's avatar/photo
    photoURL?: string;
};
