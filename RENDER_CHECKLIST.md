# Checklist for Render Deployment

## 1. Project Configuration
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Node Version**: Ensure you're using Node.js 18 or 20 (standard on Render).

## 2. Environment Variables (Required)
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `SESSION_SECRET`: A secure random string for managing user sessions.
- `ADMIN_BOOTSTRAP_PASSWORD`: At least 12 characters; the seed sets the initial admin password from this secret on each start.
- `QIROX_EMAIL_API_KEY`: Rotated QIROX project email bearer key.
- `QIROX_WHATSAPP_API_KEY`: Rotated QIROX project WhatsApp bearer key.
- `QIROX_PROJECT_ID`: Optional; defaults to this project's QIROX project ID.
- `QIROX_API_BASE_URL`: Optional; defaults to `https://qiroxstudio.online/api/v1`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Configure all three for durable product/media uploads on Render; the local filesystem is ephemeral.
- `NODE_ENV`: Set to `production`.

QIROX API keys must be rotated if they were pasted into chat. Add the newly issued values in Render's Environment settings; Replit Secrets do not configure a separate Render service.

QIROX uses `POST` for these endpoints. Opening the WhatsApp endpoint in a browser sends `GET` and returns `Cannot GET`; this is not a health check. OTP delivery prefers Myla's connected local Baileys session and uses QIROX only when that session is disconnected. It does not switch to QIROX if a connected Baileys send itself fails. Transactional email uses QIROX when configured; messages with attachments still require SMTP because the supplied QIROX API does not document attachment support.

## 3. Build & Bundling
- The project is configured to bundle `mongoose` into the production build (`dist/index.cjs`).
- The client-side assets are built into `dist/public`.

## 4. Final Steps
- Ensure MongoDB Atlas Network Access permits connections from Render. Avoid `0.0.0.0/0` except as a temporary diagnostic setting.
- Verify the build logs on Render to ensure `vite` and `esbuild` complete successfully.
