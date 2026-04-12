import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ServiceAlert {
  service: string;
  status: 'down' | 'recovered' | 'degraded';
  severity: AlertSeverity;
  error?: string;
  url?: string;
  responseTimeMs?: number;
  downSince?: Date;
  message: string;
}

interface AlertState {
  lastAlertSentAt: Date | null;
  consecutiveFailures: number;
  downSince: Date | null;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly alertStates = new Map<string, AlertState>();
  private readonly cooldownMs: number;
  private readonly alertEmailTo: string;
  private readonly webhookUrl: string | null;
  private readonly telegramBotToken: string | null;
  private readonly telegramChatId: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const cooldownMinutes = parseInt(
      this.configService.get<string>('ALERT_COOLDOWN_MINUTES', '15'),
      10,
    );
    this.cooldownMs = cooldownMinutes * 60 * 1000;
    this.alertEmailTo = this.configService.get<string>('ALERT_EMAIL_TO', '');
    this.webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL', '') || null;
    this.telegramBotToken = this.configService.get<string>('ALERT_TELEGRAM_BOT_TOKEN', '') || null;
    this.telegramChatId = this.configService.get<string>('ALERT_TELEGRAM_CHAT_ID', '') || null;

    if (!this.alertEmailTo && !this.telegramBotToken && !this.webhookUrl) {
      this.logger.warn('No alert channels configured — set ALERT_EMAIL_TO, ALERT_TELEGRAM_BOT_TOKEN, or ALERT_WEBHOOK_URL');
    }
  }

  getOrInitState(service: string): AlertState {
    if (!this.alertStates.has(service)) {
      this.alertStates.set(service, {
        lastAlertSentAt: null,
        consecutiveFailures: 0,
        downSince: null,
      });
    }
    return this.alertStates.get(service)!;
  }

  recordFailure(service: string): AlertState {
    const state = this.getOrInitState(service);
    state.consecutiveFailures++;
    if (!state.downSince) {
      state.downSince = new Date();
    }
    return state;
  }

  recordRecovery(service: string): { wasDown: boolean; downSince: Date | null } {
    const state = this.getOrInitState(service);
    const wasDown = state.consecutiveFailures > 0;
    const downSince = state.downSince;
    state.consecutiveFailures = 0;
    state.downSince = null;
    state.lastAlertSentAt = null;
    return { wasDown, downSince };
  }

  isInCooldown(service: string): boolean {
    const state = this.getOrInitState(service);
    if (!state.lastAlertSentAt) return false;
    return Date.now() - state.lastAlertSentAt.getTime() < this.cooldownMs;
  }

  async notify(alert: ServiceAlert): Promise<void> {
    const state = this.getOrInitState(alert.service);

    if (alert.status !== 'recovered' && this.isInCooldown(alert.service)) {
      this.logger.debug(
        `[Alert] Cooldown active for ${alert.service}, skipping notification`,
      );
      return;
    }

    this.logger.warn(
      `[Alert] ${alert.status.toUpperCase()} — ${alert.service}: ${alert.message}`,
    );

    state.lastAlertSentAt = new Date();

    await Promise.allSettled([
      this.sendTelegramAlert(alert),
    ]);
  }

  private async sendEmailAlert(alert: ServiceAlert): Promise<void> {
    if (!this.alertEmailTo || !this.emailService.isConfigured()) {
      return;
    }

    const isRecovery = alert.status === 'recovered';
    const emoji = isRecovery ? '✅' : alert.severity === 'critical' ? '🔴' : '🟡';
    const subject = `${emoji} [AgriTech] ${alert.service} is ${alert.status.toUpperCase()}`;

    const downDuration = alert.downSince
      ? this.formatDuration(Date.now() - alert.downSince.getTime())
      : null;

    const lines: string[] = [
      `<h2 style="color:${isRecovery ? '#16a34a' : '#dc2626'}">${emoji} ${alert.service} — ${alert.status.toUpperCase()}</h2>`,
      `<table style="border-collapse:collapse;font-family:monospace;font-size:14px">`,
      this.row('Time', new Date().toISOString()),
      this.row('Service', alert.service),
      this.row('Status', alert.status),
    ];

    if (alert.url) lines.push(this.row('URL', alert.url));
    if (alert.error) lines.push(this.row('Error', `<span style="color:#dc2626">${alert.error}</span>`));
    if (alert.responseTimeMs !== undefined) lines.push(this.row('Response time', `${alert.responseTimeMs}ms`));
    if (alert.downSince) lines.push(this.row('Down since', alert.downSince.toISOString()));
    if (downDuration) lines.push(this.row('Down duration', downDuration));

    lines.push('</table>');

    if (!isRecovery) {
      lines.push(
        `<p style="margin-top:16px;color:#6b7280;font-size:12px">Next alert for this service in ${this.cooldownMs / 60000} minutes (cooldown active).</p>`,
      );
    }

    try {
      await this.emailService.sendRaw(this.alertEmailTo, subject, lines.join('\n'));
      this.logger.log(`[Alert] Email sent to ${this.alertEmailTo} for ${alert.service}`);
    } catch (err) {
      this.logger.error(`[Alert] Failed to send email: ${err.message}`);
    }
  }

  private async sendWebhookAlert(alert: ServiceAlert): Promise<void> {
    if (!this.webhookUrl) return;

    const isRecovery = alert.status === 'recovered';
    const emoji = isRecovery ? '✅' : alert.severity === 'critical' ? '🔴' : '🟡';
    const color = isRecovery ? 3066993 : alert.severity === 'critical' ? 15158332 : 16776960;

    const downDuration = alert.downSince
      ? this.formatDuration(Date.now() - alert.downSince.getTime())
      : null;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      { name: 'Service', value: alert.service, inline: true },
      { name: 'Status', value: alert.status.toUpperCase(), inline: true },
    ];
    if (alert.url) fields.push({ name: 'URL', value: alert.url });
    if (alert.error) fields.push({ name: 'Error', value: alert.error });
    if (alert.responseTimeMs !== undefined) fields.push({ name: 'Response Time', value: `${alert.responseTimeMs}ms`, inline: true });
    if (downDuration) fields.push({ name: 'Down Duration', value: downDuration, inline: true });

    const payload = {
      text: `${emoji} **${alert.service}** is **${alert.status.toUpperCase()}**`,
      embeds: [
        {
          title: `${emoji} ${alert.service} — ${alert.status.toUpperCase()}`,
          description: alert.message,
          color,
          fields,
          timestamp: new Date().toISOString(),
          footer: { text: 'AgriTech Monitoring' },
        },
      ],
      username: 'AgriTech Monitor',
    };

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`[Alert] Webhook returned ${res.status}`);
      } else {
        this.logger.log(`[Alert] Webhook sent for ${alert.service}`);
      }
    } catch (err) {
      this.logger.error(`[Alert] Webhook failed: ${err.message}`);
    }
  }

  private async sendTelegramAlert(alert: ServiceAlert): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;

    const isRecovery = alert.status === 'recovered';
    const emoji = isRecovery ? '✅' : alert.severity === 'critical' ? '🔴' : '🟡';

    const downDuration = alert.downSince
      ? this.formatDuration(Date.now() - alert.downSince.getTime())
      : null;

    const lines: string[] = [
      `${emoji} <b>[AgriTech] ${alert.service.toUpperCase()} — ${alert.status.toUpperCase()}</b>`,
      '',
      `<b>Time:</b> ${new Date().toISOString()}`,
      `<b>Service:</b> ${alert.service}`,
      `<b>Status:</b> ${alert.status}`,
    ];

    if (alert.url) lines.push(`<b>URL:</b> <code>${alert.url}</code>`);
    if (alert.error) lines.push(`<b>Error:</b> <code>${alert.error}</code>`);
    if (alert.responseTimeMs !== undefined) lines.push(`<b>Response time:</b> ${alert.responseTimeMs}ms`);
    if (alert.downSince) lines.push(`<b>Down since:</b> ${alert.downSince.toISOString()}`);
    if (downDuration) lines.push(`<b>Down duration:</b> ${downDuration}`);

    if (!isRecovery) {
      lines.push('', `<i>Next alert in ${this.cooldownMs / 60000}min (cooldown)</i>`);
    }

    const telegramApiUrl = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;

    try {
      const res = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: lines.join('\n'),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`[Alert] Telegram returned ${res.status}: ${body}`);
      } else {
        this.logger.log(`[Alert] Telegram message sent for ${alert.service}`);
      }
    } catch (err) {
      this.logger.error(`[Alert] Telegram failed: ${err.message}`);
    }
  }

  private row(label: string, value: string): string {
    return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${label}</td><td style="padding:4px 0">${value}</td></tr>`;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
}
