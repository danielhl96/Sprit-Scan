import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AiFeatureService {
  constructor(private httpClientService: HttpClient) {}

  expert(prompt: string) {
    const body = { prompt };
    return this.httpClientService.post('http://localhost:3000/api/ai/expert', body);
  }

  sprits(image: string) {
    const body = { imageUrl: image };
    return this.httpClientService.post('http://localhost:3000/api/ai/spirits', body);
  }
}
