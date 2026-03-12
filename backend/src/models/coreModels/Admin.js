const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    surname: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      set: (value) => value?.toString().replace(/\D/g, '').slice(0, 10),
      match: [/^[6-9]\d{9}$/, "Please enter a valid mobile number"],
    },

    password: {
      type: String,
      required: true,
      select: false, // do not return password in queries
    },

    photo: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      default: "staff",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
