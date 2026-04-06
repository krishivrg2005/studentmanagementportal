const crypto = require("crypto");

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return { salt, passwordHash };
}

function verifyPassword(password, user) {
  if (!user?.salt || !user?.passwordHash) {
    return false;
  }

  const candidateHash = crypto
    .pbkdf2Sync(password, user.salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  const stored = Buffer.from(user.passwordHash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");

  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

module.exports = {
  hashPassword,
  verifyPassword
};
