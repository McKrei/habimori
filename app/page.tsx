import HomePage from "@/src/components/home/HomePage";
import { DEFAULT_LANGUAGE } from "@/src/i18n/config";

export default function Page() {
  return <HomePage lng={DEFAULT_LANGUAGE} />;
}
