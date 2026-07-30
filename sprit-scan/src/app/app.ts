import { Component, Output, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemplatePageComponent } from '../shared/template-page/template-page-component';
import { ButtonComponent } from '../shared/button/button-component';
import { InputEmailComponent } from '../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../shared/input-password/input-password-component';
import { ModalComponent } from '../shared/modal/modal-component';
import { NavbarComponent } from '../shared/navbar/navbar-component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    TemplatePageComponent,
    ButtonComponent,
    InputEmailComponent,
    InputPasswordComponent,
    ModalComponent,
    NavbarComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('sprit-scan');
  protected email = '';
  protected password = '';
  protected emailValid = false;
  protected passwordValid = false;
  protected toggleModal = false;

  /** Button ist nur aktiv, wenn beide Felder gültig sind */
  protected get buttonDisabled(): boolean {
    return !this.emailValid || !this.passwordValid;
  }
}
