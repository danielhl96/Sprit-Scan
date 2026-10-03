import { Component, inject, input, output, signal } from '@angular/core';
import { ScanAnimationService } from '../../shared/scananimation/scan-animation-service';
import { ScanAnimationComponent } from '../../shared/scananimation/scan-animation-component';
import { AiFeatureService } from '../ai-expert/ai-expert-feature.service';

@Component({
  selector: 'scan-feature',
  templateUrl: './scan-feature.html',
  standalone: true,
  imports: [ScanAnimationComponent],
})
export class ScanFeature {
  scannedFile = signal<File | null>(null);
  imageUrl = signal<string>('');
  private readonly scanAnimationService = inject(ScanAnimationService);
  private readonly aiFeatureService = inject(AiFeatureService);
  handleFileSelected(file: File): void {
    this.scannedFile.set(file);

    // Revoke any previous object URL to avoid memory leaks
    const previousUrl = this.imageUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    // Create a browser URL that points to the uploaded file's content
    this.imageUrl.set(URL.createObjectURL(file));

    this.scanAnimationService.showAnimation(true);
    console.log('File selected:', file);
    this.aiFeatureService.sprits(this.imageUrl()).subscribe({
      next: (response: any) => {
        console.log('AI response received:', response);
        this.scanAnimationService.showAnimation(false);
      },
      error: (error) => {
        console.error('Error from AI service:', error);
        this.scanAnimationService.showAnimation(false);
      },
    });
  }
}
