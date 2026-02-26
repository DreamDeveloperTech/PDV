/**
 * Customer service - business logic for customer management.
 */
import { customerRepository } from "@/repositories/customer.repository";
import { NotFoundError } from "@/lib/errors";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/schemas/customer.schema";

export const customerService = {
  async getCustomers(storeId: string, options?: { search?: string; page?: number; pageSize?: number }) {
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

  async updateCustomer(id: string, input: UpdateCustomerInput) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }
    return customerRepository.update(id, input);
  },

  async getDefaulters(storeId: string) {
    return customerRepository.findDefaulters(storeId);
  },
};
