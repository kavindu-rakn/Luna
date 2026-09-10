import { describe, it, expect } from 'vitest';
import { resolveSiteUrl } from '../scripts/site-url.js';

const HOMEPAGE = 'https://kavindu-rakn.github.io/Luna/';

describe('the address a build is published at', () => {
  it('falls back to the homepage, which serves the app from /Luna/', () => {
    const url = resolveSiteUrl({}, HOMEPAGE);
    expect(url.href).toBe(HOMEPAGE);
    expect(url.pathname).toBe('/Luna/');
  });

  it('takes SITE_URL over anything a host announces', () => {
    const env = { SITE_URL: 'https://luna.example.com/', NETLIFY: 'true', URL: 'https://luna.netlify.app' };
    expect(resolveSiteUrl(env, HOMEPAGE).href).toBe('https://luna.example.com/');
  });

  it('gives the path the trailing slash Vite needs, and drops any query or hash', () => {
    expect(resolveSiteUrl({ SITE_URL: 'https://example.com/moon?x=1#top' }, HOMEPAGE).href)
      .toBe('https://example.com/moon/');
    expect(resolveSiteUrl({ SITE_URL: 'https://luna.example.com' }, HOMEPAGE).pathname).toBe('/');
  });

  it('recognises Netlify, preferring the URL of this particular deploy', () => {
    const preview = { NETLIFY: 'true', URL: 'https://luna.netlify.app', DEPLOY_PRIME_URL: 'https://deploy-preview-7--luna.netlify.app' };
    expect(resolveSiteUrl(preview, HOMEPAGE).href).toBe('https://deploy-preview-7--luna.netlify.app/');
    expect(resolveSiteUrl({ NETLIFY: 'true', URL: 'https://luna.netlify.app' }, HOMEPAGE).href).toBe('https://luna.netlify.app/');
  });

  it('recognises Vercel: the project domain in production, the deployment URL for previews', () => {
    const base = { VERCEL: '1', VERCEL_URL: 'luna-abc123.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'luna.vercel.app' };
    expect(resolveSiteUrl({ ...base, VERCEL_ENV: 'production' }, HOMEPAGE).href).toBe('https://luna.vercel.app/');
    expect(resolveSiteUrl({ ...base, VERCEL_ENV: 'preview' }, HOMEPAGE).href).toBe('https://luna-abc123.vercel.app/');
  });

  it('recognises Cloudflare Pages', () => {
    expect(resolveSiteUrl({ CF_PAGES: '1', CF_PAGES_URL: 'https://a1b2.luna.pages.dev' }, HOMEPAGE).href)
      .toBe('https://a1b2.luna.pages.dev/');
  });

  it("points a fork's GitHub Actions build at the fork's own Pages site", () => {
    const fork = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Someone/Luna' };
    expect(resolveSiteUrl(fork, HOMEPAGE).href).toBe('https://someone.github.io/Luna/');
    // A repository named after the owner's Pages domain is served from the root
    const userSite = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Someone/someone.github.io' };
    expect(resolveSiteUrl(userSite, HOMEPAGE).pathname).toBe('/');
  });

  it('builds this repository exactly as before on GitHub Actions', () => {
    const upstream = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'kavindu-rakn/Luna' };
    expect(resolveSiteUrl(upstream, HOMEPAGE).href).toBe(HOMEPAGE);
  });

  it('refuses an address it cannot build for, with a message saying why', () => {
    expect(() => resolveSiteUrl({ SITE_URL: 'luna.example.com' }, HOMEPAGE)).toThrow(/absolute URL/);
    expect(() => resolveSiteUrl({ SITE_URL: 'ftp://example.com/' }, HOMEPAGE)).toThrow(/http or https/);
  });
});
