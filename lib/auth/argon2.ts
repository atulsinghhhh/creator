import * as argon2 from "argon2";

// OWASP-recommended Argon2id parameters (memory-hard, ~19 MiB, single pass).
const ARGON2_OPTIONS: argon2.Options & { type: typeof argon2.argon2id } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Malformed/foreign hash (e.g. legacy bcrypt) — treat as no match rather than throwing.
    return false;
  }
}
