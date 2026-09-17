import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanAnimationService } from './scan-animation-service';
import { ButtonComponent } from '../button/button-component';
@Component({
  selector: 'app-scan-animation',
  templateUrl: './scan-animation-component.html',
  styleUrls: ['./scan-animation-component.css'],
  standalone: true,
  imports: [CommonModule, ButtonComponent],
})
export class ScanAnimationComponent {
  imageUrl = input('');
  private readonly service = inject(ScanAnimationService);
  animationVisible = this.service.isVisible;

  closeAnimation(): void {
    this.service.showAnimation(false);
  }
}
