import express from 'express';
import authRouter from './auth';
import meetingsRouter from './meetings';
import usersRouter from './users';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/meetings', meetingsRouter);
router.use('/users', usersRouter);

export default router;
