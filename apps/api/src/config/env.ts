import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try load env files relative to the package first, then fall back to process.cwd().
const candidatePaths = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

let loadedPath: string | null = null;

for (const candidate of candidatePaths) {
  if (!fs.existsSync(candidate)) {
    continue;
  }

  const result = dotenv.config({ path: candidate, override: false });

  if (!result.error) {
    loadedPath = candidate;
    break;
  }

  console.warn(`Warning: Could not load .env file from ${candidate}:`, result.error.message);
}

if (loadedPath) {
  console.log(`✅ Loaded environment variables from ${loadedPath}`);
} else {
  console.warn('Warning: No .env file found for API service (checked local and process cwd paths).');
}

export {};