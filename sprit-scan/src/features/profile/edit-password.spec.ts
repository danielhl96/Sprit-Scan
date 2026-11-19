import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EditPasswordModal } from './edit-password-modal';
import { NotificationService } from '../../shared/notification/notification-service';
import { EditPasswordService } from './edit-password.service';

describe('EditPasswordFeature (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let feature: EditPasswordModal;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: EditPasswordService, useValue: { editPassword: jest.fn() } },
        { provide: NotificationService, useValue: { showNotification: jest.fn() } },
      ],
    });

    feature = TestBed.runInInjectionContext(() => new EditPasswordModal());
  });

  it('should compare new password and confirm password correctly', () => {
    feature.newPassword.set('newPassword123');
    feature.confirmPassword.set('newPassword123');
    expect((feature as any).checkPasswordMatch()).toBe(true);
  });

  it('should compare new password and confirm password with different values correctly', () => {
    feature.newPassword.set('newPassword123');
    feature.confirmPassword.set('differentPassword123');
    expect((feature as any).checkPasswordMatch()).toBe(false);
  });

  it('should compare new password and confirm password with different values correctly', () => {
    feature.newPassword.set('newPassword123');
    feature.confirmPassword.set('differentPassword123');
    expect((feature as any).checkPasswordMatch()).toBe(false);
  });
  it('should compare the new password and the old password with the same values', () => {
    feature.currentPassword.set('oldPassword123');
    feature.newPassword.set('oldPassword123');
    expect((feature as any).checkPasswordNotOldPassword()).toBe(false);
  });

  it('should compare the new password and the old password with different values', () => {
    feature.currentPassword.set('oldPassword123');
    feature.newPassword.set('newPassword123');
    expect((feature as any).checkPasswordNotOldPassword()).toBe(true);
  });
});
