import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { Router } from '@angular/router';

@Component({
  selector: 'register-feature',
  imports: [TemplatePageComponent, ButtonComponent, InputEmailComponent, InputPasswordComponent],
  templateUrl: './register-feature.html',
})
export class RegisterFeature {
  protected readonly title = signal('sprit-scan');
  emailinput = signal('');
  passwordinput = signal('');
  passwordConfirmInput = signal('');
  emailValid = signal(false);
  passwordValid = signal(false);
  passwordConfirmValid = signal(false);

  private router = inject(Router);

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  protected RegisterButtonDisabled = computed(() => {
    const validEmail = this.emailValid();
    const validPassword = this.passwordValid();
    const validPasswordConfirm = this.passwordConfirmValid();
    if (validPasswordConfirm != validPassword) {
      console.log('Password and confirmation do not match');
      return true;
    }
    return !validEmail || !validPassword || !validPasswordConfirm;
  });
}
