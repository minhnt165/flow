import { Suspense } from "react";
import { HomeView } from "@/components/home/home-view";
import { Page } from "@/components/layout/page";

export default function HomePage() {
  return (
    <Page>
      <Suspense>
        <HomeView />
      </Suspense>
    </Page>
  );
}
