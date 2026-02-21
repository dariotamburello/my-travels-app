import HomeClient from "@/src/components/HomeClient";
import { getPhotos, getTrips } from "@/src/services/db";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "user-123";

export default async function Home() {
  const [photoPoints, trips] = await Promise.all([
    getPhotos(DEMO_USER_ID),
    getTrips(DEMO_USER_ID),
  ]);

  return <HomeClient photoPoints={photoPoints} trips={trips} />;
}
