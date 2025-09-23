import { Router } from 'express';
import { publicListEvents } from '../../controllers/event.controller.js';

const router = Router();
router.get('/', publicListEvents);
export default router;