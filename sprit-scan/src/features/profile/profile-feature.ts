import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

@Component({
  selector: 'profile-feature',
  imports: [TemplatePageComponent, ButtonComponent, InputEmailComponent, InputPasswordComponent],
  templateUrl: './profile-feature.html',
})
export class ProfileFeature {
  protected readonly title = signal('sprit-scan');
  protected readonly userProfile = signal<UserProfile>({
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
  });
}
