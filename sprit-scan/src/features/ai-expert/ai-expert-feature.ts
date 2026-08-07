import { signal, computed, inject, Component } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';

@Component({
  selector: 'ai-expert-feature',
  imports: [TemplatePageComponent, ButtonComponent],
  templateUrl: './ai-expert-feature.html',
})
export class AiExpertFeature {}
