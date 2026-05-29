/**
 * Signs a payload string with HMAC-SHA256 using the Web Crypto API.
 * Returns "sha256=<hex_digest>" — matches the backend's expected format.
 */
export const signPayload = async (
  payload: string,
  secret: string
): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    enc.encode(payload)
  );

  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `sha256=${hex}`;
};
