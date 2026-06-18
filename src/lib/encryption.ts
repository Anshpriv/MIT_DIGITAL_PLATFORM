import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

export function encrypt(text: string): string {
  const key = process.env.GITHUB_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("GITHUB_ENCRYPTION_KEY is not configured");
  }

  // Generate 32 bytes key by hashing the GITHUB_ENCRYPTION_KEY
  const hashedKey = crypto.createHash("sha256").update(key).digest();
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, hashedKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  const key = process.env.GITHUB_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("GITHUB_ENCRYPTION_KEY is not configured");
  }

  const hashedKey = crypto.createHash("sha256").update(key).digest();
  
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts.shift() || "", "hex");
  const encrypted = parts.join(":");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
