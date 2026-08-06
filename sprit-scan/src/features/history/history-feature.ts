import { Component, computed, output, signal } from '@angular/core';
import { ModalComponent } from '../../shared/modal/modal-component';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { Result } from '../../shared/result/result';

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
  alternative?: string;
  price?: string;
};

@Component({
  selector: 'history-feature',
  imports: [ModalComponent, TemplatePageComponent, Result],
  templateUrl: './history-feature.html',
  standalone: true,
})
export class HistoryFeature {
  toggleModal = signal(false);
  inputSearch = signal('');
  selectedEntry = signal<HistoryEntry | null>(null);

  toggleModalChange = output<boolean>();
  listOfHistoryEntries = signal<HistoryEntry[]>([
    {
      id: 1,
      name: 'Jack Daniels',
      date: '2024-06-01',
      description: 'Scanned Jack Daniels',
      alternative: 'Jack Daniels',
      taste: 'Smooth',
      origin: 'USA',
      recommendation: 'Best served neat',
      year: '2024',
      customerreview: 'Excellent whiskey!',
      rawmaterials: 'Corn, Barley, Rye',
      price: '$30',
    },
    {
      id: 2,
      name: 'Bree',
      date: '2024-06-02',
      description: 'Scanned Bree',
      taste: 'Fruity',
      origin: 'France',
      recommendation: 'Best served chilled',
      year: '2024',
      customerreview: 'Refreshing and light!',
      rawmaterials: 'Grapes, Sugar, Water',
      alternative: 'Bree',
      price: '$25',
    },
    {
      id: 3,
      name: 'Averna',
      date: '2024-06-03',
      description: 'Scanned Averna',
      taste: 'Bitter',
      origin: 'Italy',
      recommendation: 'Best served on the rocks',
      year: '2024',
      customerreview: 'Bitter and strong!',
      rawmaterials: 'Herbs, Roots, Citrus',
      alternative: 'Averna',
      price: '$28',
    },
    {
      id: 4,
      name: 'Jack Daniels',
      date: '2024-06-04',
      description: 'Scanned Jack Daniels',
      taste: 'Smooth',
      origin: 'USA',
      recommendation: 'Best served neat',
      year: '2024',
      customerreview: 'Classic taste!',
      rawmaterials: 'Corn, Barley, Rye',
      alternative: 'Jack Daniels',
    },
    {
      id: 5,
      name: 'Bree',
      date: '2024-06-05',
      description: 'Scanned Bree',
      taste: 'Fruity',
      origin: 'France',
      recommendation: 'Best served chilled',
      year: '2024',
      customerreview: 'Light and refreshing!',
      rawmaterials: 'Grapes, Sugar, Water',
    },
    {
      id: 6,
      name: 'Averna',
      date: '2024-06-06',
      description: 'Scanned Averna',
      taste: 'Bitter',
      origin: 'Italy',
      recommendation: 'Best served on the rocks',
      year: '2024',
      customerreview: 'Strong and bold!',
      rawmaterials: 'Herbs, Roots, Citrus',
    },
    {
      id: 7,
      name: 'Jack Daniels',
      date: '2024-06-07',
      description: 'Scanned Jack Daniels',
      taste: 'Smooth',
      origin: 'USA',
      recommendation: 'Best served neat',
      year: '2024',
      customerreview: 'Rich and flavorful!',
      rawmaterials: 'Corn, Barley, Rye',
    },
    {
      id: 8,
      name: 'Bree',
      date: '2024-06-08',
      description: 'Scanned Bree',
      taste: 'Sweet',
      origin: 'France',
      recommendation: 'Best served chilled',
      year: '2024',
      customerreview: 'Great product!',
      rawmaterials: 'Grapes, Sugar, Water',
    },
  ]);

  inputSearchValue(value: string) {
    this.inputSearch.set(value);
  }

  selectModal(id: number) {
    this.selectedEntry.set(this.listOfHistoryEntries().find((entry) => entry.id === id) || null);
    if (this.selectedEntry()) {
      console.log('Selected Entry:', this.selectedEntry());
      this.toggleModal.set(true);
    }
  }

  HistoryEntry = computed(() => {
    return this.listOfHistoryEntries().filter((entry) =>
      entry.name.toLowerCase().includes(this.inputSearch().toLowerCase()),
    );
  });
}
