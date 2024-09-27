import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "../mailtrap/emails.js";
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

export const login = async (req, res) => {
  res.send("Login");
};

export const logout = async (req, res) => {
  res.send("Logout");
};
