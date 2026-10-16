import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API Health Check Endpoint', () => {
  it('GET /api/health should return 200 with service information', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'SmartCart AI API');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / should return 200 with marketplace welcome message', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.message).toContain('SmartCart AI');
  });

  it('GET /api/non-existent-route should return 404 with structured JSON error', async () => {
    const res = await request(app).get('/api/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Route not found');
  });
});
