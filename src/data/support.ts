import type { SupportContact } from "./types";

/**
 * Crisis and professional support directory.
 * Entries render publicly ONLY when `verified` is true.
 * Never add unverified phone numbers or invented emergency services.
 */
export const supportContacts: SupportContact[] = [
  {
    organization: "",
    service: "",
    phone: "",
    availability: "",
    verified: false,
    lastVerified: "",
  },
];

export const verifiedSupportContacts = supportContacts.filter(
  (c) => c.verified && c.organization && c.phone,
);

export const supportDisclaimer =
  "Umanga Nepal is a community awareness and psychosocial support organization. We are not an emergency service, a crisis hotline, or a clinical or medical provider, and this website does not provide diagnosis or treatment.";
