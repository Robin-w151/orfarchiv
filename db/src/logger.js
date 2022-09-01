const { createLogger, format, transports } = require('winston');
const { align, colorize, combine, printf, timestamp } = format;

const logger = createLogger({
  level: 'info',
  format: combine(
    align(),
    colorize(),
    timestamp(),
    printf((log) => `${log.timestamp} ${log.level} ${log.message}`),
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
