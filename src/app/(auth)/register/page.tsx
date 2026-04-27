import type { Metadata } from "next";

import { RegisterForm } from "@/components/ui/RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a ChessMind account with your username, city, and password.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
