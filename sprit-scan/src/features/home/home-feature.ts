import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';

type LastScan = {
  id: number;
  name: string;
  date: string;
};

@Component({
  selector: 'home-feature',
  imports: [TemplatePageComponent, ButtonComponent, InputEmailComponent, InputPasswordComponent],
  templateUrl: './home-feature.html',
})
export class HomeFeature {
  protected readonly title = signal('sprit-scan');
  lastScans = signal<LastScan[]>([
    { id: 1, name: 'Jack Daniels', date: '2024-06-01' },
    { id: 2, name: 'Bree', date: '2024-06-02' },
    { id: 3, name: 'Averna', date: '2024-06-03' },
    { id: 4, name: 'Jack Daniels', date: '2024-06-04' },
    { id: 5, name: 'Bree', date: '2024-06-05' },
    { id: 6, name: 'Averna', date: '2024-06-06' },
    { id: 7, name: 'Jack Daniels', date: '2024-06-07' },
    { id: 8, name: 'Bree', date: '2024-06-08' },
  ]);

  get Scans(): LastScan[] {
    return this.lastScans();
  }
}
