import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleDailyCheckin } from "@/lib/points";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await handleDailyCheckin(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
