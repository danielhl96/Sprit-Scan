import { Component, signal, computed, inject, output } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { Result } from '../../shared/result/result';
import { ScanFeature } from '../scan/scan-feature';
type HistoryEntry = {
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
};
@Component({
  selector: 'home-feature',
  imports: [TemplatePageComponent, ModalComponent, Result, ScanFeature],
  templateUrl: './home-feature.html',
})
export class HomeFeature {
  protected readonly title = signal('sprit-scan');
  toggleModal = signal(false);
  toggleModalChange = output<boolean>();
  selectedEntry = signal<HistoryEntry | null>(null);

  lastScans = signal<HistoryEntry[]>([
    {
      id: 1,
      name: 'Jack Daniels',
      date: '2024-06-01',
      taste: 'Smooth',
      origin: 'USA',
      recommendation: 'Best served neat',
      year: '2024',
      customerreview: 'Excellent whiskey!',
      rawmaterials: 'Corn, Barley, Rye',
      description: 'Scanned Jack Daniels',
    },
    {
      id: 2,
      name: 'Bree',
      date: '2024-06-02',
      taste: 'Fruity',
      origin: 'France',
      recommendation: 'Best served chilled',
      year: '2024',
      customerreview: 'Refreshing and light!',
      rawmaterials: 'Grapes, Sugar, Water',
      description: 'Scanned Bree',
    },
    {
      id: 3,
      name: 'Averna',
      date: '2024-06-03',
      taste: 'Bitter',
      origin: 'Italy',
      recommendation: 'Best served on the rocks',
      year: '2024',
      customerreview: 'Bitter and strong!',
      rawmaterials: 'Herbs, Roots, Citrus',
      description: 'Scanned Averna',
    },
    {
      id: 4,
      name: 'Don Papa Sherry Cask',
      date: '2024-06-04',
      taste: 'Smooth',
      origin: 'Philippines',
      recommendation: 'Best served neat',
      year: '2024',
      customerreview: 'Rich and flavorful!',
      rawmaterials: 'Sugarcane, Oak',
      description: 'Scanned Don Papa Sherry Cask',
    },
  ]);

  get Scans(): HistoryEntry[] {
    return this.lastScans();
  }

  openFileInput() {
    document.getElementById('fileInput')?.click();
  }
}
