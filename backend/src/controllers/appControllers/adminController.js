const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function modelController() {

  const Model = mongoose.model("Admin");
  const Password = mongoose.model("AdminPassword");

  const methods = createCRUDController("Admin");

  // =============================
  // CREATE STAFF
  // =============================
  methods.createStaff = async (req, res) => {

    try {

      const { name, email, password, phone, role } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
      }

      const existingUser = await Model.findOne({
        email,
        removed: false
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Create Admin document first
      const staff = new Model({
        name,
        email,
        phone,
        role: role || "staff",
        enabled: true,
        removed: false
      });

      const savedStaff = await staff.save();
      console.log("Admin document created:", savedStaff._id);

      try {
        // Generate salt (plain random string) and hash password
        // CORRECT METHOD: Use uniqueId for salt (like setup.js), NOT bcrypt.genSaltSync
        // And use bcrypt.hashSync WITHOUT rounds parameter (uses default 10)
        const { generate: uniqueId } = require('shortid');
        const salt = uniqueId();
        const hashedPassword = bcrypt.hashSync(salt + password);

        // Create Password document
        const passwordDoc = new Password({
          user: savedStaff._id,
          password: hashedPassword,
          salt: salt,
          removed: false,
          emailVerified: true
        });

        const savedPassword = await passwordDoc.save();
        console.log("Password document created:", savedPassword._id);

        // Verify the password document was created
        const verifyPassword = await Password.findOne({ user: savedStaff._id });
        if (!verifyPassword) {
          throw new Error("Password document verification failed after save");
        }

      } catch (passwordError) {
        // If password creation fails, delete the admin document to maintain consistency
        await Model.findByIdAndDelete(savedStaff._id);
        console.error("Password creation error:", passwordError.message);
        return res.status(500).json({
          success: false,
          message: "Failed to create password: " + passwordError.message,
        });
      }

      res.status(200).json({
        success: true,
        result: savedStaff,
        message: "Staff created successfully",
      });

    } catch (error) {
      console.error("createStaff error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };


  // =============================
  // LIST STAFF
  // =============================
  methods.listStaff = async (req, res) => {

    try {

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.items) || 10;
      const skip = (page - 1) * limit;

      const filter = {
        role: "staff",
        removed: false,
      };

      const staff = await Model.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created: -1 });

      const count = await Model.countDocuments(filter);

      res.status(200).json({
        success: true,
        result: {
          items: staff,
          pagination: {
            page,
            pages: Math.ceil(count / limit),
            count,
          },
        },
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };

  // =============================
  // UPDATE STAFF
  // =============================
  methods.updateStaff = async (req, res) => {

    try {

      const { id } = req.params;
      const { name, phone, email, password } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Name and email are required",
        });
      }

      // Check if staff exists
      const staff = await Model.findById(id);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      // Check if email is already taken by another staff
      const existingEmail = await Model.findOne({
        email,
        _id: { $ne: id },
        removed: false
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Update staff basic info
      const updateData = { name, phone, email };

      // If password is provided, update it
      if (password) {
        try {
          const { generate: uniqueId } = require('shortid');
          const salt = uniqueId();
          const hashedPassword = bcrypt.hashSync(salt + password);

          // Check if password document exists
          let passwordDoc = await Password.findOne({ user: id });

          if (passwordDoc) {
            // Update existing password document
            passwordDoc.password = hashedPassword;
            passwordDoc.salt = salt;
            await passwordDoc.save();
          } else {
            // Create new password document
            passwordDoc = new Password({
              user: id,
              password: hashedPassword,
              salt: salt,
              removed: false,
              emailVerified: true
            });
            await passwordDoc.save();
          }
        } catch (passwordError) {
          console.error("Password update error:", passwordError.message);
          return res.status(500).json({
            success: false,
            message: "Failed to update password",
          });
        }
      }

      // Update staff
      const updatedStaff = await Model.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      res.status(200).json({
        success: true,
        result: updatedStaff,
        message: "Staff updated successfully",
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };

  // =============================
  // DELETE STAFF
  // =============================
  methods.deleteStaff = async (req, res) => {

    try {

      const { id } = req.params;

      // Check if staff exists
      const staff = await Model.findById(id);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      // Soft delete staff
      const deletedStaff = await Model.findByIdAndUpdate(
        id,
        { removed: true },
        { new: true }
      );

      res.status(200).json({
        success: true,
        result: deletedStaff,
        message: "Staff deleted successfully",
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };

  return methods;
}

module.exports = modelController();
