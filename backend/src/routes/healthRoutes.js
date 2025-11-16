/**
 * Health Check Routes
 * Endpoints for monitoring server and service health
 */

import express from 'express';
import config from '../config/index.js';
import { getEmailConfigStatus } from '../utils/nodemailerHelper.js';

const router = express.Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with service status
 */
router.get('/detailed', (req, res) => {
  const services = {
    gemini: !!config.gemini.apiKey,
    llama: config.llama.enabled,
    huggingface: !!config.huggingface.apiKey,
    stt: config.stt.provider,
    tts: config.tts.enabled,
    database: config.database.type
  };

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
    services: services,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

/**
 * GET /api/health/email
 * Check email service status
 */
router.get('/email', (req, res) => {
  const emailStatus = getEmailConfigStatus();

  res.json({
    success: true,
    email: emailStatus,
    timestamp: new Date().toISOString()
  });
});

export default router;
