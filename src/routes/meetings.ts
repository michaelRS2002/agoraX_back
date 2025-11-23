import express, { Request, Response } from 'express';
import GlobalDAO from '../dao/globalDAO';
import { MeetingModel } from '../models/meeting';
import crypto from 'crypto';

const router = express.Router();
const meetingsDao = new GlobalDAO('meetings', 'id');

function generateRoomId() {
  // short url-safe id
  return crypto.randomBytes(6).toString('base64url');
}

// POST /meetings/create
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

// GET /meetings/:roomId
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

export default router;
