import { ArrowDown, ArrowRight, CheckCircle2, Clock3, MapPin, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

interface LandingProps {
  onGetStarted: () => void;
}

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Post what you need",
    description: "Share the pickup, drop-off, deadline, and reward for your campus errand.",
  },
  {
    number: "02",
    icon: Clock3,
    title: "A runner accepts",
    description: "A fellow student can pick up the gig and coordinate the delivery with you.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Follow it through",
    description: "Keep up with the errand and confirm when the delivery is complete.",
  },
];

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-100 text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label="Upang Delivers home">
          <BrandLogo size="md" />
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-semibold text-slate-600 transition hover:text-emerald-700">How it works</a>
          <span className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold tracking-wide text-emerald-800">PHINMA UPang community</span>
        </div>
        <button onClick={onGetStarted} className="rounded-full bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-2.5 text-sm font-bold text-white transition hover:from-emerald-700 hover:to-green-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
          Sign in <ArrowRight className="ml-2 inline h-4 w-4" />
        </button>
      </header>

      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-16 pt-8 sm:px-8 md:pb-24 lg:grid-cols-[1.04fr_.96fr] lg:gap-12 lg:px-12 lg:pt-12">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Campus errands, made easier
          </div>
          <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
            Your campus day,
            <span className="mt-2 block text-emerald-600">with a little help.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            Need something picked up or delivered around campus? Post an errand, set a reward, and connect with a student runner.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={onGetStarted} className="rounded-2xl bg-emerald-500 px-7 py-4 text-base font-extrabold text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
              Get started <ArrowRight className="ml-2 inline h-5 w-5" />
            </button>
            <a href="#how-it-works" className="rounded-2xl px-6 py-4 text-center text-sm font-bold text-slate-600 transition hover:bg-white hover:text-emerald-700">
              See how it works <ArrowDown className="ml-2 inline h-4 w-4" />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> For PHINMA UPang students</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Email verified accounts</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-amber-200/60 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-emerald-200/70 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 shadow-2xl shadow-emerald-900/10 sm:p-9">
            <div className="absolute right-6 top-6 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide text-white">CAMPUS MICRO-GIGS</div>
            <div className="flex min-h-[330px] items-center justify-center sm:min-h-[390px]">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-[2.5rem] border border-white/40 bg-white/15 shadow-inner sm:h-64 sm:w-64">
                <div className="absolute inset-5 rounded-[2rem] border border-dashed border-white/40" />
                <span className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white text-emerald-600 shadow-2xl shadow-emerald-950/15 sm:h-36 sm:w-36">
                  <PackageCheck className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" strokeWidth={1.5} />
                </span>
                <span className="absolute left-0 top-8 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-lg sm:-left-8">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Pickup
                </span>
                <span className="absolute bottom-7 right-0 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-lg sm:-right-8">
                  <MapPin className="h-4 w-4 text-rose-500" /> Drop-off
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">A helping hand around campus</p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">Post. Connect. Deliver.</p>
                </div>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><PackageCheck className="h-5 w-5" /></span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Made for student-to-student errands
              </div>
            </div>
          </div>
          <span className="absolute -left-4 top-24 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-lg sm:block">Your campus, connected <span className="ml-1 text-emerald-500">✦</span></span>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200/70 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Simple from start to finish</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A smoother way to get things done</h2>
            <p className="mt-4 text-slate-500">Whether you need help or want to earn by helping, getting started takes a few steps.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <article key={number} className="rounded-3xl border border-slate-100 bg-[#fbfaf7] p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" /></span>
                  <span className="text-sm font-extrabold tracking-widest text-slate-300">{number}</span>
                </div>
                <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
                <p className="mt-2 leading-7 text-slate-500">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-800 px-6 py-7 text-center text-white sm:flex-row sm:px-9 sm:text-left">
            <div>
              <h3 className="text-xl font-extrabold">Ready to make your campus day easier?</h3>
              <p className="mt-1 text-sm text-slate-300">Join the Upang Delivers student community.</p>
            </div>
            <button onClick={onGetStarted} className="shrink-0 rounded-2xl bg-emerald-500 px-6 py-3.5 font-bold text-white transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
              Get started <ArrowRight className="ml-2 inline h-4 w-4" />
            </button>
          </div>
          <footer className="pt-8 text-center text-xs font-medium text-slate-400">Upang Delivers · PHINMA University of Pangasinan</footer>
        </div>
      </section>
    </main>
  );
}
