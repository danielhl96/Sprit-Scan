import request from 'supertest';

describe('Backend E2E (via API Gateway + full infrastructure)', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const gateway = request(baseUrl);

  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `e2e-${unique}@example.com`;
  const password = 'E2E-password-123!';
  const newEmail = `e2e-updated-${unique}@example.com`;

  let accessCookie = '';
  let createdHistoryEntryId = '';

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const waitForAuthServiceReady = async () => {
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await gateway.post('/api/auth/me').send({});
        // Auth proxy path is reachable as soon as we no longer receive a gateway 502.
        // Expected steady-state for unauthenticated call is 401.
        if (res.status !== 502) {
          return;
        }
      } catch {
        // Ignore transient startup/network errors during bootstrap.
      }
      await wait(1000);
    }

    throw new Error(
      'Auth service was not reachable through API Gateway within 60 seconds.',
    );
  };

  beforeAll(async () => {
    jest.setTimeout(180_000);
    await waitForAuthServiceReady();
  });

  describe('Gateway health', () => {
    it('should respond on GET /health', async () => {
      const res = await gateway.get('/health');
      expect([200, 429]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toEqual(
          expect.objectContaining({
            status: expect.any(String),
          }),
        );
      }
    });
  });

  describe('Auth endpoints through gateway', () => {
    it('should register a user (POST /api/auth/register)', async () => {
      const res = await gateway
        .post('/api/auth/register')
        .send({ email, password })
        .expect(200);

      expect(typeof res.text === 'string' || typeof res.body === 'string').toBe(
        true,
      );
    });

    it('should reject register with empty payload', async () => {
      await gateway.post('/api/auth/register').send({}).expect(400);
    });

    it('should login and set cookie (POST /api/auth/login)', async () => {
      const res = await gateway
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body).toEqual({ message: 'Login successful' });

      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      const cookieLine = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : String(setCookieHeader);
      expect(cookieLine).toContain('access_token=');
      accessCookie = cookieLine.split(';')[0];
    });

    it('should reject login with empty payload', async () => {
      await gateway.post('/api/auth/login').send({}).expect(400);
    });

    it('should validate current session (POST /api/auth/me)', async () => {
      await gateway
        .post('/api/auth/me')
        .set('Cookie', accessCookie)
        .send({})
        .expect(200);
    });

    it('should return 401 for /api/auth/me without auth', async () => {
      await gateway.post('/api/auth/me').send({}).expect(401);
    });

    it('should read email (GET /api/auth/email)', async () => {
      const res = await gateway
        .get('/api/auth/email')
        .set('Cookie', accessCookie)
        .expect(200);

      expect(res.body).toEqual({ email });
    });

    it('should change email (PUT /api/auth/email)', async () => {
      await gateway
        .put('/api/auth/email')
        .set('Cookie', accessCookie)
        .send({ newEmail, password })
        .expect(200);

      const res = await gateway
        .get('/api/auth/email')
        .set('Cookie', accessCookie)
        .expect(200);
      expect(res.body).toEqual({ email: newEmail });
    });

    it('should reject change-email with empty payload', async () => {
      await gateway
        .put('/api/auth/email')
        .set('Cookie', accessCookie)
        .send({})
        .expect(400);
    });

    it('should change password (PUT /api/auth/password)', async () => {
      const newPassword = `${password}-new`;

      await gateway
        .put('/api/auth/password')
        .set('Cookie', accessCookie)
        .send({ oldPassword: password, newPassword })
        .expect(200);

      // login with new password still works
      const loginRes = await gateway
        .post('/api/auth/login')
        .send({ email: newEmail, password: newPassword })
        .expect(200);
      const setCookieHeader = loginRes.headers['set-cookie'];
      const cookieLine = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : String(setCookieHeader);
      accessCookie = cookieLine.split(';')[0];
    });

    it('should reject change-password with empty payload', async () => {
      await gateway
        .put('/api/auth/password')
        .set('Cookie', accessCookie)
        .send({})
        .expect(400);
    });
  });

  describe('History endpoints through gateway', () => {
    it('should create a history entry (POST /api/history/entry)', async () => {
      const payload = {
        name: 'E2E Spirit',
        date: new Date().toISOString(),
        description: 'Created in E2E test',
        taste: 'balanced',
        origin: 'test-origin',
        recommendation: 'neat',
        year: '2026',
        customerReview: 'great',
        rawMaterials: 'juniper',
        alternative: 'none',
        price: '19.99',
      };

      await gateway
        .post('/api/history/entry')
        .set('Cookie', accessCookie)
        .send(payload)
        .expect(200);
    });

    it('should reject history create with empty payload', async () => {
      await gateway
        .post('/api/history/entry')
        .set('Cookie', accessCookie)
        .send({})
        .expect(400);
    });

    it('should list history entries and store one id (GET /api/history/entries)', async () => {
      const res = await gateway
        .get('/api/history/entries')
        .set('Cookie', accessCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const firstWithId = res.body.find(
        (entry: any) => typeof entry?.id === 'string' && entry.id.length > 0,
      );
      expect(firstWithId).toBeDefined();
      createdHistoryEntryId = firstWithId.id;
    });

    it('should delete one history entry (DELETE /api/history/entry/:id)', async () => {
      expect(createdHistoryEntryId).toBeTruthy();

      await gateway
        .delete(`/api/history/entry/${createdHistoryEntryId}`)
        .set('Cookie', accessCookie)
        .expect(200);

      const res = await gateway
        .get('/api/history/entries')
        .set('Cookie', accessCookie)
        .expect(200);

      const stillExists = res.body.some(
        (entry: any) => entry?.id === createdHistoryEntryId,
      );
      expect(stillExists).toBe(false);
    });
  });

  describe('AI endpoints through gateway', () => {
    it('should reject /api/ai/expert for empty input', async () => {
      // AI microservice validates this as bad request
      await gateway
        .post('/api/ai/expert')
        .set('Cookie', accessCookie)
        .send({})
        .expect(400);
    });

    it('should handle small spirits payload (sanity check)', async () => {
      const res = await gateway
        .post('/api/ai/spirits')
        .set('Cookie', accessCookie)
        .send({ imageBase64: 'a'.repeat(64) })
        .expect((r) => {
          // Depending on OPENAI availability this can be 200/400/500,
          // but it should pass through gateway and not be a 502 gateway-unreachable.
          expect([200, 400, 500]).toContain(r.status);
        });

      expect(res.status).not.toBe(502);
    });

    it('should reject too large spirits payload (boundary size)', async () => {
      const huge = 'b'.repeat(2 * 1024 * 1024); // ~2MB base64

      await gateway
        .post('/api/ai/spirits')
        .set('Cookie', accessCookie)
        .send({ imageBase64: huge })
        .expect(413);
    });
  });

  describe('Rate limiting through gateway', () => {
    it('should eventually return 429 after many requests', async () => {
      let got429 = false;

      for (let i = 0; i < 130; i++) {
        const res = await gateway.get('/health');
        if (res.status === 429) {
          got429 = true;
          break;
        }
      }

      expect(got429).toBe(true);
    });
  });

  describe('Cross-service cleanup via Kafka event', () => {
    it('should delete user and eventually remove all history entries for that user', async () => {
      // create one more history entry before deleting user
      await gateway
        .post('/api/history/entry')
        .set('Cookie', accessCookie)
        .send({
          name: 'Cleanup Target',
          date: new Date().toISOString(),
          description: 'Will be cleaned',
          taste: 'n/a',
          origin: 'n/a',
          recommendation: 'n/a',
          year: '2026',
          customerReview: 'n/a',
          rawMaterials: 'n/a',
          alternative: 'n/a',
          price: '0',
        })
        .expect(200);

      const currentPassword = `${password}-new`;

      // Delete user via auth service (publishes auth.user.deleted)
      await gateway
        .delete('/api/auth/user')
        .set('Cookie', accessCookie)
        .send({ password: currentPassword })
        .expect(200);

      // Poll history until cleanup happened (eventual consistency via Kafka)
      let cleaned = false;
      for (let i = 0; i < 16; i++) {
        const res = await gateway
          .get('/api/history/entries')
          .set('Cookie', accessCookie)
          .expect(200);

        if (Array.isArray(res.body) && res.body.length === 0) {
          cleaned = true;
          break;
        }
        await wait(500);
      }

      expect(cleaned).toBe(true);
    });
  });
});
