import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('InputPasswordComponent (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let component: any;

  beforeEach(() => {
    component = TestBed.runInInjectionContext(
      () => new (require('./input-password-component').InputPasswordComponent)(),
    );
  });

  it('should check the password for a invalid password', () => {
    component.onPasswordChange('short');
    expect(component.checkPasswordValidity()).toBe(false);
  });

  it('should check the password for a valid password', () => {
    component.onPasswordChange('Valid1!9');
    expect(component.checkPasswordValidity()).toBe(true);
  });

  it('should check the password for a empty password', () => {
    component.onPasswordChange('');
    expect(component.checkPasswordValidity()).toBe(false);
  });
});
