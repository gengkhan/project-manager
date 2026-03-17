const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama harus diisi"],
      trim: true,
      maxlength: [100, "Nama maksimal 100 karakter"],
    },
    email: {
      type: String,
      required: [true, "Email harus diisi"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Format email tidak valid"],
    },
    password: {
      type: String,
      required: [true, "Password harus diisi"],
      minlength: [8, "Password minimal 8 karakter"],
      select: false, // tidak include di query default
    },
    avatar: {
      type: String,
      default: null,
    },
    whatsappNumber: {
      type: String,
      default: null,
      trim: true,
    },
    notificationPreferences: {
      mention: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      assignTask: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      dueDate: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      newComment: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      newMember: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      eventStart: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
      taskUpdate: {
        inApp: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
    },
    dueDateReminders: {
      type: [String],
      enum: ["H", "H-1", "H-3"],
      default: ["H-1"],
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    pushSubscriptions: {
      type: Array, // Array of push subscription objects
      default: [],
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password sebelum save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method: bandingkan password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method: hapus field sensitif dari JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
