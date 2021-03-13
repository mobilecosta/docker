export default interface RequestInterface {
  name: string;
  trade?: string;
  email: string;
  isLegalEntity: boolean;
  registryCode: string;
  registryStateCode?: string;
  cnae?: string;
  notes?: string;
  contactPerson?: string;
  website?: string;
  address: {
    street: string;
    number: string;
    additionalDetails?: string;
    zipcode: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  phones: Array<{
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
  }>;
  isOver16: boolean;
  over16Metadata: {
    ip: string;
    details: string;
  };
  idProtheus?: string;
}
