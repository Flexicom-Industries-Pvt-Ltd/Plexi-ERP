/**
 * Seed default production characteristic definitions for LPP roll production.
 * Run: npx tsx scripts/seed-production-characteristics.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LPP_ROLL_DEFAULTS = [
  {
    phase: "LOOM" as const,
    key: "roll_colour",
    label: "Roll Colour",
    fieldType: "SELECT" as const,
    options: [
      { label: "White", value: "white" },
      { label: "Blue", value: "blue" },
      { label: "Green", value: "green" },
      { label: "Red", value: "red" },
      { label: "Custom", value: "custom" },
    ],
    required: true,
    sortOrder: 1,
  },
  {
    phase: "LOOM" as const,
    key: "roll_width",
    label: "Roll Width (mm)",
    fieldType: "NUMBER" as const,
    required: true,
    sortOrder: 2,
  },
  {
    phase: "LOOM" as const,
    key: "roll_grade",
    label: "Grade",
    fieldType: "SELECT" as const,
    options: [
      { label: "A", value: "A" },
      { label: "B", value: "B" },
      { label: "C", value: "C" },
    ],
    required: true,
    sortOrder: 3,
  },
  {
    phase: "LOOM" as const,
    key: "roll_weight",
    label: "Target Weight (kg)",
    fieldType: "NUMBER" as const,
    required: true,
    sortOrder: 4,
  },
  {
    phase: "LOOM" as const,
    key: "customer_spec",
    label: "Customer Specification",
    fieldType: "TEXT" as const,
    required: false,
    sortOrder: 5,
  },
  {
    phase: "LAMINATION" as const,
    key: "lamination_type",
    label: "Lamination Type",
    fieldType: "SELECT" as const,
    options: [
      { label: "Gloss", value: "gloss" },
      { label: "Matt", value: "matt" },
      { label: "Metalized", value: "metalized" },
    ],
    required: true,
    sortOrder: 1,
  },
  {
    phase: "PRINTING" as const,
    key: "print_design",
    label: "Print Design",
    fieldType: "TEXT" as const,
    required: true,
    sortOrder: 1,
  },
  {
    phase: "PRINTING" as const,
    key: "print_colours",
    label: "Number of Colours",
    fieldType: "NUMBER" as const,
    required: true,
    sortOrder: 2,
  },
  {
    phase: "BOBBIN" as const,
    key: "bobbin_size",
    label: "Bobbin Size",
    fieldType: "SELECT" as const,
    options: [
      { label: "76mm", value: "76" },
      { label: "152mm", value: "152" },
    ],
    required: true,
    sortOrder: 1,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const def of LPP_ROLL_DEFAULTS) {
    const existing = await prisma.productionCharacteristicDefinition.findUnique({
      where: { phase_key: { phase: def.phase, key: def.key } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.productionCharacteristicDefinition.create({
      data: {
        phase: def.phase,
        key: def.key,
        label: def.label,
        fieldType: def.fieldType,
        options: def.options ?? undefined,
        required: def.required,
        sortOrder: def.sortOrder,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`Production characteristics seed complete: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
