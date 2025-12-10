/**
 * Meeting management routes module for AgoraX.
 * 
 * @module routes/meetings
 * @description Provides endpoints for creating, retrieving, and managing virtual meeting rooms.
 * Includes functionality for generating unique room IDs, tracking participants, and managing
 * meeting lifecycle (active/inactive states).
 */

import express, { Request, Response } from 'express';
import GlobalDAO from '../dao/globalDAO';
import { MeetingModel } from '../models/meeting';
import crypto from 'crypto';

const router = express.Router();
const meetingsDao = new GlobalDAO('meetings', 'id');

/**
 * Generates a unique, URL-safe room ID for a meeting.
 * 
 * @function generateRoomId
 * @returns {string} A short, URL-safe base64 string
 * @description Uses cryptographic random bytes to ensure uniqueness
 * 
 * @example
 * const roomId = generateRoomId();
 * console.log(roomId); // "abc123xyz"
 */
function generateRoomId() {
  // short url-safe id
  return crypto.randomBytes(6).toString('base64url');
}

/**
 * Create a new virtual meeting room.
 * 
 * @route POST /meetings/create
 * @group Meetings - Meeting management operations
 * @param {string} hostId.body.required - User ID of the meeting host
 * @param {string} title.body - Title/name of the meeting
 * @param {string[]} participants.body - Array of participant user IDs to invite
 * @returns {object} 201 - Meeting created successfully with room details
 * @returns {object} 400 - Invalid input (hostId required)
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request:
 * {
 *   "hostId": "user123",
 *   "title": "Team Standup",
 *   "participants": ["user456", "user789"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "meeting": {
 *     "id": "meeting123",
 *     "hostId": "user123",
 *     "title": "Team Standup",
 *     "roomId": "abc123xyz",
 *     "createdAt": "2025-12-09T10:00:00.000Z",
 *     "participants": ["user456", "user789"],
 *     "isActive": true
 *   }
 * }
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { hostId, title, participants } = req.body;
    if (!hostId) return res.status(400).json({ success: false, message: 'hostId is required' });

    const roomId = generateRoomId();
    const now = new Date().toISOString();

    const meeting: MeetingModel = {
      hostId,
      title: title || 'Meeting',
      roomId,
      createdAt: now,
      participants: Array.isArray(participants) ? participants : [],
      isActive: true,
      meta: {},
    };

    const created = await meetingsDao.create(meeting as any);
    return res.status(201).json({ success: true, meeting: created });
  } catch (err: any) {
    console.error('Create meeting error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

/**
 * Retrieve meeting details by room ID.
 * 
 * @route GET /meetings/:roomId
 * @group Meetings - Meeting management operations
 * @param {string} roomId.path.required - The unique room identifier
 * @returns {object} 200 - Meeting details retrieved successfully
 * @returns {object} 404 - Meeting not found
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request:
 * GET /meetings/abc123xyz
 * 
 * Response:
 * {
 *   "success": true,
 *   "meeting": {
 *     "id": "meeting123",
 *     "hostId": "user123",
 *     "title": "Team Standup",
 *     "roomId": "abc123xyz",
 *     "participants": ["user456", "user789"],
 *     "isActive": true
 *   }
 * }
 */
router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const found = await meetingsDao.findOneBy({ roomId });
    if (!found) return res.status(404).json({ success: false, message: 'Meeting not found' });
    return res.status(200).json({ success: true, meeting: found });
  } catch (err: any) {
    console.error('Get meeting error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

/**
 * Add a participant to an existing meeting.
 * 
 * @route POST /meetings/:roomId/participants
 * @group Meetings - Meeting management operations
 * @description Adds a participant to a meeting by email and/or user ID.
 * Updates both the participants array (user IDs) and participantsEmails array.
 * Prevents duplicate entries for the same participant.
 * 
 * @param {string} roomId.path.required - The unique room identifier
 * @param {string} email.body - Participant's email address
 * @param {string} userId.body - Participant's user ID
 * @param {string} name.body - Participant's name
 * @returns {object} 200 - Participant added successfully
 * @returns {object} 400 - Invalid input (roomId and email/userId required)
 * @returns {object} 404 - Meeting not found
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request:
 * POST /meetings/abc123xyz/participants
 * {
 *   "email": "alice@example.com",
 *   "userId": "user999",
 *   "name": "Alice"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "meeting": {
 *     "id": "meeting123",
 *     "roomId": "abc123xyz",
 *     "participants": ["user456", "user789", "user999"],
 *     "participantsEmails": ["bob@example.com", "alice@example.com"]
 *   }
 * }
 */
router.post('/:roomId/participants', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { email, userId, name } = req.body || {};

    if (!roomId) return res.status(400).json({ success: false, message: 'roomId required' });
    if (!email && !userId) return res.status(400).json({ success: false, message: 'email or userId required' });

    const found = await meetingsDao.findOneBy({ roomId });
    if (!found) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const existingEmails: string[] = Array.isArray(found.participantsEmails) ? found.participantsEmails : [];
    const toAddEmail = email ? String(email).toLowerCase() : null;
    if (toAddEmail && !existingEmails.includes(toAddEmail)) existingEmails.push(toAddEmail);

    const updates: any = { participantsEmails: existingEmails };
    // also keep participants userIds array if provided
    if (userId) {
      const existingIds: string[] = Array.isArray(found.participants) ? found.participants : [];
      if (!existingIds.includes(String(userId))) existingIds.push(String(userId));
      updates.participants = existingIds;
    }

    const updated = await meetingsDao.update(found.id, updates);
    return res.status(200).json({ success: true, meeting: updated });
  } catch (err: any) {
    console.error('Add participant error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

export default router;
