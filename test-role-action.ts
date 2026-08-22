import { createRole } from "./src/actions/roles";
import { db } from "./src/lib/db";

async function test() {
  console.log("Testing createRole...");
  try {
    const result = await createRole({
      name: "Test Role " + Date.now(),
      description: "Testing",
      permissions: [
        {
          module: "SETTINGS",
          canRead: true,
          canCreate: true,
          canUpdate: false,
          canDelete: false
        }
      ]
    });
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Caught error:", err);
  } finally {
    await db.$disconnect();
  }
}

test();
