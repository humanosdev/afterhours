import { LegalDocumentScreen } from "../src/components/LegalDocumentScreen";
import { guidelinesSections } from "../src/content/legalCopy";

export default function GuidelinesScreen() {
  return (
    <LegalDocumentScreen
      title="Community Guidelines"
      subtitle="Keep Intencity safe, social, and respectful."
      sections={guidelinesSections}
    />
  );
}
