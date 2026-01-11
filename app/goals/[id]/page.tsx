import GoalDetailsPage from "@/src/components/goal-details/GoalDetailsPage";
import { DEFAULT_LANGUAGE } from "@/src/i18n/config";

export default function Page({ params }: { params: { lng: string } }) {
  return <GoalDetailsPage lng={params.lng || DEFAULT_LANGUAGE} />;
}
