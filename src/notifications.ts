/**
 * Suporte a notificações sonoras (Web Audio API) e notificações nativas do sistema (Web Notifications API).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

/** Toca um aviso sonoro harmônico suave quando chega uma mensagem no LAB. */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.06);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {
    // Áudio bloqueado por política do navegador ou indisponível
  }
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export interface NotifyBrowserOptions {
  body: string;
  tag?: string;
  renotify?: boolean;
  icon?: string;
  badge?: string;
}

export function notifyBrowser(title: string, options?: NotifyBrowserOptions, onClick?: () => void): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") return null;
  try {
    const notif = new Notification(title, {
      icon: options?.icon ?? "/favicon.svg",
      badge: options?.badge ?? "/favicon.svg",
      body: options?.body,
      tag: options?.tag,
      ...(options?.renotify !== undefined ? { renotify: options.renotify } : { renotify: true }),
    } as NotificationOptions);
    if (onClick) {
      notif.onclick = () => {
        try {
          window.focus();
        } catch {
          // window.focus pode ser bloqueado
        }
        onClick();
        notif.close();
      };
    }
    return notif;
  } catch (err) {
    console.warn("Não foi possível disparar notificação do navegador:", err);
    return null;
  }
}
