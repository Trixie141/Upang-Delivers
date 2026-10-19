import { useEffect } from "react";
import { X } from "lucide-react";

export type LegalDocument = "terms" | "privacy";

const DOCUMENTS = {
  terms: {
    title: "Terms and Conditions",
    intro: "By creating an Upang Delivers account, you agree to use the service responsibly and follow these terms.",
    sections: [
      {
        heading: "Eligibility and account security",
        body: "Use your own active PHINMA University of Pangasinan account details. Keep your password private, provide accurate information, and tell a system administrator if you believe someone else accessed your account.",
      },
      {
        heading: "Using errands and runner services",
        body: "Post accurate instructions, locations, deadlines, contact details, and payment information. Accept only errands you can complete. Do not use the service for unlawful, unsafe, harassing, or prohibited activities, or post another person's private information without permission.",
      },
      {
        heading: "Payments and responsibility",
        body: "The app records the errand's selected payment method and amount; it does not process card or bank credentials. The requester and runner must confirm the amount and payment arrangement before proceeding, and follow campus rules when meeting or exchanging items.",
      },
      {
        heading: "Live location",
        body: "When a runner accepts an active errand, the runner may share location while the delivery is in progress. The location pin is limited to the campus map area and is removed when the errand is submitted for review, completed, or cancelled, or when the runner is outside the mapped area.",
      },
      {
        heading: "Misuse and service changes",
        body: "System administrators may review activity and suspend access when needed to protect users or the service. The service may be changed or unavailable during maintenance. These terms do not replace university policies or applicable law.",
      },
      {
        heading: "Questions",
        body: "For account, errand, or terms concerns, contact the campus/system administrator through your official university channel.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what Upang Delivers handles to provide campus errands, runner coordination, and account security.",
    sections: [
      {
        heading: "Information the service uses",
        body: "This includes your name, student ID number, student ID image and an image captured through the live signup camera for account review, PHINMA email, password hash, profile details, errand instructions and contact details, selected payment method, transaction amount, reviews, and security records. The app does not store your plain-text password.",
      },
      {
        heading: "Student identity review",
        body: "Your student ID image and signup camera capture are stored with your account and are available only to authenticated administrators for manual comparison and account eligibility review. The system does not perform automated facial recognition or automated liveness detection. These images are not displayed on your public profile or to other students and runners. Contact the administrator to ask about correcting or removing them.",
      },
      {
        heading: "How information is used",
        body: "Information is used to create and secure accounts, verify email addresses, post and fulfill errands, send service notifications, show relevant profiles and reviews, record errand transactions, and investigate security or service issues.",
      },
      {
        heading: "Runner location and map provider",
        body: "A runner's latest campus location is shared with the requester and assigned runner only while their errand is active. The app removes the location when the errand ends or the runner leaves the mapped campus area. Map tiles are requested from OpenStreetMap; the tile service may receive your IP address and the map area being viewed.",
      },
      {
        heading: "Email and service providers",
        body: "The service uses an email provider to deliver verification and password-reset codes, and MongoDB Atlas to store application records. Verification codes are stored as hashes and expire after 10 minutes. Security audit records, which may include an IP address, are retained for 30 days.",
      },
      {
        heading: "Access, retention, and your choices",
        body: "Access is limited by account roles and errand ownership. Account and errand records may remain in the database while needed to operate the service; the current app does not offer in-app account deletion. You may ask the campus/system administrator about accessing, correcting, or requesting deletion of your information.",
      },
      {
        heading: "Security and policy updates",
        body: "The service uses safeguards such as password hashing, access checks, and rate limits, but no online service can guarantee absolute security. Your accepted policy version and consent date are saved with your account.",
      },
      {
        heading: "Privacy questions",
        body: "For privacy requests or concerns, contact the campus/system administrator through your official university channel.",
      },
    ],
  },
} as const;

export default function LegalDocumentModal({
  document,
  onClose,
}: {
  document: LegalDocument | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!document) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [document, onClose]);

  if (!document) return null;
  const content = DOCUMENTS[document];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-document-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 id="legal-document-title" className="text-xl font-extrabold text-slate-900">
            {content.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close policy"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-600">
          <p className="mb-5">{content.intro}</p>
          <div className="space-y-5">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="font-bold text-slate-900">{section.heading}</h3>
                <p className="mt-1">{section.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
            Policy version 1.1 · October 20, 2026
          </p>
        </div>
        <footer className="border-t border-slate-100 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
