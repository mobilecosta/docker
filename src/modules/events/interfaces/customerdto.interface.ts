export default interface CustomerDTO {
  id: string;
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
    authorizesSMS: boolean;
    authorizesWhatsApp: boolean;
    default: boolean;
    validated: boolean;
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
  emailConfirmedAt?: Date;
  vindiSentAt?: Date;
  protheusSentAt?: Date;
  codeT?: string;
  createdAt?: Date;
  updatedAt?: Date;
  action?: string;
}
