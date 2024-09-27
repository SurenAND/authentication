import bcryptjs from "bcryptjs";
import crypto from "crypto";
import {
  sendPasswordResetSuccessEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../mailtrap/emails.js";
import User from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { generateVerificationToken } from "../utils/generateVerificationToken.js";

export const signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    // validate the input
    if (!email || !password || !name) {
      throw new Error("All fields are required");
    }

    // check if the user already exists
    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // generate a verification Token
    const verificationToken = generateVerificationToken();

    // create the user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationExpiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
    });

    // save the user to the database
    await user.save();

    // JWT token
    generateTokenAndSetCookie(res, user._id);

    // send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { code } = req.body;
  try {
    // check if the code is valid
    const user = await User.findOne({
      verificationToken: code,
      verificationExpiresAt: { $gt: Date.now() },
    });

    // if the code is not valid, return an error
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    // if the code is valid, update the user's email verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiresAt = undefined;
    await user.save();

    // send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // send the response
    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // validate the input
    if (!email || !password) {
      throw new Error("All fields are required");
    }

    // check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      });
    }

    // check if the password is correct
    const isPasswordCorrect = await bcryptjs.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // generate a JWT token
    generateTokenAndSetCookie(res, user._id);

    user.lastLoginDate = new Date();
    await user.save();

    // send the response
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      });
    }

    // generate a reset password token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 1); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetPasswordExpiresAt;
    await user.save();

    await sendResetPasswordEmail(
      user.email,
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
    );

    res.status(200).json({
      success: true,
      message: "Reset password email sent to your email!",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // check if the token is valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset password token",
      });
    }

    // hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // update the user's password
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendPasswordResetSuccessEmail(user.email);

    res.status(200).json({
      success: true,
      message: "Password reset successfully!",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
