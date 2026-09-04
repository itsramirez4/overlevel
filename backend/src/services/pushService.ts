import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { logger } from '../utils/logger';
import { pushTokenService } from './pushTokenService';

const expo = new Expo();

/**
 * Sends one push notification to every given token, chunked the way Expo
 * requires, then prunes any token Expo immediately reports as dead
 * (DeviceNotRegistered) — best-effort throughout: a push failure is never
 * worth surfacing as an error to whatever triggered it (a follow, a cron
 * job), so this never throws.
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({ to, title, body, data, sound: 'default' }));
  const chunks = expo.chunkPushNotifications(messages);
  const deadTokens: string[] = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(chunk[i].to as string);
        }
      });
    } catch (err) {
      logger.error('Failed to send a push notification chunk', err);
    }
  }

  if (deadTokens.length > 0) {
    await pushTokenService.removeTokens(deadTokens).catch(() => {});
  }
}
