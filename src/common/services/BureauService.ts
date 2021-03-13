import * as bureauRepository from '../../repositories/DocumentsBureauRepository';

class BureauAddress {
    constructor(street: string, number: string, zipcode: string, neighborhood: string, city: string,
        state: string, additionalDetails?: string) {
        this.street = street;
        this.number = number;
        this.zipcode = zipcode;
        this.neighborhood = neighborhood;
        this.city = city;
        this.state = state;
        this.additionalDetails = additionalDetails;
    };

    street: string;
    number: string;
    additionalDetails?: string;
    zipcode: string;
    neighborhood: string;
    city: string;
    state: string;
}

interface BureauServiceInterface {
    getLastValidAddressByDocument(registryCode: string): Promise<BureauAddress | null>
}

class BureauService implements BureauServiceInterface {
    public async getLastValidAddressByDocument(registryCode: string): Promise<BureauAddress | null> {
        try {
            let documentsBureau = await bureauRepository.findByDocument(registryCode);
            if (documentsBureau == null || documentsBureau.length == 0) {
                return null;
            }

            let document: any = documentsBureau.find(x => x.details && x.details.endereco);
            if (!document) {
                return null;
            }

            let address = document.details.endereco;
            if (!address.bairro || !address.cep || !address.logradouro || !address.municipio ||
                !address.numero || !address.uf) {
                return null;
            }

            return new BureauAddress(address.logradouro, address.numero,
                address.cep, address.bairro, address.municipio, address.uf, address.complemento);
        } catch {
            return null;
        }
    }
}

export default new BureauService();