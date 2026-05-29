import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { I18nService } from './i18n.service';
import { AuthService } from './auth.service';

export interface LiveNotification {
  id: number;
  message: string;
  at: string;
}

export interface WsSessionProfile {
  id: number;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private socket: Socket | null = null;
  private listenersBound = false;
  private lastSessionRevision = -1;

  readonly connected = signal(false);
  readonly notifications = signal<LiveNotification[]>([]);
  readonly serverProfile = signal<WsSessionProfile | null>(null);

  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.disconnect());
  }

  /** Reconnect when cookie session changes (other tab login, focus refresh). */
  syncWithAuth(): void {
    const revision = this.auth.sessionRevision();
    if (revision === this.lastSessionRevision) return;
    this.lastSessionRevision = revision;

    if (!this.auth.isLoggedIn()) {
      this.disconnect();
      return;
    }

    this.reconnect();
  }

  connect(): void {
    if (!this.auth.isLoggedIn()) return;
    this.lastSessionRevision = this.auth.sessionRevision();

    if (this.socket?.connected) return;

    this.openSocket();
  }

  disconnect(): void {
    this.teardownSocket();
    this.connected.set(false);
    this.serverProfile.set(null);
  }

  private reconnect(): void {
    this.teardownSocket();
    if (this.auth.isLoggedIn()) {
      this.openSocket();
    } else {
      this.connected.set(false);
      this.serverProfile.set(null);
    }
  }

  private openSocket(): void {
    this.socket = io(environment.wsUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    if (!this.listenersBound) {
      this.bindListeners();
      this.listenersBound = true;
    }
  }

  private teardownSocket(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.listenersBound = false;
  }

  private bindListeners(): void {
    const attach = () => {
      const socket = this.socket;
      if (!socket) return;

      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connected');
      socket.off('sale:created');
      socket.off('medicine:created');
      socket.off('medicines:import');
      socket.off('prescription:realized');
      socket.off('delivery:created');

      socket.on('connect', () => this.connected.set(true));
      socket.on('disconnect', () => {
        this.connected.set(false);
        this.serverProfile.set(null);
      });
      socket.on('connect_error', () => {
        this.connected.set(false);
        this.serverProfile.set(null);
      });

      socket.on('connected', (p: WsSessionProfile) => {
        if (p?.id != null && p.username && p.role) {
          this.serverProfile.set(p);
          if (!this.auth.matchesSession(p)) {
            this.auth.refreshSession().subscribe();
          }
        }
        const name = p?.username ? ` (${p.username})` : '';
        this.push(`${this.i18n.t('ws.connected')}${name}`);
      });

      socket.on('sale:created', (p: { id: number; total_price: number }) => {
        this.push(`${this.i18n.t('ws.saleCreated')} #${p.id} — ${Number(p.total_price).toFixed(2)} PLN`);
      });

      socket.on('medicine:created', (p: { id: number }) => {
        this.push(`${this.i18n.t('ws.medicineCreated')} #${p.id}`);
      });

      socket.on('medicines:import', (p: { inserted?: number; updated?: number; skipped?: number; count?: number }) => {
        const inserted = p.inserted ?? p.count ?? 0;
        const updated = p.updated ?? 0;
        if (updated > 0) {
          this.push(`${this.i18n.t('ws.importDone')}: +${inserted}, ${this.i18n.t('ws.updated')} ${updated}`);
        } else {
          this.push(`${this.i18n.t('ws.importDone')}: ${inserted}`);
        }
      });

      socket.on('prescription:realized', (p: { id: number }) => {
        this.push(`${this.i18n.t('ws.prescriptionRealized')} #${p.id}`);
      });

      socket.on('delivery:created', (p: { id: number; quantity: number }) => {
        this.push(`${this.i18n.t('ws.deliveryCreated')} #${p.id} (+${p.quantity})`);
      });
    };

    attach();
  }

  private push(message: string): void {
    const list = [{ id: Date.now(), message, at: new Date().toISOString() }, ...this.notifications()].slice(0, 8);
    this.notifications.set(list);
  }
}
