import { Redirect } from "expo-router";

/** Legacy route — profile setup lives on `/onboarding`. */
export default function UsernameOnboardingScreen() {
  return <Redirect href="/onboarding" />;
}
