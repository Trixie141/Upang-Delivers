import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [4, "Full name must be at least 4 characters."],
      maxlength: [60, "Full name must be 60 characters or fewer."],
      match: [
        /^[\p{L}.'-]+(?:\s+[\p{L}.'-]+)+$/u,
        "Enter your first and last name (letters only).",
      ],
    },
    studentId: {
      type: String,
      default: null,
      // sparse unique: many nulls allowed (admins), but no duplicates
      match: [/^\d{2}-\d{4}-\d{3,6}$/, "Use the campus format 03-2425-045935."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      maxlength: 80,
      match: [/^[^\s@]+@phinmaed\.com$/i, "Must be your official @phinmaed.com email."],
    },
    /**
     * Only the bcrypt digest is ever persisted.
     * `select: false` keeps it out of every query result unless explicitly asked for,
     * so it can never leak through an API response by accident.
     */
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: { values: ["student", "delivery", "admin"], message: "Unknown role." },
      index: true,
    },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    failedLogins: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },

    /** Editable profile fields (saved via PATCH /api/auth/me) */
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    spot: { type: String, trim: true, maxlength: 80, default: "" },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        delete ret.passwordHash; // belt and braces
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });

/** Virtual setter: assigning `user.password = "..."` queues a bcrypt hash. */
userSchema
  .virtual("password")
  .set(function setPassword(plain) {
    this._plainPassword = plain;
  })
  .get(function getPassword() {
    return undefined;
  });

// Runs BEFORE validation, so `passwordHash: { required: true }` sees the hash.
userSchema.pre("validate", async function hashBeforeValidate() {
  if (!this._plainPassword) return;
  this.passwordHash = await bcrypt.hash(this._plainPassword, ROUNDS);
  this._plainPassword = undefined;
});

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  // passwordHash is select:false; if it was not loaded, fail closed instead of throwing.
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.fullName,
    studentId: this.studentId,
    email: this.email,
    phone: this.phone ?? "",
    spot: this.spot ?? "",
    role: this.role,
    status: this.status,
  };
};

export const User = mongoose.model("User", userSchema);