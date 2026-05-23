"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ConsentForm } from "@/components/ConsentForm";

export default function ConsentPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <ConsentForm
        patientId={patientId}
        onSigned={() => router.push(`/intake/${patientId}`)}
      />
    </div>
  );
}
