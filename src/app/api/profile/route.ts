import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logging";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone } = await request.json();

    const oldUser = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!oldUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { 
        name: name || oldUser.name,
        phone: phone || oldUser.phone,
      },
    });

    await logEvent({
      userId: session.user.id,
      module: "USERS",
      severity: "INFO",
      action: "Updated Personal Profile",
      payload: { old: oldUser, new: updatedUser },
      meta: { recordId: session.user.id },
    });

    return NextResponse.json({ success: true, user: { name: updatedUser.name, phone: updatedUser.phone } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
