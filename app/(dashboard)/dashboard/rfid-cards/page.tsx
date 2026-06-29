import { RfidCardRegistrationPage } from "@/components/rfid/rfid-card-registration-page";
import { getPreferredRegistrationDevice } from "@/lib/rfid-registration";

export default async function RfidCardsPage() {
  const initialDevice = await getPreferredRegistrationDevice();

  return <RfidCardRegistrationPage initialDevice={initialDevice} />;
}
