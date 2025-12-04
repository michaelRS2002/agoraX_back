export interface MeetingModel {
  hostId: string;
  title?: string;
  roomId: string;
  createdAt?: string; // ISO
  participants?: string[]; // array of user ids
  participantsEmails?: string[]; // array of participant emails
  isActive?: boolean;
  meta?: Record<string, any>;
}
