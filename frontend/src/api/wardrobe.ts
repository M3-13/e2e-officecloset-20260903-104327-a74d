import { api, API_BASE } from "./client";

export interface ClothingItemOut {
  id: number;
  name: string;
  image_url: string;
  category_id: number | null;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface WardrobeQuery {
  category_id?: number;
  q?: string;
}

export interface CreateWardrobeItem {
  name: string;
  image: File;
  category_id?: number;
  description?: string;
  color?: string;
}

export interface UpdateWardrobeItem {
  name?: string;
  image?: File;
  category_id?: number | null;
  description?: string | null;
  color?: string | null;
}

export function listWardrobe(
  query?: WardrobeQuery
): Promise<ClothingItemOut[]> {
  const params = new URLSearchParams();
  if (query?.category_id != null) {
    params.set("category_id", String(query.category_id));
  }
  if (query?.q) {
    params.set("q", query.q);
  }
  const qs = params.toString();
  return api.get<ClothingItemOut[]>(`/api/wardrobe${qs ? `?${qs}` : ""}`);
}

export function createWardrobeItem(
  data: CreateWardrobeItem
): Promise<ClothingItemOut> {
  const form = new FormData();
  form.append("name", data.name);
  form.append("image", data.image);
  if (data.category_id != null) {
    form.append("category_id", String(data.category_id));
  }
  if (data.description != null) {
    form.append("description", data.description);
  }
  if (data.color != null) {
    form.append("color", data.color);
  }
  return api.post<ClothingItemOut>("/api/wardrobe", form);
}

export function getWardrobeItem(id: number): Promise<ClothingItemOut> {
  return api.get<ClothingItemOut>(`/api/wardrobe/${id}`);
}

export function updateWardrobeItem(
  id: number,
  data: UpdateWardrobeItem
): Promise<ClothingItemOut> {
  const form = new FormData();
  if (data.name != null) {
    form.append("name", data.name);
  }
  if (data.image != null) {
    form.append("image", data.image);
  }
  if (data.category_id !== undefined) {
    form.append(
      "category_id",
      data.category_id == null ? "" : String(data.category_id)
    );
  }
  if (data.description !== undefined) {
    form.append("description", data.description ?? "");
  }
  if (data.color !== undefined) {
    form.append("color", data.color ?? "");
  }
  return api.patch<ClothingItemOut>(`/api/wardrobe/${id}`, form);
}

export function deleteWardrobeItem(id: number): Promise<void> {
  return api.del<void>(`/api/wardrobe/${id}`);
}

export function wardrobeImageUrl(id: number): string {
  return `${API_BASE}/api/wardrobe/${id}/image`;
}
