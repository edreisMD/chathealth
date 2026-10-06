// Run locally only. Keep the generated secret in your auth provider's settings.
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const required = [
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_SERVICE_ID",
  "APPLE_PRIVATE_KEY_PATH",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
const now = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  {
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 180 * 24 * 60 * 60,
    aud: "https://appleid.apple.com",
    sub: process.env.APPLE_SERVICE_ID,
  },
  fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, "utf8"),
  {
    algorithm: "ES256",
    keyid: process.env.APPLE_KEY_ID,
  },
);
// Explicit CLI output: redirect to a protected file; do not run in CI logs.
process.stdout.write(`${token}\n`);
