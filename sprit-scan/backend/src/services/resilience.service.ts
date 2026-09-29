import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  retry,
  wrap,
  handleWhen,
  timeout,
  TimeoutStrategy,
  decorrelatedJitterGenerator,
} from 'cockatiel';

@Injectable()
export class ResilienceService {
  private readonly networkErrorPolicy;
  private readonly timeoutPolicy;
  public readonly baseBackoff;
  private readonly retryPolicy;

  private readonly circuitBreakerPolicy;
  public readonly resiliencePolicy;

  constructor(private readonly configService: ConfigService) {
    const httpTimeout = Number(
      this.configService.get<string>('HTTP_TIMEOUT') ?? '5000',
    );

    this.networkErrorPolicy = handleWhen((error) => {
      if (error instanceof AxiosError) {
        return (
          !error.response ||
          (error.response.status >= 500 && error.response.status < 600)
        );
      }
      return false;
    });

    this.baseBackoff = new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 5000,
      generator: decorrelatedJitterGenerator,
    });

    this.timeoutPolicy = timeout(httpTimeout, TimeoutStrategy.Aggressive);

    // Retry 3 times with an exponential backoff strategy
    this.retryPolicy = retry(this.networkErrorPolicy, {
      maxAttempts: 3,
      backoff: this.baseBackoff,
    });

    // Trip the breaker for 10 seconds if 5 consecutive requests fail
    this.circuitBreakerPolicy = circuitBreaker(this.networkErrorPolicy, {
      halfOpenAfter: 10 * 1000,
      breaker: new ConsecutiveBreaker(5),
    });

    this.resiliencePolicy = wrap(
      this.retryPolicy,
      this.circuitBreakerPolicy,
      this.timeoutPolicy,
    );
  }
}
