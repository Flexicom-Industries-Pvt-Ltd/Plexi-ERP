import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileClient } from "./profile-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "My Profile | Plexi-ERP",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: true,
      department: true
    }
  });

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d2f83]">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information and security settings.
        </p>
      </div>

      <ProfileClient user={user} />
    </div>
  );
}
