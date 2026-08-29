import { prisma } from "../lib/db";
import { ensureSystemRoles } from "../lib/ensure-rbac";

await ensureSystemRoles(prisma);
