import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { ProfileClient } from "./profile-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | Plexi-ERP",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Fetch full user profile including organizational data and recent activity
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      department: true,
      role: {
        include: { permissions: true }
      },
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch recent activity (Audit Logs) for this user
  const recentActivity = await db.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return (
    <div className="flex flex-col gap-6 p-6 h-full max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d2f83]">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information, security credentials, and view your permissions.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ProfileClient user={user} recentActivity={recentActivity} />
      </div>
    </div>
  );
}
