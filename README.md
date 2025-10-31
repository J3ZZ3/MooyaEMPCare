# Mooya EMP Care

Employee Management Portal for Mooya Fibre Deployment Operations.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (or use the existing Neon database)

## Environment Configuration

The application supports **two deployment environments**:

- **Local/Production**: Uses Google OAuth authentication and Cloudflare R2 or local file storage
- **Replit**: Uses Replit OAuth authentication and Replit Object Storage

Environment detection is automatic based on the `REPL_ID` environment variable.

## Environment Selection

**The application automatically detects which environment you're running in:**

- **If `REPL_ID` is set**: Uses Replit Auth + Replit Object Storage
- **If `REPL_ID` is NOT set**: Uses Google OAuth + R2/Local Storage

You don't need to manually configure which auth/storage to use - it's automatic!

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory. Choose ONE of the following configurations:

#### Option A: Local Development (Google OAuth + R2)

```env
SESSION_SECRET="your-secure-random-session-secret-here"
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
NODE_ENV="development"
PORT="5000"

# Google OAuth Configuration (for local/production)
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/callback"

# Cloudflare R2 Configuration (optional - for cloud storage)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"
```

#### Option B: Replit Development (Replit Auth + Object Storage)

```env
SESSION_SECRET="your-secure-random-session-secret-here"
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
NODE_ENV="development"
PORT="5000"

# Replit Configuration (automatically set by Replit, but you can override)
REPL_ID="your-replit-repl-id"
ISSUER_URL="https://replit.com/oidc"
DEFAULT_OBJECT_STORAGE_BUCKET_ID="your-object-storage-bucket-id"
PUBLIC_OBJECT_SEARCH_PATHS="/your-bucket-id/public"
PRIVATE_OBJECT_DIR="/your-bucket-id/.private"
```

**Note:** The presence of `REPL_ID` switches the entire authentication and storage system automatically.

### 3. Google OAuth Setup (Local/Production Only)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:5000/api/callback`
7. Copy the Client ID and Client Secret to your `.env` file

**Note:** Only email addresses from `@mooya.co.za`, `@mooyawireless.co.za`, and `@xnext.co.za` domains are allowed.

### 4. Database Setup

The application uses Neon PostgreSQL database. Ensure your `DATABASE_URL` is correct. The sessions table will be created automatically when you first run the application.

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Replit Deployment

When deployed on Replit, the application automatically uses:

- **Authentication**: Replit OAuth (configured via `.replit` integrations)
- **File Storage**: Replit Object Storage sidecar
- **Environment Detection**: `REPL_ID` environment variable

No additional configuration needed beyond the `.replit` file configuration.

## File Storage

By default, files are stored locally in the `uploads/` directory on your machine.

### Option 1: Local Storage (Default)
Files are stored in the `uploads/` directory:
- Public files: `uploads/public/`
- Private files: `uploads/private/`

The `uploads/` directory is automatically created on first run.

### Option 2: Cloudflare R2 (Recommended for Production)
For cloud storage with a generous free tier (10GB free, unlimited bandwidth):

See [R2_SETUP.md](R2_SETUP.md) for detailed setup instructions.

Quick setup:
1. Create a Cloudflare account and R2 bucket
2. Get your API credentials
3. Add to `.env`:
```env
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"
```

4. The application will automatically use R2StorageService when R2 credentials are provided

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
MooyaEMPCare/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── ...
│   └── ...
├── server/              # Express backend
│   ├── auth.ts         # Google OAuth authentication
│   ├── routes.ts       # API routes
│   ├── localStorage.ts # Local file storage
│   └── ...
├── shared/              # Shared TypeScript definitions
│   └── schema.ts       # Database schema
└── ...
```

## Authentication

The application uses two authentication systems:

1. **Staff Authentication**: Google OAuth (restricted to company domains)
2. **Labourer Authentication**: Local username/password (using RSA ID or Passport)

### Roles

- `super_admin`: Full system access (kholofelo@mooya.co.za)
- `admin`: Admin access (@xnext.co.za by default)
- `project_manager`: Project management access
- `supervisor`: Project supervision access
- `project_admin`: Project administration
- `labourer`: Limited labourer access

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, change the `PORT` value in your `.env` file.

### Google OAuth Not Working

1. Ensure your redirect URI matches exactly: `http://localhost:5000/api/callback`
2. Check that Google+ API is enabled in your Google Cloud Console
3. Verify your Client ID and Secret are correct in `.env`

### Database Connection Issues

1. Verify your `DATABASE_URL` is correct
2. Ensure your database is accessible from your network
3. Check SSL mode if using a cloud database (should be `sslmode=require`)

### File Upload Issues

Ensure the `uploads/` directory is writable by the application.

## License

MIT

