import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Schemas - every request body is parsed here BEFORE touching the DB.
 * ------------------------------------------------------------------ */

const EMAIL = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(80, "Email is too long.")
  .email("Must be a valid email address.")
  .refine((v) => /@phinmaed\.com$/i.test(v), "Must be your official @phinmaed.com email.");

export const PASSWORD = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Z]/, "Password needs one uppercase letter.")
  .regex(/[a-z]/, "Password needs one lowercase letter.")
  .regex(/\d/, "Password needs one number.")
  .regex(/[^A-Za-z0-9]/, "Password needs one special character.")
  // .refine() must come after every .regex(): it returns an object that has no .regex().
  .refine((v) => !/\s/.test(v), "Password must not contain spaces.")
  // bcrypt only uses the first 72 bytes; reject longer input instead of silently truncating it.
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password must be 72 bytes or fewer.");

// Same forbidden-character rule for every free-text field.
const noMarkup = (schema) =>
  schema.refine((v) => !/[<>]/.test(v), "Must not contain the characters < or >.");

const FULL_NAME = z
  .string()
  .trim()
  .min(4, "Full name must be at least 4 characters.")
  .max(60, "Full name must be 60 characters or fewer.")
  .regex(
    /^[\p{Lu}][\p{L}.'-]*(?:\s+[\p{Lu}][\p{L}.'-]*)+$/u,
    "Use letters only and capitalize each name, like Juan Dela Cruz.",
  );

const STUDENT_ID = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{4}-\d{3,6}$/, "Use the campus format 03-0000-000000.");

export const registerSchema = z
  .object({
    fullName: FULL_NAME,
    studentId: z.string().trim().optional().default(""),
    email: EMAIL,
    password: PASSWORD,
    confirm: z.string(),
    role: z.enum(["student", "delivery"], {
      errorMap: () => ({ message: "Role must be student or delivery." }),
    }),
    agree: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Campus Conduct Policy." }),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirm)
      ctx.addIssue({ path: ["confirm"], code: "custom", message: "Passwords do not match." });

    // Only compare when the local part is long enough to be meaningful (avoids
    // rejecting most passwords for short names like "ab@phinmaed.com").
    const local = v.email ? v.email.split("@")[0].toLowerCase() : "";
    if (local.length >= 3 && v.password.toLowerCase().includes(local))
      ctx.addIssue({
        path: ["password"],
        code: "custom",
        message: "Password must not contain your email name.",
      });

    if (v.role === "student" || v.role === "delivery") {
      const parsed = STUDENT_ID.safeParse(v.studentId);
      if (!parsed.success)
        ctx.addIssue({
          path: ["studentId"],
          code: "custom",
          message: parsed.error.issues[0].message,
        });
    }
  });

// Login does not enforce the password policy: it would reveal the policy to attackers
// and lock out any older account. Wrong passwords simply fail the bcrypt comparison.
export const loginSchema = z.object({
    email: EMAIL,
    password: z.string().min(1, "Password is required.").max(128, "Password is too long."),
    requestedRole: z.enum(["student", "delivery"]).optional(),
  });

export const emailCodeSchema = z.object({
  email: EMAIL,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export const completeRegistrationSchema = registerSchema.and(
  z.object({ code: emailCodeSchema.shape.code }),
);

export const forgotPasswordSchema = z.object({ email: EMAIL });

export const resetPasswordSchema = emailCodeSchema.extend({ password: PASSWORD });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    newPassword: PASSWORD,
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirm)
      ctx.addIssue({ path: ["confirm"], code: "custom", message: "Passwords do not match." });
    if (v.newPassword === v.currentPassword)
      ctx.addIssue({ path: ["newPassword"], code: "custom", message: "Choose a different password." });
  });

export const errandSchema = z.object({
  title: noMarkup(
    z
      .string()
      .trim()
      .min(6, "Title must be at least 6 characters.")
      .max(90, "Title must be 90 characters or fewer."),
  ),
  instructions: noMarkup(
    z
      .string()
      .trim()
      .min(10, "Give the runner at least 10 characters of instructions.")
      .max(600, "Instructions are too long."),
  ),
  category: z.enum(["Food Run", "Printing", "Queuing", "Deliveries", "Others"]),
  pickup: noMarkup(z.string().trim().min(3, "Pick-up location is required.").max(80)),
  dropoff: noMarkup(z.string().trim().min(3, "Drop-off location is required.").max(80)),
  // Accepts a number or a numeric string; arrays and objects are rejected.
  reward: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z
      .number({ required_error: "Reward is required.", invalid_type_error: "Reward must be a number." })
      .int("Reward must be a whole number.")
      .min(20, "Minimum reward is ₱20.")
      .max(1000, "Maximum reward is ₱1000."),
  ),
  // z.coerce.boolean() turns the string "false" into true, so parse it explicitly.
  cod: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean({ invalid_type_error: "cod must be true or false." }).default(false),
  ),
  paymentMethod: z.enum(["cash_on_delivery", "e_wallet", "bank_transfer"]).default("cash_on_delivery"),
  deadline: noMarkup(z.string().trim().min(3, "Deadline is required.").max(60)),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "Phone number must be exactly 11 digits, numbers only."),
});

export const profileSchema = z.object({
  fullName: FULL_NAME,
  studentId: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{2}-\d{4}-\d{3,6}$/.test(value), "Use the campus format 03-0000-000000."),
  email: EMAIL,
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .regex(/^[0-9+()\-\s]*$/, "Use digits, spaces, + ( ) or - only.")
    .default(""),
   spot: noMarkup(z.string().trim().max(80, "Meeting spot is too long.")).default(""),
  available: z.boolean().optional(),
  currentPassword: z.string().max(128).optional().default(""),
});

   export const reviewSchema = z.object({
  rating: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().int("Rating must be a whole number.").min(1, "Minimum rating is 1.").max(5, "Maximum rating is 5."),
  ),
  comment: noMarkup(z.string().trim().max(200, "Comment is too long.")).default(""),
});

export const locationSchema = z.object({
  lat: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number().min(-90).max(90),
  ),
  lng: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number().min(-180).max(180),
  ),
});

export const pickupEvidenceSchema = z.object({
  billAmount: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number({ required_error: "Bill amount is required.", invalid_type_error: "Bill amount must be a number." })
      .finite("Bill amount must be a valid number.")
      .positive("Bill amount must be greater than ₱0.")
      .max(100000, "Bill amount cannot exceed ₱100,000."),
  ),
  receiptImage: z.string()
    .max(480_000, "Receipt image is too large. Choose a smaller photo.")
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Upload a valid receipt image."),
});

/** Express middleware factory: rejects invalid payloads with 422 + field map. */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] ?? "_";
        if (!fields[key]) fields[key] = issue.message;
      }
      req.validationFields = fields;
      return res.status(422).json({ error: "Invalid payload.", fields });
    }
    req.valid = result.data;
    next();
  };
}
