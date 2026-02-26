/**
 * Repository for ProductIngredient (recipe/dose ingredients).
 */
import { prisma } from "@/lib/prisma";

export const productIngredientRepository = {
  async findByProductId(productId: string) {
    return prisma.productIngredient.findMany({
      where: { productId },
      include: {
        ingredient: { select: { id: true, name: true, stock: true, unit: true } },
      },
      orderBy: { ingredient: { name: "asc" } },
    });
  },

  async setIngredients(
    productId: string,
    items: { ingredientProductId: string; quantityPerUnit: number }[]
  ) {
    await prisma.$transaction([
      prisma.productIngredient.deleteMany({ where: { productId } }),
      ...items.map((item) =>
        prisma.productIngredient.create({
          data: {
            productId,
            ingredientProductId: item.ingredientProductId,
            quantityPerUnit: item.quantityPerUnit,
          },
        })
      ),
    ]);
  },

  async deleteByProductId(productId: string) {
    return prisma.productIngredient.deleteMany({ where: { productId } });
  },
};
