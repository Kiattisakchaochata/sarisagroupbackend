import { Router } from 'express';
import {
  adminListEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
} from '../../controllers/event.controller.js';

const router = Router();
router.get('/', adminListEvents);
router.post('/', adminCreateEvent);
router.patch('/:id', adminUpdateEvent);
router.delete('/:id', adminDeleteEvent);
export default router;