interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
}

const dimensions = {
  sm: { mark: "h-9 w-9", text: "text-lg" },
  md: { mark: "h-11 w-11", text: "text-lg" },
  lg: { mark: "h-12 w-12", text: "text-lg" },
};

/** Upang Delivers mark: a campus pin carrying a small parcel. */
export default function BrandLogo({ size = "sm", inverse = false }: BrandLogoProps) {
  const scale = dimensions[size];

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`${scale.mark} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20`}>
        <svg viewBox="0 0 48 48" fill="none" className="h-[78%] w-[78%]" role="img" aria-label="Upang Delivers location and parcel logo">
          <path d="M24 4.5c-8.3 0-15 6.7-15 15 0 10.4 15 24 15 24s15-13.6 15-24c0-8.3-6.7-15-15-15Z" fill="white" />
          <path d="m16.5 18.5 7.5-4.3 7.5 4.3-7.5 4.3-7.5-4.3Z" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16.5 18.5v8l7.5 4.2 7.5-4.2v-8M24 22.8v7.9m-7.2-11.8 7.2 4.2 7.2-4.2" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`${scale.text} whitespace-nowrap font-black tracking-tight ${inverse ? "text-white" : "text-slate-900"}`}>
        Upang <span className={inverse ? "text-emerald-300" : "text-emerald-600"}>Delivers</span>
      </span>
    </span>
  );
}
