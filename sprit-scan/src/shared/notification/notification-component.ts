import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification-service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class NotificationComponent {
  private readonly service = inject(NotificationService);

  readonly notificationMessage = this.service.message;
  readonly notificationType = this.service.type;
  readonly isVisible = this.service.isVisible;
}
