import "dotenv/config";

const required = [
  "MONGODB_URI",
  "MONGODB_DB_NAME",
  "JWT_SECRET",
  "GEMINI_API_KEY",
  "FRONTEND_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
];

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
}

let allPresent = true;

for (const key of required) {
  const value = process.env[key];
  if (!value) allPresent = false;
  console.log(`${key.padEnd(16)} ${mask(value)}`);
}

if (!allPresent) {
  console.error("\nOne or more required environment variables are missing.");
  process.exit(1);
}

console.log("\nAll required environment variables are present.");
