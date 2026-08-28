import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({ email: z.string().email("Enter a valid email address.") });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "That reset link is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});
