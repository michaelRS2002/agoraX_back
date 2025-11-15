/**
 * Represents a user within the application.
 */
export interface UserModel {
    name: string;
    email: string;
    age: number;
    password: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
};
