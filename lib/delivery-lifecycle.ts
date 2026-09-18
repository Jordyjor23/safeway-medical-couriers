import type { DeliveryStatus } from "@prisma/client";

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  DRAFT: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "EN_ROUTE_PICKUP", "EXCEPTION", "CANCELLED"],
  ACCEPTED: ["EN_ROUTE_PICKUP", "EXCEPTION", "CANCELLED"],
  EN_ROUTE_PICKUP: ["ARRIVED_PICKUP", "EXCEPTION", "CANCELLED"],
  ARRIVED_PICKUP: ["PICKED_UP", "EXCEPTION", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["ARRIVED_DELIVERY", "EXCEPTION"],
  ARRIVED_DELIVERY: ["DELIVERED", "EXCEPTION"],
  DELIVERED: [],
  EXCEPTION: [
    "ASSIGNED",
    "ACCEPTED",
    "EN_ROUTE_PICKUP",
    "ARRIVED_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVED_DELIVERY",
    "CANCELLED",
  ],
  CANCELLED: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus) {
  return from === to || DELIVERY_TRANSITIONS[from].includes(to);
}

export function driverProgressActions(status: DeliveryStatus) {
  const labels: Partial<Record<DeliveryStatus, string>> = {
    ACCEPTED: "Accept",
    EN_ROUTE_PICKUP: "Start route",
    ARRIVED_PICKUP: "Arrived pickup",
    PICKED_UP: "Confirm pickup",
    IN_TRANSIT: "In transit",
    ARRIVED_DELIVERY: "Arrived delivery",
    EXCEPTION: "Report issue",
  };

  return DELIVERY_TRANSITIONS[status]
    .filter((next) => labels[next])
    .map((next) => [next, labels[next]!] as const);
}
