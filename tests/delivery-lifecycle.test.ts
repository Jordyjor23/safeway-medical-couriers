import { describe, expect, it } from "vitest";
import { canTransitionDelivery, driverProgressActions } from "@/lib/delivery-lifecycle";

describe("delivery lifecycle", () => {
  it("allows the normal courier progression", () => {
    expect(canTransitionDelivery("ASSIGNED", "ACCEPTED")).toBe(true);
    expect(canTransitionDelivery("ACCEPTED", "EN_ROUTE_PICKUP")).toBe(true);
    expect(canTransitionDelivery("EN_ROUTE_PICKUP", "ARRIVED_PICKUP")).toBe(true);
    expect(canTransitionDelivery("ARRIVED_PICKUP", "PICKED_UP")).toBe(true);
    expect(canTransitionDelivery("PICKED_UP", "IN_TRANSIT")).toBe(true);
    expect(canTransitionDelivery("IN_TRANSIT", "ARRIVED_DELIVERY")).toBe(true);
    expect(canTransitionDelivery("ARRIVED_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("blocks impossible status jumps and terminal changes", () => {
    expect(canTransitionDelivery("ASSIGNED", "DELIVERED")).toBe(false);
    expect(canTransitionDelivery("PICKED_UP", "ARRIVED_DELIVERY")).toBe(false);
    expect(canTransitionDelivery("DELIVERED", "IN_TRANSIT")).toBe(false);
    expect(canTransitionDelivery("CANCELLED", "ASSIGNED")).toBe(false);
  });

  it("offers only valid courier progress controls", () => {
    expect(driverProgressActions("ASSIGNED")).toEqual([
      ["ACCEPTED", "Accept"],
      ["EN_ROUTE_PICKUP", "Start route"],
      ["EXCEPTION", "Report issue"],
    ]);
    expect(driverProgressActions("IN_TRANSIT")).toEqual([
      ["ARRIVED_DELIVERY", "Arrived delivery"],
      ["EXCEPTION", "Report issue"],
    ]);
    expect(driverProgressActions("DELIVERED")).toEqual([]);
  });
});
