import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { EditEmailModal } from './edit-email.modal';
import { EditPasswordModal } from './edit-password-modal';
import { DeleteModal } from './delete-modal';
type UserProfile = {
  id: number;
  password: string;
  email: string;
};

@Component({
  selector: 'profile-feature',
  imports: [
    TemplatePageComponent,
    ButtonComponent,
    InputEmailComponent,
    InputPasswordComponent,
    ModalComponent,
    EditEmailModal,
    EditPasswordModal,
    DeleteModal,
  ],
  templateUrl: './profile-feature.html',
})
export class ProfileFeature {
  protected readonly title = signal('sprit-scan');
  protected readonly editIconPath =
    'm16.862 4.487 1.687-1.688a2.25 2.25 0 1 1 3.182 3.182L10.582 17.13a4.5 4.5 0 0 1-1.897 1.13L6 19.125l.865-2.685a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487ZM18 14.25v4.875A2.625 2.625 0 0 1 15.375 21.75H4.875A2.625 2.625 0 0 1 2.25 19.125V8.625A2.625 2.625 0 0 1 4.875 6H9.75';
  protected readonly userProfile = signal<UserProfile>({
    id: 1,
    password: 'John Doe',
    email: 'john.doe@example.com',
  });

  showPasswordModal = signal(false);
  showDeleteModal = signal(false);
  showEmailModal = signal(false);
  email = signal('');
  password = signal('');

  onEditEmail(): void {
    this.showEmailModal.set(true);
  }

  onEditPassword(): void {
    this.showPasswordModal.set(true);
  }

  get profile(): UserProfile {
    return this.userProfile();
  }
}
