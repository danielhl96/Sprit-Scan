import { Component, inject, signal } from '@angular/core';
import { ScanAnimationService } from '../../shared/scananimation/scan-animation-service';
import { ScanAnimationComponent } from '../../shared/scananimation/scan-animation-component';
import { AiFeatureService } from '../ai-expert/ai-expert-feature.service';
import { Result } from '../../shared/result/result';
import { ModalComponent } from '../../shared/modal/modal-component';
import { NotificationService } from '../../shared/notification/notification-service';

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

// The API Gateway accepts JSON bodies up to 10 MB (see BODY_SIZE_LIMIT in
// sprit-scan/backend/src/api-gateway/main.ts). The uploaded image is sent as
// a base64 data URL, which inflates the raw file size by roughly 1.37x, plus
// a small amount of JSON/field overhead. Instead of rejecting large images,
// they are automatically downscaled/recompressed on the client so the
// resulting base64 payload comfortably fits within the server limit.
const MAX_IMAGE_SIZE_BYTES = 7 * 1024 * 1024; // 7 MB target max for uploaded image payload
const MAX_IMAGE_DIMENSION = 2000; // max width/height in pixels after resizing
const COMPRESSED_IMAGE_QUALITY = 0.8; // JPEG quality used when recompressing
const MAX_COMPRESSION_ATTEMPTS = 5; // lower quality further if still too large

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
  private readonly notificationService = inject(NotificationService);

  protected handleFileSelected(file: File): void {
    if (!file) {
      return;
    }

    this.compressImage(file)
      .then((imageUrl) => {
        this.imageUrl.set(imageUrl);
        this.scanFile(imageUrl);
      })
      .catch((error) => {
        console.error('Error compressing image:', error);
        this.notificationService.showNotification(
          'Image could not be processed. Please choose a different image.',
          'error',
        );
      });
  }

  /**
   * Downscales and recompresses an oversized image on the client so the
   * resulting base64 payload stays within the server's body size limit.
   * The image is first constrained to MAX_IMAGE_DIMENSION on its longest
   * side, then re-encoded as JPEG, progressively lowering quality (and, if
   * still too large, dimensions) until it fits under MAX_IMAGE_SIZE_BYTES.
   */
  private async compressImage(file: File): Promise<string> {
    const originalDataUrl = await this.readFileAsDataUrl(file);
    const image = await this.loadImage(originalDataUrl);

    let { width, height } = this.scaleToMaxDimension(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      MAX_IMAGE_DIMENSION,
    );

    let quality = COMPRESSED_IMAGE_QUALITY;
    let dataUrl = this.drawToDataUrl(image, width, height, quality);

    for (let attempt = 0; attempt < MAX_COMPRESSION_ATTEMPTS; attempt++) {
      if (this.dataUrlByteSize(dataUrl) <= MAX_IMAGE_SIZE_BYTES) {
        return dataUrl;
      }

      if (quality > 0.4) {
        quality -= 0.15;
      } else {
        width = Math.round(width * 0.8);
        height = Math.round(height * 0.8);
      }

      dataUrl = this.drawToDataUrl(image, width, height, quality);
    }

    return dataUrl;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = dataUrl;
    });
  }

  private scaleToMaxDimension(
    width: number,
    height: number,
    maxDimension: number,
  ): { width: number; height: number } {
    const largestSide = Math.max(width, height);
    if (largestSide <= maxDimension) {
      return { width, height };
    }
    const scale = maxDimension / largestSide;
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
  }

  private drawToDataUrl(
    image: HTMLImageElement,
    width: number,
    height: number,
    quality: number,
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available');
    }
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  private dataUrlByteSize(dataUrl: string): number {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    // Each base64 char encodes 6 bits; account for '=' padding.
    const padding = (base64.match(/=+$/) ?? [''])[0].length;
    return Math.floor((base64.length * 3) / 4) - padding;
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
