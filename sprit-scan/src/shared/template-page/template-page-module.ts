import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-template-page',
  templateUrl: './template-page-module.html',

  standalone: true,
  imports: [CommonModule],
})
export class TemplatePageModule {}
