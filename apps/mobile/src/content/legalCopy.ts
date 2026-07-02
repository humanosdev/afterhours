import { appConfig } from "../lib/appConfig";
import type { LegalSection } from "../components/LegalDocumentScreen";

const { appName, supportEmail, contactEmail, partnershipsEmail, minimumAge } = appConfig;

export const privacySections: LegalSection[] = [
  {
    heading: "What we collect",
    paragraphs: [
      `${appName} uses profile, presence, and social graph data to power real-time nightlife awareness. We collect account info, profile details, and location presence needed to show live venue activity.`,
    ],
  },
  {
    heading: "How data is used",
    paragraphs: [
      `We use your data to show where friends are active, generate venue activity, and power chat and notifications. We do not sell personal data.`,
    ],
  },
  {
    heading: "Controls",
    paragraphs: [
      `You can edit your profile, block users, and manage notification preferences in settings. For support requests, contact ${supportEmail}. For general questions about this policy, contact ${contactEmail}.`,
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    heading: "Eligibility",
    paragraphs: [`You must be at least ${minimumAge} years old to use ${appName}.`],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      `Use ${appName} respectfully. Harassment, impersonation, abuse, or attempts to misuse real-time location signals are prohibited.`,
    ],
  },
  {
    heading: "Account responsibility",
    paragraphs: [
      `You are responsible for your account activity and credentials. Contact ${supportEmail} if your account is compromised. Venue, brand, or partnership inquiries: ${partnershipsEmail}.`,
    ],
  },
];

export const guidelinesSections: LegalSection[] = [
  {
    paragraphs: [
      "Respect other people's privacy and boundaries.",
      "No harassment, threats, or hateful behavior.",
      "No fake accounts, impersonation, or manipulative activity.",
      "Report unsafe behavior and use block features when needed.",
      "Repeated violations may result in account restrictions.",
    ],
  },
];
