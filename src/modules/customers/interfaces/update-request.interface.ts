export default interface UpdateRequestInterface {
  trade?: string;
  email?: string;
  cnae?: string;
  notes?: string;
  contactPerson?: string;
  website?: string;
  address?: {
    street?: string;
    number?: string;
    additionalDetails?: string;
    zipcode?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  phones: {
    phoneType: string;
    default: boolean;
    validated: boolean;
    authorizesSMS: boolean;
    authorizesWhatsApp: boolean;
    phone: {
      country: string;
      area: string;
      number: string;
      extension?: string;
    };
  };
}
