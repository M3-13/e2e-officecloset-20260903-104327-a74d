import { api } from "./client";

export interface CategoryOut {
  id: number;
  name: string;
  item_count: number;
}

export function listCategories(): Promise<CategoryOut[]> {
  return api.get<CategoryOut[]>("/api/categories");
}

export function createCategory(name: string): Promise<CategoryOut> {
  return api.post<CategoryOut>("/api/categories", { name });
}

export function renameCategory(id: number, name: string): Promise<CategoryOut> {
  return api.patch<CategoryOut>(`/api/categories/${id}`, { name });
}

export function deleteCategory(id: number): Promise<void> {
  return api.del<void>(`/api/categories/${id}`);
}
