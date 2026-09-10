// The public URL a build is published at. Everything deploy-specific comes from
// this one value: the base path the assets are served under, and the absolute
// URLs that social cards need (a relative og:image renders no card at all).
//
// In order of precedence:
//   1. SITE_URL, set by hand, for anywhere else (a custom domain, a subfolder)
//   2. Hosts that announce their URL during the build: Netlify, Vercel, Cloudflare Pages
//   3. GitHub Actions, which names the repository, so a fork deploys to its own Pages site
//   4. The fallback, package.json's homepage, which is where this repo is published
//
// A URL is returned with a trailing slash on its path, since the path doubles as
// Vite's base and Vite expects one.

const githubPagesUrl = (repository) => {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return null;
  // A repository named <owner>.github.io is a user site, served from the root
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? `https://${owner.toLowerCase()}.github.io/`
    : `https://${owner.toLowerCase()}.github.io/${repo}/`;
};

const vercelUrl = (env) => {
  // Production builds use the project's own domain; previews their deployment URL.
  // Vercel gives both without a protocol.
  const host = env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL
    ? env.VERCEL_PROJECT_PRODUCTION_URL
    : env.VERCEL_URL;
  return host ? `https://${host}` : null;
};

export const resolveSiteUrl = (env, fallback) => {
  const candidate =
    env.SITE_URL ||
    (env.NETLIFY === 'true' && (env.DEPLOY_PRIME_URL || env.URL)) ||
    (env.VERCEL && vercelUrl(env)) ||
    (env.CF_PAGES && env.CF_PAGES_URL) ||
    (env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY && githubPagesUrl(env.GITHUB_REPOSITORY)) ||
    fallback;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`Site URL "${candidate}" is not an absolute URL. Set SITE_URL to one, e.g. https://luna.example.com/`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Site URL "${candidate}" must use http or https.`);
  }
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
};
