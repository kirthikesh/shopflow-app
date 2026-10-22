import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const metrics = {
  emailsSent: new client.Counter({
    name: 'shopflow_notifications_sent_total',
    help: 'Emails sent, by payment status.',
    labelNames: ['status'],
    registers: [register],
  }),
  messagesFailed: new client.Counter({
    name: 'shopflow_notification_messages_failed_total',
    help: 'Messages that failed, by kind (permanent, transient).',
    labelNames: ['kind'],
    registers: [register],
  }),
};
