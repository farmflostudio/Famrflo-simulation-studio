import crypto from "node:crypto";
import User from "../models/User.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function register(req, res) {
  const { email, password, name } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name });

  const token = signToken(user._id.toString());
  res.status(201).json({ token, user });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user._id.toString());
  res.json({ token, user });
}

export async function logout(req, res) {
  res.status(200).json({ message: "Logged out" });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way whether or not the account exists, so this endpoint
  // can't be used to discover which emails are registered.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (err) {
      // Don't leak email delivery failures to the client - the token is still valid,
      // and surfacing SMTP errors here would be an information disclosure risk.
      console.error("Failed to send password reset email:", err.message);
    }
  }

  res.json({ message: "If an account exists for that email, a password reset link has been sent" });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: "That reset link is invalid or has expired" });
  }

  user.passwordHash = await hashPassword(password);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: "Password reset successfully" });
}
