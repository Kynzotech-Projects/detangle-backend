import * as crypto from "crypto";

const ZEGO_APP_ID = 1006988089;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || "";

/**
 * Generate a Zego authentication token (04 version).
 * Compatible with ZegoUIKit, ZIM, and all Zego SDKs.
 *
 * Token = "04" + Base64.encode(expire_time(8) + IV.length(2) + IV(16) + ciphertext.length(2) + ciphertext(N))
 * Algorithm: AES-CBC with PKCS5Padding, key = ServerSecret (UTF-8), IV = random 16-char string
 */
export function generateZegoToken(userId: string, _roomId?: string): string {
    const effectiveTimeInSeconds = 3600; // 1 hour
    const time = Math.floor(Date.now() / 1000);
    const expire = time + effectiveTimeInSeconds;

    // Construct the payload body
    const body = {
        app_id: ZEGO_APP_ID,
        user_id: userId,
        nonce: Math.floor(Math.random() * 2147483647),
        ctime: time,
        expire: expire,
    };

    const bodyStr = JSON.stringify(body);

    // Key: ServerSecret as UTF-8 bytes (must be 32 bytes for AES-256 or 16 for AES-128)
    // Zego uses the server secret directly as a 32-char hex string = 32 bytes UTF-8
    const key = Buffer.from(ZEGO_SERVER_SECRET, "utf-8");

    // Generate a random 16-character numeric IV string
    let iv = Math.random().toString().substring(2, 18);
    if (iv.length < 16) iv += iv.substring(0, 16 - iv.length);
    const ivBuf = Buffer.from(iv, "utf-8");

    // Determine cipher based on key length
    // ServerSecret is 32 hex chars = 32 bytes UTF-8 → use aes-256-cbc
    let cipherAlg: string;
    let keyBuf: Buffer;
    if (key.length === 32) {
        cipherAlg = "aes-256-cbc";
        keyBuf = key;
    } else if (key.length === 16) {
        cipherAlg = "aes-128-cbc";
        keyBuf = key;
    } else {
        // Pad or truncate to 16 bytes
        keyBuf = Buffer.alloc(16);
        key.copy(keyBuf, 0, 0, Math.min(key.length, 16));
        cipherAlg = "aes-128-cbc";
    }

    // Encrypt body with AES-CBC
    const cipher = crypto.createCipheriv(cipherAlg, keyBuf, ivBuf);
    const encrypted = Buffer.concat([cipher.update(bodyStr, "utf-8"), cipher.final()]);

    // Assemble token binary:
    // expire_time: 8 bytes (4 zeros + 4 bytes big-endian int32)
    // iv_length: 2 bytes
    // iv: 16 bytes
    // ciphertext_length: 2 bytes
    // ciphertext: N bytes
    const tokenBuf = Buffer.alloc(8 + 2 + ivBuf.length + 2 + encrypted.length);
    let offset = 0;

    // Expire time: first 4 bytes are 0, next 4 bytes are expire as big-endian int32
    tokenBuf.writeUInt32BE(0, offset);
    offset += 4;
    tokenBuf.writeUInt32BE(expire, offset);
    offset += 4;

    // IV length (2 bytes big-endian)
    tokenBuf.writeUInt16BE(ivBuf.length, offset);
    offset += 2;

    // IV
    ivBuf.copy(tokenBuf, offset);
    offset += ivBuf.length;

    // Ciphertext length (2 bytes big-endian)
    tokenBuf.writeUInt16BE(encrypted.length, offset);
    offset += 2;

    // Ciphertext
    encrypted.copy(tokenBuf, offset);

    return "04" + tokenBuf.toString("base64");
}

export { ZEGO_APP_ID };
