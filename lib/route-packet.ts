export function buildRouteChecklist(delivery: {
  chainOfCustodyRequired: boolean;
  temperatureRequired?: string | null;
  proofOfDeliveryRequired: boolean;
}) {
  const items = [
    { key: "pickup_identity", label: "Verify pickup location, package/specimen identity, and count", required: true, sortOrder: 10 },
    { key: "package_condition", label: "Inspect packaging, seals, labels, and condition before departure", required: true, sortOrder: 20 },
  ];

  if (delivery.chainOfCustodyRequired) {
    items.push({
      key: "chain_of_custody_pickup",
      label: "Complete pickup chain-of-custody handoff",
      required: true,
      sortOrder: 30,
    });
  }

  if (delivery.temperatureRequired) {
    items.push({
      key: "temperature_check",
      label: `Verify required transport temperature (${delivery.temperatureRequired})`,
      required: true,
      sortOrder: 40,
    });
  }

  items.push({
    key: "arrival_verification",
    label: "Verify delivery location and authorized receiving party",
    required: true,
    sortOrder: 50,
  });

  if (delivery.chainOfCustodyRequired) {
    items.push({
      key: "chain_of_custody_delivery",
      label: "Complete delivery chain-of-custody handoff",
      required: true,
      sortOrder: 60,
    });
  }

  if (delivery.proofOfDeliveryRequired) {
    items.push({
      key: "proof_of_delivery",
      label: "Obtain proof of delivery / recipient sign-off",
      required: true,
      sortOrder: 70,
    });
  }

  items.push({
    key: "final_packet_review",
    label: "Review route packet and confirm all required paperwork is complete",
    required: true,
    sortOrder: 80,
  });

  return items;
}

export function courierSignoffRole(classification: string | null | undefined) {
  return classification === "INDEPENDENT_CONTRACTOR" ? "CONTRACTOR" : "COURIER";
}
