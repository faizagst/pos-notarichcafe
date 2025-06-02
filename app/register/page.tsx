import React, { Suspense } from "react";
import RegisterForm from "./registerForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
