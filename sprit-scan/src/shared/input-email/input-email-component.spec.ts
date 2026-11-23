import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('InputEmailComponent (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let component: any;

  beforeEach(() => {
    component = TestBed.runInInjectionContext(
      () => new (require('./input-email-component').InputEmailComponent)(),
    );
  });

  it('should validate email correctly', () => {
    expect(component.checkEmailValidity()).toBe(false);
    component.onEmailChange('test@example.com');
    expect(component.checkEmailValidity()).toBe(true);
  });
  it('should emit email validity change on email change', () => {
    const emitSpy = jest.spyOn(component.emailValidityChange, 'emit');
    component.onEmailChange('invalid-email');
    expect(emitSpy).toHaveBeenCalledWith(false);
    component.onEmailChange('test@example.com');
    expect(emitSpy).toHaveBeenCalledWith(true);
  });
  it('should empty email validity change on empty email', () => {
    const emitSpy = jest.spyOn(component.emailValidityChange, 'emit');
    component.onEmailChange('');
    expect(emitSpy).toHaveBeenCalledWith(false);
  });
  it('should return false for invalid email formats', () => {
    const invalidEmails = [
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@com',
      'username@domain..com',
      '..suer@domain.com',
    ];

    invalidEmails.forEach((email) => {
      component.onEmailChange(email);
      expect(component.checkEmailValidity()).toBe(false);
    });
  });
});
