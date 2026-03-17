const mongoose = require("mongoose");
const crypto = require("crypto");

const emailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL: hapus token otomatis setelah 24 jam dari expiresAt
emailVerificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 86400 },
);
emailVerificationTokenSchema.index({ userId: 1 });

emailVerificationTokenSchema.statics.createToken = async function (userId) {
  await this.deleteMany({ userId, usedAt: null });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const tokenDoc = await this.create({
    userId,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
  });

  return { rawToken, tokenDoc };
};

emailVerificationTokenSchema.statics.verifyToken = async function (rawToken) {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const tokenDoc = await this.findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
    usedAt: null,
  });

  return tokenDoc;
};

module.exports = mongoose.model(
  "EmailVerificationToken",
  emailVerificationTokenSchema,
);

