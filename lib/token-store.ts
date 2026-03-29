import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const TOKEN_STORE_VERSION = "v1";
const IV_LENGTH = 12;

function getTokenEncryptionSecret() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required for OAuth token storage.");
  }

  return secret;
}

function deriveKey() {
  return createHash("sha256").update(getTokenEncryptionSecret()).digest();
}

export function encryptToken(plainText: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");

  return `${TOKEN_STORE_VERSION}:${payload}`;
}

export function decryptToken(encryptedToken: string) {
  const [version, payload] = encryptedToken.split(":");

  if (version !== TOKEN_STORE_VERSION || !payload) {
    throw new Error("Unsupported token format.");
  }

  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
