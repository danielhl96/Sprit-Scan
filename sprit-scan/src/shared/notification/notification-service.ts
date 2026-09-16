import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly message = signal('');
  readonly type = signal<NotificationType>('info');
  readonly isVisible = signal(false);

  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  showNotification(message: string, type: NotificationType = 'info', duration = 3000): void {
    this.message.set(message);
    this.type.set(type);
    this.isVisible.set(true);

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.isVisible.set(false);
    }, duration);
  }
}
