import { GoalDetail } from "@/components/expenses/goal-detail";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GoalDetail id={id} />;
}
