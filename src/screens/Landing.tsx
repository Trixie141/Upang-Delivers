interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-xl md:grid-cols-2">
        {/* Left: brand panel */}
        <div className="flex flex-col items-center bg-emerald-500 px-8 py-10 text-center text-white">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
              <path d="m3 8 9 5 9-5M12 13v8" />
            </svg>
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[1.05] sm:text-6xl">
            Upang
            <br />
            Delivers
          </h1>
          <p className="mt-5 text-sm font-medium tracking-[0.3em]">
            CAMPUS MICRO-GIGS
          </p>

          <div className="mt-8 flex w-full items-center justify-center rounded-2xl bg-white p-4 shadow-lg">
            {/* Put your mascot image at public/mascot.png */}
            <img
              src="/mascot.png"
              alt="Upang Delivers courier running with a food delivery bag"
              className="h-44 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Right: call to action */}
        <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
          <h2 className="max-w-xs text-4xl font-black leading-tight text-slate-900">
            Need someone to help you?
          </h2>
          <p className="mt-6 max-w-sm text-slate-500">
            Join the exclusive micro-gig community for PHINMA University of
            Pangasinan students.
          </p>

          <button
            onClick={onGetStarted}
            className="mt-8 w-full max-w-sm rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            Get Started
          </button>

          <p className="mt-6 text-sm italic text-slate-400">
            Exclusive for PHINMA University of Pangasinan
          </p>
        </div>
      </div>
    </div>
  );
}