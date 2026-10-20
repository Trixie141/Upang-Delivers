import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldAlert, Package } from "lucide-react";
import { api } from "../lib/api";
import LegalDocumentModal, { type LegalDocument } from "../components/LegalDocumentModal";

type SignUpRole = "student" | "delivery";

/** What the server returns for a signed-in user (see toSafeJSON in the backend User model). */
type SessionUser = { id: string; name: string; role: string };

const NAME_RE = /^[\p{Lu}][\p{L}.'-]*(?:\s+[\p{Lu}][\p{L}.'-]*)+$/u;
const STUDENT_ID_RE = /^\d{2}-\d{4}-\d{3,6}$/;
const titleCaseName = (value: string) =>
  value.replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase());

type Form = {
  role: SignUpRole;
  fullName: string;
  studentId: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
  studentIdImage: string;
  selfieImage: string;
};

async function compressImageAsJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process this image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length <= 220_000) return data;
  }
  throw new Error("Image is still too large. Choose a smaller or clearer photo.");
}

function captureVideoFrame(video: HTMLVideoElement): string {
  const scale = Math.min(1, 1000 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not capture the camera image.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.78, 0.68, 0.58, 0.48, 0.38]) {
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length <= 220_000) return data;
  }
  throw new Error("The captured image is too large. Move closer to the camera and try again.");
}

/** Client-side mirror of registerSchema in backend/src/middleware/validate.js.
 *  The server is still the authority: this only saves a round trip. */
function validateSignUp(v: Form): Record<string, string> {
  const f: Record<string, string> = {};

  if (v.role !== "student" && v.role !== "delivery")
    f.role = "Choose Student or Runner.";

  const name = v.fullName.trim();
  if (name.length < 4 || name.length > 60 || !NAME_RE.test(name))
    f.fullName = "Use letters only and capitalize each name, like Juan Dela Cruz.";

  const email = v.email.trim().toLowerCase();
  if (!/^[^\s@]+@phinmaed\.com$/.test(email) || email.length > 80)
    f.email = "Must be your official @phinmaed.com email.";

  if (!STUDENT_ID_RE.test(v.studentId.trim()))
    f.studentId = "Use the campus format 04-2021-00456.";
  if (!v.studentIdImage) f.studentIdImage = "Upload a clear photo of your student ID.";
  if (!v.selfieImage) f.selfieImage = "Start the camera and capture a clear image of your face.";

  const pw = v.password;
  if (pw.length < 8) f.password = "Password must be at least 8 characters.";
  else if (pw.length > 20) f.password = "Password must be 20 characters or fewer.";
  else if (new TextEncoder().encode(pw).length > 72) f.password = "Password must be 72 bytes or fewer.";
  else if (!/[A-Z]/.test(pw)) f.password = "Password needs one uppercase letter.";
  else if (!/[a-z]/.test(pw)) f.password = "Password needs one lowercase letter.";
  else if (!/\d/.test(pw)) f.password = "Password needs one number.";
  else if (!/[^A-Za-z0-9]/.test(pw)) f.password = "Password needs one special character.";
  else if (/\s/.test(pw)) f.password = "Password must not contain spaces.";
  else {
    const local = email.split("@")[0];
    if (local.length >= 3 && pw.toLowerCase().includes(local))
      f.password = "Password must not contain your email name.";
  }

  if (v.confirm !== pw) f.confirm = "Passwords do not match.";
  if (!v.agree) f.agree = "You must accept the Terms and Conditions and Privacy Policy.";

  return f;
}

const inputClass = (bad?: string) =>
  `mt-2 w-full rounded-xl border px-5 py-3.5 text-slate-800 outline-none transition focus:ring-4 ${
    bad
      ? "border-rose-400 focus:ring-rose-500/10"
      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
  }`;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1.5 text-sm font-medium text-rose-600">{msg}</p> : null;

export default function SignUp({
  onBackToLogin,
  onSignUpSuccess,
}: {
  onBackToLogin: () => void;
  onSignUpSuccess: (token: string, user: SessionUser) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentIdImage, setStudentIdImage] = useState("");
  const [studentIdImageName, setStudentIdImageName] = useState("");
  const [selfieImage, setSelfieImage] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [role, setRole] = useState<SignUpRole>("student");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraStream || !video) return;
    video.srcObject = cameraStream;
    void video.play().catch(() => setCameraError("Allow camera access in your browser, then try again."));
    return () => {
      video.srcObject = null;
      cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  async function startCamera() {
    setCameraError("");
    setSelfieImage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera access requires HTTPS or localhost and a supported browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraStream(stream);
      setFields((current) => ({ ...current, selfieImage: "" }));
    } catch {
      setCameraError("Camera access was blocked or unavailable. Allow camera permission in your browser and try again.");
    }
  }

  function captureFace() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still starting. Wait a moment and try again.");
      return;
    }
    try {
      setSelfieImage(captureVideoFrame(video));
      setCameraError("");
      setFields((current) => ({ ...current, selfieImage: "" }));
      setCameraStream(null);
    } catch (captureError) {
      setCameraError(captureError instanceof Error ? captureError.message : "Could not capture the camera image.");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedName = titleCaseName(fullName.trim());
    setFullName(normalizedName);

    // 1. Catch obvious mistakes locally so no request is spent on them.
    const clientErrors = validateSignUp({ role, fullName: normalizedName, studentId, email, password, confirm, agree, studentIdImage, selfieImage });
    setFields(clientErrors);
    if (Object.keys(clientErrors).length) {
      setError("Fix the highlighted fields - the request was never sent.");
      return;
    }

    // 2. The server validates everything again and stays the authority.
    setBusy(true);
    const res = await api.register({
      fullName: normalizedName,
      studentId: studentId.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirm,
      role,
      agree,
    });
    setBusy(false);

    if (!res.ok) {
      setFields(res.fields ?? {});
      setError(res.error || "Failed to register account.");
      return;
    }
    if (res.data?.verificationPending) {
      setNotice(res.data.message || "Your student ID is waiting for administrator review.");
      setPendingApproval(true);
      setPendingVerification(false);
      return;
    }

    // 3. The App needs the whole user (id, name, role), not just the name.
    if (res.data?.verificationRequired) {
      setPendingVerification(true);
      setNotice(res.data.emailSent
        ? `We sent a 6-digit code to ${res.data.email}. It expires in 10 minutes. After email verification, student accounts wait for an administrator to review the uploaded ID.`
        : "We couldn't send the verification email, so your account hasn't been created yet. Please contact the system administrator. Once email delivery is available, tap Send a new code.");
      return;
    }

    const token = res.data?.token;
    const user = res.data?.user;

    if (!token || !user?.id || !user?.name || !user?.role) {
      setError("Account created but the session data is incomplete. Please log in.");
      return;
    }

    localStorage.setItem("token", token);
    onSignUpSuccess(token, { id: user.id, name: user.name, role: user.role });
  };

  async function verifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.completeRegistration({
      fullName: titleCaseName(fullName.trim()),
      studentId: studentId.trim(),
      email: normalizedEmail,
      password,
      confirm,
      role,
      agree,
      code: verificationCode,
      studentIdImage,
      selfieImage,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Could not verify this email.");
      return;
    }
    if (res.data?.verificationPending) {
      setNotice(res.data.message || "Your student ID is waiting for administrator review.");
      setPendingApproval(true);
      setPendingVerification(false);
      return;
    }
    const token = res.data?.token;
    const user = res.data?.user;
    if (!token || !user?.id || !user?.name || !user?.role) {
      setError("Email verified, but the session could not be started. Please log in.");
      return;
    }
    localStorage.setItem("token", token);
    onSignUpSuccess(token, { id: user.id, name: user.name, role: user.role });
  }

  async function resendCode() {
    setBusy(true);
    setError("");
    const res = await api.resendVerification(email.trim().toLowerCase());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Could not send a new code.");
      return;
    }
    setNotice(res.message || "A new verification code was sent.");
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-xl rounded-[32px] bg-white p-8 shadow-2xl sm:p-12">
          <h1 className="text-3xl font-extrabold text-slate-900">Account under review</h1>
          <p className="mt-4 text-slate-600">{notice}</p>
          <button type="button" onClick={onBackToLogin} className="mt-7 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white">Back to Log In</button>
        </div>
      </div>
    );
  }

  if (pendingVerification) {
    return (
      <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-xl rounded-[32px] bg-white p-8 shadow-2xl sm:p-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="mt-7 text-3xl font-extrabold text-slate-900">Verify your email</h1>
          <p className="mt-3 text-slate-600">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
          {notice && (
            <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${notice.startsWith("We couldn't send") ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
              {notice}
            </p>
          )}
          <form onSubmit={verifyEmail} className="mt-5">
            <label className="block text-xs font-bold tracking-wider text-slate-500">EMAIL VERIFICATION CODE</label>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-4 tracking-[0.3em] text-slate-800 outline-none focus:border-emerald-500" />
            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}
            <button type="submit" disabled={busy || verificationCode.length !== 6} className="mt-5 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white disabled:opacity-60">{busy ? "Verifying..." : "Verify Email and Create Account"}</button>
          </form>
          <button type="button" disabled={busy} onClick={resendCode} className="mt-5 w-full text-sm font-bold text-emerald-700 hover:underline disabled:opacity-50">Send a new code</button>
          <button type="button" onClick={onBackToLogin} className="mt-5 w-full text-sm text-slate-500 hover:underline">Back to Log In</button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        <form onSubmit={handleSubmit} noValidate className="bg-white px-8 py-12 sm:px-14">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-900">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Join Upang Delivers using your university email.
          </p>

          <label className="mt-6 block text-xs font-bold tracking-wider text-slate-500">
            ACCOUNT TYPE
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as SignUpRole)}
            className={inputClass(fields.role)}
          >
            <option value="student">Student — Post errands and requests</option>
            <option value="delivery">Runner — Accept and complete errands</option>
          </select>
          <FieldError msg={fields.role} />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            FULL NAME
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value.replace(/[^\p{L}\s.'-]/gu, ""))}
            onBlur={() => setFullName((name) => titleCaseName(name))}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
            placeholder="Juan Dela Cruz"
            className={inputClass(fields.fullName)}
          />
          <FieldError msg={fields.fullName} />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            STUDENT ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.replace(/[^\d-]/g, "").slice(0, 14))}
            inputMode="text"
            autoComplete="off"
            maxLength={14}
            placeholder="04-2021-00456"
            className={inputClass(fields.studentId)}
          />
          <FieldError msg={fields.studentId} />
          <p className="mt-1.5 text-xs text-slate-400">Use numbers and hyphens only, like 04-2021-00456.</p>

          <>
            <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">UPLOAD STUDENT ID</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setStudentIdImage("");
                setStudentIdImageName("");
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  setFields((current) => ({ ...current, studentIdImage: "Choose an image file." }));
                  return;
                }
                try {
                  const compressed = await compressImageAsJpeg(file);
                  setStudentIdImage(compressed);
                  setStudentIdImageName(file.name);
                  setFields((current) => ({ ...current, studentIdImage: "" }));
                } catch (imageError) {
                  setFields((current) => ({ ...current, studentIdImage: imageError instanceof Error ? imageError.message : "Could not read this image." }));
                }
              }}
              className={inputClass(fields.studentIdImage)}
            />
            <p className="mt-1.5 text-xs text-slate-400">A clear photo is converted to a smaller JPEG and shown only to the administrator for verification.</p>
            {studentIdImageName && <p className="mt-1 text-xs text-emerald-700">Selected: {studentIdImageName}</p>}
            <FieldError msg={fields.studentIdImage} />

            <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">LIVE FACE CAPTURE</label>
            <p className="mt-1.5 text-xs text-slate-400">Allow camera access and capture your face now. An administrator will compare this image manually with your student ID.</p>
            {selfieImage ? (
              <div className="mt-3">
                <img src={selfieImage} alt="Captured face for manual student ID review" className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />
                <button type="button" onClick={startCamera} className="mt-2 text-sm font-semibold text-emerald-700 underline">Retake using camera</button>
              </div>
            ) : cameraStream ? (
              <div className="mt-3">
                <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" className="max-h-72 w-full rounded-xl bg-slate-900 object-cover" />
                <button type="button" onClick={captureFace} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">Capture face</button>
              </div>
            ) : (
              <button type="button" onClick={startCamera} className={`mt-2 w-full rounded-xl border px-5 py-3.5 font-semibold text-emerald-800 transition hover:bg-emerald-50 ${fields.selfieImage ? "border-rose-400" : "border-slate-200"}`}>Open camera</button>
            )}
            {cameraError && <p className="mt-2 text-sm font-medium text-rose-600">{cameraError}</p>}
            <FieldError msg={fields.selfieImage} />
          </>

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PHINMA EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan.upang@phinmaed.com"
            className={inputClass(fields.email)}
          />
          <FieldError msg={fields.email} />

        

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PASSWORD
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={20}
              autoComplete="new-password"
              className={`${inputClass(fields.password)} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </div>
          {fields.password ? (
            <FieldError msg={fields.password} />
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">
              8–20 characters with an uppercase letter, a lowercase letter, a number and a symbol.
            </p>
          )}

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            CONFIRM PASSWORD
          </label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            maxLength={20}
            autoComplete="new-password"
            className={inputClass(fields.confirm)}
          />
          <FieldError msg={fields.confirm} />

          <div className="mt-5 flex items-start gap-3 text-sm text-slate-600">
            <input
              id="signup-legal-consent"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
            />
            <div className="leading-6">
              <label htmlFor="signup-legal-consent" className="cursor-pointer">
                I agree to the
              </label>{" "}
              <button
                type="button"
                onClick={() => setLegalDocument("terms")}
                className="font-bold text-emerald-700 underline underline-offset-2"
              >
                Terms and Conditions
              </button>{" "}
              <span>and confirm that I have read the</span>{" "}
              <button
                type="button"
                onClick={() => setLegalDocument("privacy")}
                className="font-bold text-emerald-700 underline underline-offset-2"
              >
                Privacy Policy
              </button>.
            </div>
          </div>
          <FieldError msg={fields.agree} />

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy ? "Creating Account..." : "Sign Up"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-bold text-emerald-600 hover:underline"
            >
              Log In
            </button>
          </p>
        </form>

        <div className="flex flex-col items-center justify-center gap-6 bg-emerald-500 px-8 py-16 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 ring-1 ring-white/40">
            <Package className="h-12 w-12 text-white" strokeWidth={1.7} />
          </div>
          <h2 className="text-4xl font-extrabold text-white">Join Upang Delivers</h2>
          <p className="text-xs font-semibold tracking-[0.25em] text-white/85">
            PHINMA UNIVERSITY OF PANGASINAN
          </p>
        </div>
      </div>
    </div>
    <LegalDocumentModal document={legalDocument} onClose={() => setLegalDocument(null)} />
    </>
  );
}
