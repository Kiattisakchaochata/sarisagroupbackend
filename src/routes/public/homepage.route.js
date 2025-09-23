// src/routes/public/homepage.route.js
import express from 'express'
import { getHomepagePublic } from '../../controllers/homepage.controller.js'

const router = express.Router()

// จะกลายเป็น /api/homepage
router.get('/homepage', getHomepagePublic)

export default router