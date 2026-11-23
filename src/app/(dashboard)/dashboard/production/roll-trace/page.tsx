import { Metadata } from "next";
import { RollTracingSection } from "@/components/loom/RollTracingSection";

export const metadata: Metadata = {
  title: "Roll Tracing & Genealogy | Flexicom ERP",
  description: "End-to-end manufacturing genealogy and tracking for fabric rolls.",
};

export default async function RollTracePage(props: {
  searchParams?: Promise<{ roll?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <RollTracingSection initialRollNumber={searchParams?.roll} />
    </div>
  );
}
