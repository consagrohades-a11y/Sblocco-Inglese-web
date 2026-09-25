export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.status(200).json({
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown',
  });
}
