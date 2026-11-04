import { Component, inject, signal } from '@angular/core';
import { ScanAnimationService } from '../../shared/scananimation/scan-animation-service';
import { ScanAnimationComponent } from '../../shared/scananimation/scan-animation-component';
import { AiFeatureService } from '../ai-expert/ai-expert-feature.service';
import { Result } from '../../shared/result/result';
import { ModalComponent } from '../../shared/modal/modal-component';
import imageCompression from 'browser-image-compression';

type ScanResultEntry = {
  id: number;
  name: string;
  date: string;
  description: string;
  taste?: string;
  origin?: string;
  recommendation?: string;
  year?: string;
  customerreview?: string;
  rawmaterials?: string;
  alternative?: string;
  price?: string;
};

@Component({
  selector: 'scan-feature',
  templateUrl: './scan-feature.html',
  standalone: true,
  imports: [ScanAnimationComponent, Result, ModalComponent],
})
export class ScanFeature {
  imageUrl = signal<string>('');
  toggleModal = signal(false);
  selectedEntry = signal<ScanResultEntry | null>(null);

  private readonly scanAnimationService = inject(ScanAnimationService);
  private readonly aiFeatureService = inject(AiFeatureService);

  protected async handleFileSelected(file: File): Promise<void> {
    if (!file) {
      return;
    }
    const compressedImage = await this.compressImage(file);
    const dataUrl = await this.readFileAsDataUrl(compressedImage);
    this.imageUrl.set(dataUrl);
    this.scanFile(dataUrl);
  }

  private async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Original file size: ${file.size / 1024 / 1024} MB`);
      console.log(`Compressed file size: ${compressedFile.size / 1024 / 1024} MB`);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  protected scanFile(imageUrl: string) {
    this.scanAnimationService.showAnimation(true);
    this.aiFeatureService.sprits(imageUrl).subscribe({
      next: (response: any) => {
        console.log('AI response received:', response);
        this.scanAnimationService.showAnimation(false);
        this.selectedEntry.set(this.mapResponseToEntry(response));
        this.toggleModal.set(true);
      },
      error: (error) => {
        console.error('Error from AI service:', error);
        this.scanAnimationService.showAnimation(false);
      },
    });
  }

  private mapResponseToEntry(response: Record<string, unknown>): ScanResultEntry {
    return {
      id: Date.now(),
      date: new Date().toISOString(),
      name: this.textValue(response['name'], 'Unknown Spirit'),
      description: this.textValue(response['description'], 'No Description'),
      taste: this.optionalTextValue(response['taste']),
      origin: this.optionalTextValue(response['origin']),
      recommendation: this.optionalTextValue(response['recommendation']),
      year: this.optionalTextValue(response['year']),
      customerreview: this.optionalTextValue(response['customerReview']),
      rawmaterials: this.optionalTextValue(response['rawMaterials']),
      alternative: this.optionalTextValue(response['alternative']),
      price: this.optionalTextValue(response['price']),
    };
  }

  private textValue(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private optionalTextValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
