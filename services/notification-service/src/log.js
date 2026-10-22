// Minimal structured (JSON) logger, so logs are easy to query in Log Analytics later.
const write = (level) => (fields) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, service: 'notification-service', ...fields }));

export const log = { info: write('info'), warn: write('warn'), error: write('error') };
