import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'scan-feature',
  templateUrl: './scan-feature.html',
  standalone: true,
})
export class ScanFeature {
  scannedFile = signal<File | null>(null);

  handleFileSelected(file: File): void {
    this.scannedFile.set(file);
    console.log('File selected:', file);
  }
}
