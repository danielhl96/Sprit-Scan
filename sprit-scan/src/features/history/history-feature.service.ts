import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type HistoryEntry = {
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

@Injectable({ providedIn: 'root' })
export class HistoryFeatureService {
  constructor(private httpClientService: HttpClient) {}

  getHistory() {
    return this.httpClientService.get<HistoryEntry[]>('http://localhost:3000/api/history/entries');
  }
}
