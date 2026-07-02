import Image from "next/image";

type MarketingBrandMarkProps = {
  showSlogan?: boolean;
  iconClassName?: string;
  sloganClassName?: string;
};

/** Icon mark only (`hub-logo.png`) + typed slogan — no bitmap wordmark. */
export function MarketingBrandMark({
  showSlogan = true,
  iconClassName = "h-8 w-8",
  sloganClassName = "text-xs",
}: MarketingBrandMarkProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Image
        src="/hub-logo.png"
        alt=""
        width={486}
        height={514}
        className={`shrink-0 object-contain object-center ${iconClassName}`.trim()}
        priority
      />
      {showSlogan ? (
        <p className={`min-w-0 font-medium leading-snug text-white/55 ${sloganClassName}`.trim()}>
          Live the city, feel the{" "}
          <span className="font-semibold text-accent-violet-active">intencity</span>.
        </p>
      ) : null}
    </div>
  );
}
