import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Generate and send OTP for email verification
export const sendVerificationOTP = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in database
    await ctx.runMutation(internal.email.storeOTP, {
      email: args.email,
      otp,
      expiresAt,
    });

    // Send email using Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.CONVEX_RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: "Ship Dating <noreply@ship.example.com>",
        to: args.email,
        subject: "Verify your Ship account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e91e63;">Welcome to Ship! 💖</h2>
            <p>Your verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send verification email");
    }
  },
});

// Store OTP in database (internal)
export const storeOTP = internalMutation({
  args: {
    email: v.string(),
    otp: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Remove any existing OTP for this email
    const existing = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Store new OTP
    await ctx.db.insert("emailVerifications", {
      email: args.email,
      otp: args.otp,
      expiresAt: args.expiresAt,
      isVerified: false,
      attempts: 0,
    });
  },
});

// Verify OTP
export const verifyOTP = mutation({
  args: {
    email: v.string(),
    otp: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!verification) {
      throw new Error("No verification found for this email");
    }

    if (verification.expiresAt < Date.now()) {
      throw new Error("OTP has expired");
    }

    if (verification.attempts >= 3) {
      throw new Error("Too many attempts. Please request a new OTP");
    }

    if (verification.otp !== args.otp) {
      await ctx.db.patch(verification._id, {
        attempts: verification.attempts + 1,
      });
      throw new Error("Invalid OTP");
    }

    // Mark as verified
    await ctx.db.patch(verification._id, {
      isVerified: true,
    });

    return { success: true };
  },
});

// Check if email is verified
export const isEmailVerified = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    return verification?.isVerified || false;
  },
});
