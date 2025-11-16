/**
 * Logger Utility
 * Centralized logging with different levels
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;
    this.logDir = path.join(__dirname, '..', '..', 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  writeToFile(level, message, meta) {
    if (process.env.NODE_ENV === 'production') {
      const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
      const formattedMessage = this.formatMessage(level, message, meta);
      fs.appendFileSync(logFile, formattedMessage + '\n');
    }
  }

  error(message, meta) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(`❌ ${message}`, meta || '');
      this.writeToFile('ERROR', message, meta);
    }
  }

  warn(message, meta) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(`⚠️  ${message}`, meta || '');
      this.writeToFile('WARN', message, meta);
    }
  }

  info(message, meta) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(`ℹ️  ${message}`, meta || '');
      this.writeToFile('INFO', message, meta);
    }
  }

  debug(message, meta) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(`🐛 ${message}`, meta || '');
      this.writeToFile('DEBUG', message, meta);
    }
  }
}

export default new Logger();
