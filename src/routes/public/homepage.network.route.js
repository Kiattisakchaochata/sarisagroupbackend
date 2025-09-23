import express from 'express';
import { getNetworkLogosPublic } from '../../controllers/homepage.network.controller.js';

const router = express.Router();

// จะเป็น /api/homepage/network
router.get('/homepage/network', getNetworkLogosPublic);

export default router;