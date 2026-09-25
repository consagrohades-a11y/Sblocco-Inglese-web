import { defineConfig } from 'vite';

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || 'local';

export default defineConfig({
  define: {
    __SBLOCCO_BUILD_SHA__: JSON.stringify(buildSha),
  },
});
