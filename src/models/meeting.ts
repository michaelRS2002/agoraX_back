/**
 * Represents a video meeting room in the AgoraX platform.
 * 
 * @interface MeetingModel
 * @description This interface defines the structure of meeting data stored in Firestore.
 * Meetings can have multiple participants and track both their user IDs and email addresses.
 * 
 * @example
 * ```typescript
 * const meeting: MeetingModel = {
 *   hostId: "user123",
 *   title: "Team Standup",
 *   roomId: "abc123xyz",
 *   createdAt: "2025-12-09T10:00:00.000Z",
 *   participants: ["user456", "user789"],
 *   participantsEmails: ["alice@example.com", "bob@example.com"],
 *   isActive: true,
 *   meta: { duration: 30, recordingEnabled: false }
 * };
 * ```
 */
export interface MeetingModel {
  /**
   * The user ID of the meeting host who created the meeting.
   * The host typically has special permissions like ending the meeting.
   * @type {string}
   */
  hostId: string;

  /**
   * The title or name of the meeting.
   * @type {string}
   * @optional
   * @default "Meeting"
   */
  title?: string;

  /**
   * A unique identifier for the meeting room.
   * This is a short, URL-safe string used to join the meeting.
   * Generated automatically using crypto.randomBytes().
   * @type {string}
   */
  roomId: string;

  /**
   * The ISO 8601 timestamp when the meeting was created.
   * @type {string}
   * @optional
   * @example "2025-12-09T10:00:00.000Z"
   */
  createdAt?: string;

  /**
   * An array of user IDs for participants who have joined or been invited to the meeting.
   * @type {string[]}
   * @optional
   * @default []
   */
  participants?: string[];

  /**
   * An array of email addresses for participants in the meeting.
   * Used for sending meeting invitations and notifications.
   * @type {string[]}
   * @optional
   * @default []
   */
  participantsEmails?: string[];

  /**
   * Indicates whether the meeting is currently active.
   * Active meetings can be joined; inactive meetings are archived.
   * @type {boolean}
   * @optional
   * @default true
   */
  isActive?: boolean;

  /**
   * Additional metadata about the meeting.
   * Can store custom properties like recording status, duration, settings, etc.
   * @type {Record<string, any>}
   * @optional
   * @default {}
   */
  meta?: Record<string, any>;
}
