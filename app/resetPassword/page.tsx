import React, { Suspense } from "react";
import ResetForm from "./resetForm";

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <ResetForm />
    </Suspense>
  );
}
