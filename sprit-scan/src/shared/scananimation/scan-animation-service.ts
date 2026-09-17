import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScanAnimationService {
  isVisible = signal(false);

  showAnimation(isLoading: boolean): void {
    isLoading ? this.isVisible.set(true) : this.isVisible.set(false);
  }
}
