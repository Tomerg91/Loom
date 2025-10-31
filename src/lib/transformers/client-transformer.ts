export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

export const transformClientData = (
  apiResponse: Record<string, unknown>
): Client => {
  return {
    id: (apiResponse.id as string) || '',
    firstName: (apiResponse.firstName ?? apiResponse.first_name ?? '') as string,
    lastName: (apiResponse.lastName ?? apiResponse.last_name ?? '') as string,
    email: (apiResponse.email ?? apiResponse.email_address ?? '') as string,
    phone: (apiResponse.phone ?? apiResponse.phone_number ?? '') as string,
    ...apiResponse, // Include any additional fields
  };
};

export const transformClientList = (
  apiResponses: Record<string, unknown>[]
): Client[] => {
  return apiResponses.map(transformClientData);
};
