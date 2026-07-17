import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Persistent uploads: Cloudflare R2 via Medusa's S3 provider when the keys are
// set (see docs/STORAGE_SETUP.md); otherwise the local-disk provider (fine for
// dev, WIPED on Render restarts — never rely on it in production).
const s3Configured = Boolean(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_BUCKET);

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          s3Configured
            ? {
                resolve: "@medusajs/medusa/file-s3",
                id: "s3",
                options: {
                  file_url: process.env.S3_PUBLIC_URL,
                  access_key_id: process.env.S3_ACCESS_KEY,
                  secret_access_key: process.env.S3_SECRET_KEY,
                  region: process.env.S3_REGION || "auto",
                  bucket: process.env.S3_BUCKET,
                  endpoint: process.env.S3_ENDPOINT,
                },
              }
            : {
                resolve: "@medusajs/medusa/file-local",
                id: "local",
              },
        ],
      },
    },
  ],
})
