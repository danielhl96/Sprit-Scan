import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { Router } from '@angular/router';
import { LoginFeatureService } from './login-feature.service';
import { NotificationService } from '../../shared/notification/notification-service';

@Component({
  selector: 'login-feature',
  imports: [TemplatePageComponent, ButtonComponent, InputEmailComponent, InputPasswordComponent],
  templateUrl: './login-feature.html',
})
export class LoginFeature {
  protected readonly title = signal('sprit-scan');
  LoginFeatureService: LoginFeatureService = inject(LoginFeatureService);
  NotificationService = inject(NotificationService);

  emailinput = signal('');
  passwordinput = signal('');
  emailValid = signal(false);
  passwordValid = signal(false);

  private router = inject(Router);

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
  navgiateToHome() {
    this.router.navigate(['/home']);
  }

  protected login() {
    this.LoginFeatureService.login(this.emailinput(), this.passwordinput()).subscribe({
      next: (response) => {
        this.navgiateToHome();
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.NotificationService.showNotification(
          'Login failed. Please check your credentials.',
          'error',
        );
      },
    });
  }

  /** Button ist nur aktiv, wenn beide Felder gültig sind */
  protected LoginButtonDisabled = computed(() => {
    const emailV = this.emailValid();
    const passwordV = this.passwordValid();
    console.log('Email valid:', emailV, 'Password valid:', passwordV);
    return !emailV || !passwordV;
  });
}
