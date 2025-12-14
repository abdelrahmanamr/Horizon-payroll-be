import crypto, { createHash, hkdfSync } from "crypto";

/**
 * Derive a 32-byte AES key for a user.
 *
 * Inputs:
 *  - ikmInput: Buffer derived from userObjectId + username
 *  - salt: Buffer (per-user seed stored in DB)
 *
 * Uses HKDF-SHA256:
 *   key = HKDF(ikm=ikmInput, salt=salt, info="sub-payroll-aead-v1", length=32)
 */
export function deriveKeyHKDF(ikmInput: Buffer, salt: Buffer): Buffer {
  const info = Buffer.from("sub-payroll-aead-v1", "utf8");

  // hkdfSync returns ArrayBuffer in Node 20+
  const derived = hkdfSync("sha256", ikmInput, salt, info, 32);

  // Convert ArrayBuffer → Buffer
  return Buffer.from(derived);
}

/**
 * AEAD encrypt (AES-256-GCM)
 * Returns an object with base64-encoded fields.
 */
export function encryptString(plain: string, key: Buffer) {
  const iv = crypto.randomBytes(12); // 96-bit recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

/**
 * AEAD decrypt (AES-256-GCM)
 */
export function decryptString(
  payload: { iv: string; tag: string; ciphertext: string },
  key: Buffer
) {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * Build IKM (input keying material) as Buffer from user identifiers.
 * Use explicit encoding and a separator to avoid ambiguity.
 */
export function buildIkm(userObjectId: string, username: string): Buffer {
  // use a structured format to prevent collisions e.g. "oid:<objid>\nuser:<username>"
  return Buffer.from(`oid:${userObjectId}\nuser:${username}`, "utf8");
}

/**
 * Zeroize Buffer contents (best-effort).
 */
export function zeroBuffer(buf: Buffer) {
  if (!buf) return;
  buf.fill(0);
}

export function generateDeterministicUUID(input: number | string): string {
  const inputStr = String(input);

  // Create SHA-256 hash of the input
  const hash = createHash("sha256").update(inputStr).digest("hex");

  // Format as UUID v5 style (version 5 uses SHA-1, but we're using SHA-256)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-5${hash.substring(
    13,
    16
  )}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}
