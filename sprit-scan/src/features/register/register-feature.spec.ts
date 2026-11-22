import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Router } from '@angular/router';
import { RegisterFeature } from './register-feature';
import { RegisterFeatureService } from './register-feature.service';
import { NotificationService } from '../../shared/notification/notification-service';

describe('Register (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let feature: RegisterFeature;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: RegisterFeatureService, useValue: { register: jest.fn() } },
        { provide: NotificationService, useValue: { showNotification: jest.fn() } },
      ],
    });

    feature = TestBed.runInInjectionContext(() => new RegisterFeature());
  });

  it('should set email and password input values', () => {
    const testEmail = 'max@musterman.de';
    const testPassword = 'testpassword';
    feature.emailinput.set(testEmail);
    feature.passwordinput.set(testPassword);
    expect(feature.emailinput()).toBe(testEmail);
    expect(feature.passwordinput()).toBe(testPassword);
  });

  it('should enable the register button when email and password are valid and passwords match', () => {
    feature.emailValid.set(true);
    feature.passwordValid.set(true);
    feature.passwordConfirmValid.set(true);
    expect((feature as any).RegisterButtonDisabled()).toBe(false);
  });

  it('should disable the register button when email is invalid', () => {
    feature.emailValid.set(false);
    feature.passwordValid.set(false);
    feature.passwordConfirmValid.set(false);
    expect((feature as any).RegisterButtonDisabled()).toBe(true);
  });
  it('should disable the register button when password do not match', () => {
    feature.emailValid.set(true);
    feature.passwordValid.set(true);
    feature.passwordConfirmValid.set(false);
    expect((feature as any).RegisterButtonDisabled()).toBe(true);
  });
});
