import dotenv from "dotenv";

dotenv.config();

export const authenticate = (token: string, userObjectId: string): boolean => {
  // Just decode and trust the token (for development only!)
  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

  // Basic validation
  if (!payload.oid && !payload.sub) {
    return false;
  }

  // Check expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return false;
  }

  // Check tenant ID
  if (payload.tid !== process.env.MICROSOFT_TENANT_ID) {
    return false;
  }

  if (payload.oid !== userObjectId) {
    return false;
  }
  return true;
};
