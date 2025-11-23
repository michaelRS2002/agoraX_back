export interface MeetingModel {
  hostId: string;
  title?: string;
  roomId: string;
  createdAt?: string; // ISO
  participants?: string[]; // array of user ids
  isActive?: boolean;
  meta?: Record<string, any>;
}
