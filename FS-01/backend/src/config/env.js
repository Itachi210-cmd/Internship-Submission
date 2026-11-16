import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fail-fast validation for required environment variables
const requiredEnvVars = [
  'PAYMENT_PROVIDER',
  'MOCK_GATEWAY_SECRET',
  'MOCK_WEBHOOK_SECRET',
  'BACKEND_PUBLIC_URL',
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName] || !process.env[varName].trim());

if (missingEnvVars.length > 0) {
  throw new Error(`[Config Error] Missing required environment variable(s): ${missingEnvVars.join(', ')}. Please check your .env file.`);
}

// In production (NODE_ENV=production): strict fail-fast validation
if (process.env.NODE_ENV === 'production') {
  const prodRequired = [
    'MONGO_URI',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CLIENT_URL',
    'BACKEND_PUBLIC_URL',
    'MOCK_GATEWAY_SECRET',
    'MOCK_WEBHOOK_SECRET',
    'AWS_REGION',
    'AWS_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ];

  const missingProd = prodRequired.filter(
    (varName) => !process.env[varName] || !process.env[varName].trim()
  );

  if (missingProd.length > 0) {
    throw new Error(
      `[Production Config Error] Missing required production environment variable(s): ${missingProd.join(', ')}. Please configure them in your deployment dashboard.`
    );
  }

  // Refuse placeholder secrets in production
  const PLACEHOLDER_SECRETS = [
    'your_super_secret_jwt_access_key_here',
    'your_super_secret_jwt_refresh_key_here',
    'dev_jwt_access_secret',
    'dev_jwt_refresh_secret',
    'mock_gateway_secret_key_32bytes_sample',
    'mock_webhook_secret_key_32bytes_sample',
    'minioadmin',
  ];

  const secretChecks = [
    { name: 'JWT_ACCESS_SECRET', val: process.env.JWT_ACCESS_SECRET },
    { name: 'JWT_REFRESH_SECRET', val: process.env.JWT_REFRESH_SECRET },
    { name: 'MOCK_GATEWAY_SECRET', val: process.env.MOCK_GATEWAY_SECRET },
    { name: 'MOCK_WEBHOOK_SECRET', val: process.env.MOCK_WEBHOOK_SECRET },
    { name: 'AWS_ACCESS_KEY_ID', val: process.env.AWS_ACCESS_KEY_ID },
    { name: 'AWS_SECRET_ACCESS_KEY', val: process.env.AWS_SECRET_ACCESS_KEY },
  ];

  const activePlaceholders = secretChecks.filter(
    (item) => item.val && PLACEHOLDER_SECRETS.includes(item.val.trim())
  );

  if (activePlaceholders.length > 0) {
    throw new Error(
      `[Production Config Error] Insecure placeholder secret detected in production for: ${activePlaceholders.map((p) => p.name).join(', ')}. You must supply real, secure credentials.`
    );
  }

  // ENABLE_FAKE_PAY must be false in production
  if (process.env.ENABLE_FAKE_PAY === 'true') {
    throw new Error(
      '[Production Config Error] ENABLE_FAKE_PAY cannot be true in production. It must be false.'
    );
  }
}

// Compute cookie sameSite and secure flags
const cookieSameSite = (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'lax' : 'lax')).toLowerCase();
let cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';
if (cookieSameSite === 'none') {
  cookieSecure = true;
}

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL,

  // Database and search
  mongoUri: process.env.MONGO_URI ? process.env.MONGO_URI.trim() : 'mongodb://127.0.0.1:27017/marketplace',
  redisUrl: process.env.REDIS_URL ? process.env.REDIS_URL.trim() : 'redis://127.0.0.1:6379',
  esNode: process.env.ES_NODE ? process.env.ES_NODE.trim() : '',
  esApiKey: process.env.ES_API_KEY ? process.env.ES_API_KEY.trim() : '',
  esUsername: process.env.ES_USERNAME ? process.env.ES_USERNAME.trim() : '',
  esPassword: process.env.ES_PASSWORD || '',
  esIndex: process.env.ES_INDEX || 'products',

  // Dev flags
  enableFakePay: process.env.ENABLE_FAKE_PAY === 'true',

  // Payment Provider & Sandbox Gateway
  paymentProvider: process.env.PAYMENT_PROVIDER,
  mockGatewaySecret: process.env.MOCK_GATEWAY_SECRET,
  mockWebhookSecret: process.env.MOCK_WEBHOOK_SECRET,
  mockWebhookEnabled: process.env.MOCK_WEBHOOK_ENABLED === undefined ? true : process.env.MOCK_WEBHOOK_ENABLED === 'true',

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret',

  // Cookie Settings
  cookie: {
    sameSite: cookieSameSite,
    secure: cookieSecure,
  },

  // AWS S3 / MinIO
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_BUCKET || 'marketplace-images',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    publicUrl: process.env.S3_PUBLIC_URL || '',
  },

  // Razorpay (Optional / Live Gateway)
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // Admin Seed
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@marketplace.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
};
