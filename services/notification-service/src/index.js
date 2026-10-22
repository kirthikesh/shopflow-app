import { ServiceBusClient } from '@azure/service-bus';
import express from 'express';
import nodemailer from 'nodemailer';

import { createPaymentHandler, PermanentError } from './handler.js';
import { log } from './log.js';
import { metrics, register } from './metrics.js';

const config = {
  port: Number(process.env.PORT || 8084),
  connectionString: process.env.SERVICEBUS_CONNECTION_STRING,
  topic: process.env.PAYMENT_EVENTS_TOPIC || 'payment-events',
  subscription: process.env.PAYMENT_EVENTS_SUBSCRIPTION || 'notification-service',
  smtpHost: process.env.SMTP_HOST || 'localhost',
  smtpPort: Number(process.env.SMTP_PORT || 1025),
  from: process.env.MAIL_FROM || 'ShopFlow <orders@shopflow.local>',
};

if (!config.connectionString) {
  log.error({ msg: 'SERVICEBUS_CONNECTION_STRING is required' });
  process.exit(1);
}

const mailer = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });
const handle = createPaymentHandler({ mailer, from: config.from, metrics, log });

let ready = false;
const sbClient = new ServiceBusClient(config.connectionString);
const receiver = sbClient.createReceiver(config.topic, config.subscription);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The emulator takes a while to start, so keep trying until the subscription answers.
async function waitForBroker() {
  for (let delay = 1000; ; delay = Math.min(delay * 2, 30000)) {
    try {
      await receiver.peekMessages(1);
      return;
    } catch (err) {
      log.warn({ msg: 'service bus not reachable yet, retrying', error: err.message, retryInMs: delay });
      await sleep(delay);
    }
  }
}

async function startConsumer() {
  await waitForBroker();
  receiver.subscribe(
    {
      processMessage: async (message) => {
        try {
          await handle(message.body);
          await receiver.completeMessage(message);
        } catch (err) {
          if (err instanceof PermanentError) {
            metrics.messagesFailed.inc({ kind: 'permanent' });
            log.error({ msg: 'dead-lettering message', messageId: message.messageId, error: err.message });
            await receiver.deadLetterMessage(message, {
              deadLetterReason: 'InvalidMessage',
              deadLetterErrorDescription: err.message,
            });
          } else {
            metrics.messagesFailed.inc({ kind: 'transient' });
            log.warn({ msg: 'send failed, abandoning for retry', messageId: message.messageId, error: err.message });
            await receiver.abandonMessage(message);
          }
        }
      },
      processError: async (args) => {
        log.error({ msg: 'service bus error', source: args.errorSource, error: args.error.message });
      },
    },
    { autoCompleteMessages: false, maxConcurrentCalls: 5 },
  );
  ready = true;
  log.info({ msg: 'subscribed', topic: config.topic, subscription: config.subscription });
}

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', (_req, res) =>
  ready ? res.json({ status: 'ready' }) : res.status(503).json({ status: 'not connected to service bus' }),
);
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const server = app.listen(config.port, () => log.info({ msg: 'http listening', port: config.port }));
startConsumer().catch((err) => {
  log.error({ msg: 'consumer failed to start', error: err.message });
  process.exit(1);
});

async function shutdown(signal) {
  log.info({ msg: 'shutting down', signal });
  ready = false;
  server.close();
  await receiver.close();
  await sbClient.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
