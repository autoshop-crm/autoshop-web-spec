import { http } from './http';
import { FileItem, OwnerFilesResponse } from '../types/models';

const filesBaseUrl = import.meta.env.VITE_FILES_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8084/api/files' : '/api/files');

export const filesApi = {
  listByOwner: async (ownerType: string, ownerId: string, category?: string) => {
    const { data } = await http.get<OwnerFilesResponse>(filesBaseUrl, {
      params: { ownerType, ownerId, category, includeDeleted: false, page: 0, size: 50 }
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
    formData.append('file', payload.file, payload.file.name);

    const { data } = await http.post<FileItem>(filesBaseUrl, formData);
    return data;
  },
  delete: async (fileId: string) => {
    await http.delete(`${filesBaseUrl}/${fileId}`);
  },
  getDownloadUrl: (fileId: string) => `${filesBaseUrl}/${fileId}/download`
};
