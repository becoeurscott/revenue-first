"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Spinner } from "@/components/ui";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading) return <div className="min-h-screen grid place-items-center bg-bg"><Spinner /></div>;
  if (!user) return null;
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
