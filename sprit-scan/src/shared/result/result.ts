import { Component, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result.html',
})
export class Result {
  fields: { label: string; key: keyof HistoryEntry }[] = [
    { label: 'Name', key: 'name' },
    { label: 'Taste', key: 'taste' },
    { label: 'Origin', key: 'origin' },
    { label: 'Recommendation', key: 'recommendation' },
    { label: 'Year', key: 'year' },
    { label: 'Customer Review', key: 'customerreview' },
    { label: 'Raw Materials', key: 'rawmaterials' },
    { label: 'Alternative', key: 'alternative' },
    { label: 'Price', key: 'price' },
  ];

  entry = input<HistoryEntry>({
    id: 0,
    name: '',
    date: '',
    description: '',
    taste: '',
    origin: '',
    recommendation: '',
    year: '',
    customerreview: '',
    rawmaterials: '',
    alternative: '',
    price: '',
  });
}
