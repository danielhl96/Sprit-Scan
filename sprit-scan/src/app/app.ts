import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemplatePageComponent } from '../shared/template-page/template-page-component';
import { ButtonComponent } from '../shared/button/button-component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TemplatePageComponent, ButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('sprit-scan');
}
