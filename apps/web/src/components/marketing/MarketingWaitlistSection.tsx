import { appConfig } from "@/lib/appConfig";
import { Mail } from "lucide-react";

const WAITLIST_SUBJECT = "Intencity early access waitlist";
const WAITLIST_BODY = `Hi Intencity team,

Please add me to the early access waitlist.

Name:
City:
Phone (optional):
Platform: iOS / Android / Both

Thanks!`;

function waitlistMailtoHref(): string {
  const params = new URLSearchParams({
    subject: WAITLIST_SUBJECT,
    body: WAITLIST_BODY,
  });
  return `mailto:${appConfig.contactEmail}?${params.toString()}`;
}

/** Explains the manual email waitlist (no backend list yet). */
export function MarketingWaitlistSection() {
  return (
    <section id="waitlist" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Early access waitlist
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-white/55 sm:text-base">
          We&apos;re not on the App Store or Google Play yet. Join the waitlist and we&apos;ll email you
          when TestFlight or the Android beta opens in your city.
        </p>

        <ol className="mx-auto mt-10 max-w-md space-y-4 text-sm text-white/60">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-violet/15 text-xs font-bold text-accent-violet-active">
              1
            </span>
            <span>
              Tap <strong className="font-medium text-white/80">Join the waitlist</strong> — it opens an
              email to{" "}
              <a href={`mailto:${appConfig.contactEmail}`} className="text-accent-violet-active hover:underline">
                {appConfig.contactEmail}
              </a>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-violet/15 text-xs font-bold text-accent-violet-active">
              2
            </span>
            <span>
              Send the pre-filled note with your <strong className="font-medium text-white/80">name</strong>,{" "}
              <strong className="font-medium text-white/80">city</strong>, and{" "}
              <strong className="font-medium text-white/80">iOS or Android</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-violet/15 text-xs font-bold text-accent-violet-active">
              3
            </span>
            <span>
              We add you manually and reply when your invite is ready — usually in batches before launch.
            </span>
          </li>
        </ol>

        <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-white/35">
          No spam, no automated list yet — just a direct line to the team while we&apos;re in closed beta.
        </p>

        <a
          href={waitlistMailtoHref()}
          className="mx-auto mt-6 flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-3 text-sm font-semibold text-white transition hover:border-white/[0.16] hover:bg-white/[0.07]"
        >
          <Mail size={16} strokeWidth={1.75} aria-hidden />
          Join the waitlist
        </a>
      </div>
    </section>
  );
}

export { waitlistMailtoHref, WAITLIST_SUBJECT, WAITLIST_BODY };
