# Cloudflare R2 Setup Guide

## Why Cloudflare R2?

- **10 GB free storage** (generous for development)
- **Zero egress fees** (no bandwidth costs)
- **S3-compatible API** (easy to integrate)
- **Fast global CDN**

## Setup Steps

### 1. Create Cloudflare Account
Go to [cloudflare.com](https://www.cloudflare.com) and sign up (it's free).

### 2. Enable R2
1. In your Cloudflare dashboard, go to "R2" in the sidebar
2. Click "Get Started" or "Create Bucket"
3. Create a new bucket (e.g., `mooyaempcare`)

### 3. Create API Tokens
1. Go to "Manage R2 API Tokens"
2. Click "Create API Token"
3. Give it a name (e.g., "MooyaEMP Storage")
4. Set permissions:
   - Object Read & Write
5. Click "Create API Token"
6. **SAVE THE CREDENTIALS** - you'll need:
   - Account ID
   - Access Key ID
   - Secret Access Key

### 4. Configure CORS (Optional, for direct uploads)
1. In your bucket, go to "Settings" → "CORS"
2. Add a rule:
   - Allowed Origins: `http://localhost:5000`
   - Allowed Methods: `GET, PUT, POST, DELETE`
   - Allowed Headers: `*`

### 5. Get Your Public URL (Optional)
1. In bucket settings, you can enable "Public Access"
2. You'll get a URL like: `https://pub-xxxxxxxx.r2.dev`

### 6. Add to .env File

Add these variables to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID="your-account-id-here"
R2_ACCESS_KEY_ID="your-access-key-id-here"
R2_SECRET_ACCESS_KEY="your-secret-access-key-here"
R2_BUCKET_NAME="mooyaempcare"
R2_PUBLIC_URL="https://pub-xxxxxxxx.r2.dev"  # Optional: for public file serving
```

### 7. Switch to R2 Storage

To enable R2 storage instead of local storage, update `server/routes.ts`:

Change:
```typescript
import { LocalStorageService, ... } from "./localStorage";
```

To:
```typescript
import { R2StorageService, ... } from "./r2Storage";
```

And update the service instantiation:
```typescript
const storageService = new R2StorageService(); // instead of LocalStorageService
```

## Testing

1. Run `npm run dev`
2. Try uploading a file through your application
3. Check your R2 bucket - you should see uploaded files in the `uploads/` folder

## Cost

- **Free tier**: 10 GB storage, unlimited egress
- **After free tier**: $0.015 per GB per month
- **No egress fees**: Unlike AWS S3

## Troubleshooting

### Files not uploading
- Check your R2 credentials in `.env`
- Verify bucket name is correct
- Check CORS settings if using direct uploads

### 403 Forbidden
- Verify your API token has correct permissions
- Check bucket settings

### Files can't be downloaded
- Verify `R2_PUBLIC_URL` is set if using public files
- Check ACL visibility settings

