import { LegalDocumentScreen } from "../src/components/LegalDocumentScreen";
import { privacySections } from "../src/content/legalCopy";

/** Public legal route — reachable from auth and signed-in stacks. */
export default function PrivacyScreen() {
  return <LegalDocumentScreen title="Privacy Policy" sections={privacySections} />;
}
