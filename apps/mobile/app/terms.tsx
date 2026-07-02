import { LegalDocumentScreen } from "../src/components/LegalDocumentScreen";
import { termsSections } from "../src/content/legalCopy";

export default function TermsScreen() {
  return <LegalDocumentScreen title="Terms of Service" sections={termsSections} />;
}
