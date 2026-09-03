import { api } from "./client";
import type { ClothingItemOut } from "./wardrobe";

export interface OutfitOut {
  id: number;
  name: string;
  items: ClothingItemOut[];
  created_at: string;
}

export function listOutfits(): Promise<OutfitOut[]> {
  return api.get<OutfitOut[]>("/api/outfits");
}

export function createOutfit(
  name: string,
  item_ids: number[]
): Promise<OutfitOut> {
  return api.post<OutfitOut>("/api/outfits", { name, item_ids });
}

export function getOutfit(id: number): Promise<OutfitOut> {
  return api.get<OutfitOut>(`/api/outfits/${id}`);
}

export function updateOutfit(
  id: number,
  name: string,
  item_ids: number[]
): Promise<OutfitOut> {
  return api.patch<OutfitOut>(`/api/outfits/${id}`, { name, item_ids });
}

export function deleteOutfit(id: number): Promise<void> {
  return api.del<void>(`/api/outfits/${id}`);
}
