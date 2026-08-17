export type QuotePayload = {
  firstName: string;
  lastName: string;
  organization: string;
  email: string;
  phone: string;
  organizationType: string;
  serviceNeeded: string;
  pickupCity: string;
  deliveryCity: string;
  frequency: string;
  startDate: string;
  details: string;
};

export async function submitQuoteRequest(payload: QuotePayload) {
  // Connect this to email, a CRM, or app/api/quote when going live.
  void payload;
  return { ok: true as const };
}
