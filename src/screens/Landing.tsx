import { Package } from "lucide-react";

export default function Landing({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-12">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        {/* Left panel */}
        <div className="flex flex-col items-center justify-center gap-6 bg-emerald-500 px-8 py-14 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 ring-1 ring-white/40">
            <Package className="h-10 w-10 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            Upang Delivers
          </h1>
          <p className="text-sm font-semibold tracking-[0.35em] text-white/90">
            CAMPUS MICRO-GIGS
          </p>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-4 shadow-lg">
            <img
              src="/images/mascot.png"
              alt="Upang Delivers mascot"
              className="mx-auto w-full rounded-xl object-contain"
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center justify-center gap-7 bg-white px-8 py-16 text-center">
          <h2 className="max-w-xs text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
            Need someone to help you?
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-slate-500">
            Join the exclusive micro-gig community for PHINMA University of
            Pangasinan students.
          </p>
          <button
            onClick={onNext}
            className="w-full max-w-sm rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-600 active:translate-y-0"
          >
            Get Started
          </button>
          <p className="text-sm italic text-slate-400">
            Exclusive for PHINMA University of Pangasinan
          </p>
        </div>
      </div>
    </div>
  );
}
