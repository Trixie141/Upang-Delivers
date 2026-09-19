  import { z } from "zod";

  /* ------------------------------------------------------------------ *
  * Schemas — every request body is parsed here BEFORE touching the DB.
  * ------------------------------------------------------------------ */

  const EMAIL = z
    .string()
    .trim()
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
    .refine((v) => !/\s/.test(v), "Password must not contain spaces.");

  const FULL_NAME = z
    .string()
    .trim()
    .min(4, "Full name must be at least 4 characters.")
    .max(60, "Full name must be 60 characters or fewer.")
    .regex(
      /^[A-Za-zÑñ.'-]+(?:\s+[A-Za-zÑñ.'-]+)+$/,
      "Enter your first and last name (letters only).",
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
      role: z.enum(["student", "delivery", "employee"], {
        errorMap: () => ({ message: "Role must be student, delivery or employee." }),
      }),
      agree: z.literal(true, {
        errorMap: () => ({ message: "You must accept the Campus Conduct Policy." }),
      }),
    })
    .superRefine((v, ctx) => {
      if (v.password !== v.confirm)
        ctx.addIssue({ path: ["confirm"], code: "custom", message: "Passwords do not match." });
      if (v.email && v.password.toLowerCase().includes(v.email.split("@")[0].toLowerCase()))
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

  export const loginSchema = z.object({
    email: EMAIL,
    password: z
      .string()
      .min(1, "Password is required.")
      .max(128)
      .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password must be 72 bytes or fewer."),
  });

  export const errandSchema = z.object({
    title: z
      .string()
      .trim()
      .min(6, "Title must be at least 6 characters.")
      .max(90, "Title must be 90 characters or fewer.")
      .refine((v) => !/[<>]/.test(v), "Title contains forbidden characters (< >)."),
    instructions: z
      .string()
      .trim()
      .min(10, "Give the runner at least 10 characters of instructions.")
      .max(600, "Instructions are too long."),
    category: z.enum(["Food Run", "Printing", "Queuing", "Deliveries", "Others"]),
    pickup: z.string().trim().min(3, "Pick-up location is required.").max(80),
    dropoff: z.string().trim().min(3, "Drop-off location is required.").max(80),
    reward: z
      .coerce.number()
      .int("Reward must be a whole number.")
      .min(20, "Minimum reward is ₱20.")
      .max(1000, "Maximum reward is ₱1000."),
       cod: z.preprocess(
     (v) => (v === "true" ? true : v === "false" ? false : v),
     z.boolean().default(false)
   ),
    deadline: z.string().trim().min(3, "Deadline is required.").max(60),
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