export const EVERGREEN_MEDICAL_COURIER_PUBLIC_ID = "evergreen-medical-courier";
export const EVERGREEN_INDEPENDENT_COURIER_PUBLIC_ID = "evergreen-independent-courier-partner";

export const EVERGREEN_JOB_PUBLIC_IDS = [
  EVERGREEN_MEDICAL_COURIER_PUBLIC_ID,
  EVERGREEN_INDEPENDENT_COURIER_PUBLIC_ID,
] as const;

export function isEvergreenJobPublicId(value: string) {
  return (EVERGREEN_JOB_PUBLIC_IDS as readonly string[]).includes(value);
}
