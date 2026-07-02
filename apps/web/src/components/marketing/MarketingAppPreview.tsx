import Image from "next/image";

/** Real app screenshot — no fake UI chrome. */
export function MarketingAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[272px] sm:max-w-[300px]">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-accent-violet/15 blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-black shadow-[0_28px_72px_rgba(0,0,0,0.55),0_0_0_1px_rgba(59,102,255,0.08)] ring-1 ring-white/[0.04]">
        <Image
          src="/marketing/app-map-screenshot.png"
          alt="Intencity map with live venues, friend pins, and category filters"
          width={514}
          height={1024}
          className="h-auto w-full"
          priority
          sizes="(max-width: 640px) 272px, 300px"
        />
      </div>
    </div>
  );
}
