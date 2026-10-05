import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class LoginFeatureService {
  constructor(private httpClientService: HttpClient) {}

  login(email: string, password: string) {
    const body = { email, password };
    return this.httpClientService.post(NG_APP_ROOT_DOMAIN + 'auth/login', body);
  }

  authenticate(): Observable<unknown> {
    console.log('authenticate called');
    return this.httpClientService.post(NG_APP_ROOT_DOMAIN + 'auth/me', {});
  }
}
