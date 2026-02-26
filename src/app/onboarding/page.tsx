/**
 * Onboarding - primeiro acesso sem loja vinculada.
 * Pergunta se é dono ou funcionário e direciona corretamente.
 */
import { authService } from "@/services/auth.service";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const user = await authService.getCurrentUser();

  return (
    <OnboardingFlow
      userName={user.name}
      userEmail={user.email}
    />
  );
}
