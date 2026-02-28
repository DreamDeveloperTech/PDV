/**
 * Customer service - business logic for customer management.
 */
import { customerRepository } from "@/repositories/customer.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/schemas/customer.schema";

export const customerService = {
  async getCustomers(storeId: string, options?: { search?: string; page?: number; pageSize?: number; all?: boolean }) {
    return customerRepository.findByStoreId(storeId, options);
  },

  async getCustomerById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }
    return customer;
  },

  async createCustomer(storeId: string, input: CreateCustomerInput) {
    return customerRepository.create(storeId, input);
  },

  async updateCustomer(storeId: string, id: string, input: UpdateCustomerInput) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }
    if (customer.storeId !== storeId) {
      throw new ValidationError("Cliente não pertence a esta loja");
    }
    return customerRepository.update(id, input);
  },

  async getDefaulters(storeId: string) {
    return customerRepository.findDefaulters(storeId);
  },
};
