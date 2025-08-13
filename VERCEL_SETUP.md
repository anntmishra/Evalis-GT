# Vercel Environment Variables Setup

To deploy Evalis-GT on Vercel, you need to set up the following environment variables in your Vercel dashboard:

## Database Configuration
```
DATABASE_URL=your_neon_postgresql_connection_string
```

## Authentication
```
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=1d
```

## Server Configuration
```
NODE_ENV=production
PORT=3000
```

## Redis Configuration (Optional - for session management)
```
REDIS_URL=your_redis_connection_string
```

## Firebase Configuration (Optional - if using Firebase features)
```
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

## How to Set Environment Variables on Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with its value
5. Make sure to select the appropriate environments (Production, Preview, Development)

## Important Notes:

- The app will automatically detect Vercel environment and use serverless functions
- File uploads will be handled in memory (Vercel doesn't support persistent file storage)
- Database connections are managed with connection pooling for serverless
- Sessions will use JWT tokens instead of Redis in serverless environment

## Build Process:

Vercel will automatically:
1. Run `npm run vercel-build` 
2. Build the frontend with Vite
3. Install server dependencies
4. Deploy as serverless functions
