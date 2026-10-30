"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/states";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { t } from "@/messages/vi";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page>
      <div className="relative card">
        <EmptyState
          icon={TriangleAlert}
          title={t.errors.title}
          body={t.errors.body}
          action={<Button onClick={reset}>{t.errors.retry}</Button>}
        />
      </div>
    </Page>
  );
}
