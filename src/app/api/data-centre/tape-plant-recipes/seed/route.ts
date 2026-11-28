import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";
import { syncTapelineMasterRecipes } from "@/lib/tape-plant/sync-tapeline-master";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const result = await syncTapelineMasterRecipes(db);

    await logEvent({
      action: "SEED_RECIPES",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: result,
      meta: {
        description: `Synced ${result.seededCount} Tapeline Master recipes (retired ${result.retiredRecipesCount} legacy rows)`,
      },
      userId: auth.user.id,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Synced ${result.seededCount} Tapeline Master recipes (${result.retiredRecipesCount} old rows retired)`,
    });
  } catch (error: any) {
    console.error("Error seeding Tape Plant Recipes:", error);
    return NextResponse.json(
      { error: "Failed to sync Tapeline Master recipes" },
      { status: 500 }
    );
  }
}
