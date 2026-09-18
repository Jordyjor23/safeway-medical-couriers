import { prisma } from "@/lib/db";
import { businessDateKey, parseBusinessDate } from "@/lib/workforce-time";

const ACTIVE_DELIVERY_STATUSES = [
  "DRAFT",
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED_DELIVERY",
  "EXCEPTION",
] as const;

function csv(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function sameBusinessDateBounds(value: Date) {
  const dateKey = businessDateKey(value);
  const parsed = parseBusinessDate(dateKey);
  if (!parsed) throw new Error("Unable to resolve route service date.");
  const start = new Date(parsed);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(parsed);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export async function resolveRouteCourier({
  routeTemplateId,
  pickupAt,
  deliverBy,
  explicitEmployeeId,
}: {
  routeTemplateId: string;
  pickupAt: Date;
  deliverBy: Date;
  explicitEmployeeId?: string | null;
}) {
  const template = await prisma.routeTemplate.findUnique({ where: { id: routeTemplateId } });
  if (!template) throw new Error("Route template not found.");

  const requiredTrainingKeys = csv(template.requiredTrainingKeys).map((value) => value.toUpperCase());
  const requiredCertificationNames = csv(template.requiredCertificationNames).map((value) => value.toUpperCase());
  const { start: dayStart, end: dayEnd } = sameBusinessDateBounds(pickupAt);

  const candidates = await prisma.employee.findMany({
    where: {
      isDriver: true,
      status: "ACTIVE",
      ...(explicitEmployeeId ? { id: explicitEmployeeId } : {}),
    },
    include: {
      trainings: true,
      certifications: true,
      vehicle: true,
      timeOffRequests: {
        where: {
          status: "APPROVED",
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
      },
      callOffs: {
        where: {
          callOffDate: { gte: dayStart, lte: dayEnd },
          status: { in: ["REPORTED", "ACKNOWLEDGED"] },
        },
      },
      deliveries: {
        where: {
          status: { in: [...ACTIVE_DELIVERY_STATUSES] },
          pickupAt: { lt: deliverBy },
          deliverBy: { gt: pickupAt },
        },
        select: { id: true },
      },
    },
    orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
  });

  function reasons(candidate: (typeof candidates)[number]) {
    const failures: string[] = [];
    if (candidate.timeOffRequests.length) failures.push("approved time off");
    if (candidate.callOffs.length) failures.push("call-off recorded");
    if (candidate.deliveries.length) failures.push("overlapping route");

    for (const key of requiredTrainingKeys) {
      const match = candidate.trainings.find(
        (training) =>
          training.requirementKey.toUpperCase() === key &&
          Boolean(training.completedAt) &&
          (!training.expiresAt || training.expiresAt >= pickupAt),
      );
      if (!match) failures.push(`missing/expired training: ${key}`);
    }

    for (const name of requiredCertificationNames) {
      const match = candidate.certifications.find(
        (certification) =>
          certification.name.toUpperCase() === name &&
          (!certification.expiresAt || certification.expiresAt >= pickupAt),
      );
      if (!match) failures.push(`missing/expired certification: ${name}`);
    }

    const vehicleRequirement = template.vehicleRequirement?.trim();
    if (
      vehicleRequirement &&
      vehicleRequirement.toLowerCase() !== "any" &&
      !candidate.vehicle?.vehicleType?.toLowerCase().includes(vehicleRequirement.toLowerCase())
    ) {
      failures.push(`vehicle requirement: ${vehicleRequirement}`);
    }
    return failures;
  }

  if (explicitEmployeeId) {
    const candidate = candidates[0];
    if (!candidate) throw new Error("Selected courier is not an active driver.");
    const failures = reasons(candidate);
    if (failures.length) {
      throw new Error(
        `${candidate.legalFirstName} ${candidate.legalLastName} is not eligible for this route: ${failures.join(", ")}.`,
      );
    }
    return { employeeId: candidate.id, source: "MANUAL" as const, reasons: [] };
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const preferredIds = [template.primaryDriverEmployeeId, template.backupDriverEmployeeId].filter(
    (id): id is string => Boolean(id),
  );
  const ordered = [
    ...preferredIds.map((id) => byId.get(id)).filter(Boolean),
    ...candidates.filter((candidate) => !preferredIds.includes(candidate.id)),
  ] as typeof candidates;

  for (const candidate of ordered) {
    const failures = reasons(candidate);
    if (!failures.length) {
      const source =
        candidate.id === template.primaryDriverEmployeeId
          ? "PRIMARY"
          : candidate.id === template.backupDriverEmployeeId
            ? "BACKUP"
            : "ELIGIBLE_POOL";
      return { employeeId: candidate.id, source: source as "PRIMARY" | "BACKUP" | "ELIGIBLE_POOL", reasons: [] };
    }
  }

  return {
    employeeId: null,
    source: "UNASSIGNED" as const,
    reasons: ["No active courier met the route requirements and availability checks."],
  };
}
