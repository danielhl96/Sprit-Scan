import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemplatePageModule } from '../shared/template-page/template-page-module';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TemplatePageModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('sprit-scan');
}
