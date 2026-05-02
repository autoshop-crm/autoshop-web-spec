import { http } from './http';
import { FileItem, OwnerFilesResponse } from '../types/models';

export const filesApi = {
  listByOwner: async (ownerType: string, ownerId: string, category?: string) => {
    const { data } = await http.get<OwnerFilesResponse>('/api/files', {
      params: { ownerType, ownerId, category }
    });
    return data;
  },
  upload: async (payload: {
    category: string;
    ownerType: string;
    ownerId: string;
    uploadedBy?: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('ownerType', payload.ownerType);
    formData.append('ownerId', payload.ownerId);
    if (payload.uploadedBy) {
      formData.append('uploadedBy', payload.uploadedBy);
    }
    formData.append('file', payload.file);

    const { data } = await http.post<FileItem>('/api/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  delete: async (fileId: string) => {
    await http.delete(`/api/files/${fileId}`);
  }
};
