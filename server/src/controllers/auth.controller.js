const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const EmailVerificationToken = require("../models/EmailVerificationToken");
const emailService = require("../services/email.service");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Helper: generate tokens
const generateTokens = (userId, email) => {
  const accessToken = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign(
    { id: userId, email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" },
  );

  return { accessToken, refreshToken };
};

// Helper: set cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 hari
    path: "/api/auth",
  });
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;

  // Validasi
  if (!name || !email || !password || !confirmPassword) {
    return next(new AppError("Semua field harus diisi", 400));
  }

  if (password !== confirmPassword) {
    return next(
      new AppError("Password dan konfirmasi password tidak cocok", 400),
    );
  }

  if (password.length < 8) {
    return next(new AppError("Password minimal 8 karakter", 400));
  }

  // Cek email sudah dipakai
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email sudah terdaftar", 409));
  }

  // Buat user
  const user = await User.create({ name, email, password });

  // Buat token verifikasi + kirim email
  const { rawToken } = await EmailVerificationToken.createToken(user._id);
  const verificationUrl = `${process.env.APP_BASE_URL}/verify-email/${rawToken}`;

  try {
    await emailService.sendEmailVerificationEmail(user.email, verificationUrl);
  } catch (error) {
    await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
    return next(new AppError("Gagal mengirim email. Coba lagi nanti.", 500));
  }

  res.status(201).json({
    status: "success",
    message: "Akun berhasil dibuat. Silakan cek email untuk verifikasi.",
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email dan password harus diisi", 400));
  }

  // Ambil user + password (karena select: false di schema)
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Email atau password salah", 401));
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      status: "fail",
      message: "Email belum diverifikasi. Silakan cek inbox kamu.",
      emailNotVerified: true,
    });
  }

  // Update lastActiveAt
  user.lastActiveAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id, user.email);
  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    status: "success",
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/verify-email
// ──────────────────────────────────────────────
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError("Token harus diisi", 400));
  }

  const tokenDoc = await EmailVerificationToken.verifyToken(token);
  if (!tokenDoc) {
    return next(new AppError("Token tidak valid atau sudah expired", 400));
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save({ validateBeforeSave: false });

  tokenDoc.usedAt = new Date();
  await tokenDoc.save();

  res.status(200).json({
    status: "success",
    message: "Email berhasil diverifikasi. Silakan login.",
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/resend-verification
// ──────────────────────────────────────────────
exports.resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email harus diisi", 400));
  }

  const successMessage =
    "Jika email terdaftar, tautan verifikasi telah dikirim";

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ status: "success", message: successMessage });
  }

  if (user.emailVerified) {
    return res.status(200).json({ status: "success", message: successMessage });
  }

  const { rawToken } = await EmailVerificationToken.createToken(user._id);
  const verificationUrl = `${process.env.APP_BASE_URL}/verify-email/${rawToken}`;

  try {
    await emailService.sendEmailVerificationEmail(user.email, verificationUrl);
  } catch (error) {
    await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
    return next(new AppError("Gagal mengirim email. Coba lagi nanti.", 500));
  }

  res.status(200).json({ status: "success", message: successMessage });
});

// ──────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────
exports.logout = catchAsync(async (req, res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/api/auth",
  });

  res.status(200).json({
    status: "success",
    message: "Logout berhasil",
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/refresh
// ──────────────────────────────────────────────
exports.refresh = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return next(new AppError("Refresh token tidak ditemukan", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Cek user masih ada
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError("User tidak ditemukan", 401));
    }

    // Generate token baru
    const { accessToken, refreshToken } = generateTokens(user._id, user.email);
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      status: "success",
      accessToken,
    });
  } catch (error) {
    return next(new AppError("Refresh token tidak valid atau expired", 401));
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/forgot-password
// ──────────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email harus diisi", 400));
  }

  // Selalu tampilkan pesan sukses (security best practice)
  const successMessage =
    "Jika email terdaftar, tautan reset password telah dikirim";

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ status: "success", message: successMessage });
  }

  // Buat token
  const { rawToken } = await PasswordResetToken.createToken(user._id);

  // Kirim email
  const resetUrl = `${process.env.APP_BASE_URL}/reset-password/${rawToken}`;
  try {
    await emailService.sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    // Hapus token jika email gagal kirim
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    return next(new AppError("Gagal mengirim email. Coba lagi nanti.", 500));
  }

  res.status(200).json({ status: "success", message: successMessage });
});

// ──────────────────────────────────────────────
// POST /api/auth/reset-password
// ──────────────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return next(new AppError("Semua field harus diisi", 400));
  }

  if (password !== confirmPassword) {
    return next(
      new AppError("Password dan konfirmasi password tidak cocok", 400),
    );
  }

  if (password.length < 8) {
    return next(new AppError("Password minimal 8 karakter", 400));
  }

  // Verifikasi token
  const tokenDoc = await PasswordResetToken.verifyToken(token);
  if (!tokenDoc) {
    return next(new AppError("Token tidak valid atau sudah expired", 400));
  }

  // Update password
  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  user.password = password;
  await user.save();

  // Tandai token sudah dipakai
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();

  res.status(200).json({
    status: "success",
    message: "Password berhasil direset. Silakan login dengan password baru.",
  });
});

// ──────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    user,
  });
});
