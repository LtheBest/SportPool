// Service d'autocomplétion d'adresses françaises via l'API gouvernementale
export interface AddressSuggestion {
  label: string;
  postcode: string;
  citycode: string;
  city: string;
  context: string;
  coordinates: [number, number];
}

export interface AddressApiResponse {
  features: {
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      label: string;
      score: number;
      housenumber?: string;
      id: string;
      name: string;
      postcode: string;
      citycode: string;
      x: number;
      y: number;
      city: string;
      context: string;
      type: string;
      importance: number;
      street?: string;
    };
  }[];
}

class AddressAutocompleteService {
  private baseUrl = 'https://api-adresse.data.gouv.fr/search';

  async searchAddresses(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
    if (query.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        autocomplete: '1'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        console.error('Address API error:', response.status);
        return [];
      }

      const data: AddressApiResponse = await response.json();

      return data.features.map(feature => ({
        label: feature.properties.label,
        postcode: feature.properties.postcode,
        citycode: feature.properties.citycode,
        city: feature.properties.city,
        context: feature.properties.context,
        coordinates: feature.geometry.coordinates
      }));

    } catch (error) {
      console.error('Address autocomplete error:', error);
      return [];
    }
  }

  // Recherche d'adresses avec focus sur les villes
  async searchCities(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        type: 'municipality',
        autocomplete: '1'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        console.error('Cities API error:', response.status);
        return [];
      }

      const data: AddressApiResponse = await response.json();

      return data.features.map(feature => ({
        label: feature.properties.label,
        postcode: feature.properties.postcode,
        citycode: feature.properties.citycode,
        city: feature.properties.city,
        context: feature.properties.context,
        coordinates: feature.geometry.coordinates
      }));

    } catch (error) {
      console.error('Cities autocomplete error:', error);
      return [];
    }
  }

  // Recherche d'adresses par code postal
  async searchByPostalCode(postalCode: string): Promise<AddressSuggestion[]> {
    if (postalCode.length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: postalCode,
        limit: '10',
        type: 'municipality'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        console.error('Postal code API error:', response.status);
        return [];
      }

      const data: AddressApiResponse = await response.json();

      return data.features.map(feature => ({
        label: feature.properties.label,
        postcode: feature.properties.postcode,
        citycode: feature.properties.citycode,
        city: feature.properties.city,
        context: feature.properties.context,
        coordinates: feature.geometry.coordinates
      }));

    } catch (error) {
      console.error('Postal code search error:', error);
      return [];
    }
  }
}

export const addressService = new AddressAutocompleteService();