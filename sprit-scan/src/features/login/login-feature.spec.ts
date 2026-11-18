import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Router } from '@angular/router';
import { LoginFeature } from './login-feature';
import { LoginFeatureService } from './login-feature.service';
import { NotificationService } from '../../shared/notification/notification-service';

describe('LoginFeature (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let feature: LoginFeature;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: LoginFeatureService, useValue: { login: jest.fn() } },
        { provide: NotificationService, useValue: { showNotification: jest.fn() } },
      ],
    });

    feature = TestBed.runInInjectionContext(() => new LoginFeature());
  });

  it('should set email and password input values', () => {
    const testEmail = 'max@musterman.de';
    const testPassword = 'testpassword';
    feature.emailinput.set(testEmail);
    feature.passwordinput.set(testPassword);
    expect(feature.emailinput()).toBe(testEmail);
    expect(feature.passwordinput()).toBe(testPassword);
  });
  it('should disable login button when email or password is invalid', () => {
    feature.emailValid.set(false);
    feature.passwordValid.set(true);

    expect((feature as any).LoginButtonDisabled()).toBe(true);
  });
  it('should disable login button when both email and password are invalid', () => {
    feature.emailValid.set(false);
    feature.passwordValid.set(false);

    expect((feature as any).LoginButtonDisabled()).toBe(true);
  });
  it('should enable login button when both email and password are valid', () => {
    feature.emailValid.set(true);
    feature.passwordValid.set(true);

    expect((feature as any).LoginButtonDisabled()).toBe(false);
  });
});
