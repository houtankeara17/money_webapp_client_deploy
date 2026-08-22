import api from "./api";

// Fetch items (filters by folderId, category, pinned state, or search)
export const fetchNotesApi = (params = {}) => {
  return api.get("/notes", { params });
};

// Create Note, Folder, or File entry
export const createNoteApi = (payload) => {
  return api.post("/notes", payload);
};

// Update Note/Folder details
export const updateNoteApi = (id, payload) => {
  return api.put(`/notes/${id}`, payload);
};

// Delete Note or Folder (recursively handled by backend)
export const deleteNoteApi = (id) => {
  return api.delete(id === "all" ? "/notes" : `/notes/${id}`);
};

// Patch Pin Status
export const togglePinApi = (id) => {
  return api.patch(`/notes/${id}/pin`);
};

// Duplicate Note
export const duplicateNoteApi = (id) => {
  return api.post(`/notes/${id}/duplicate`);
};

// Toggle Checklist Item Status
export const toggleChecklistItemApi = (noteId, itemId) => {
  return api.patch(`/notes/${noteId}/items/${itemId}`);
};

// Export Notes
export const exportNotesApi = () => {
  return api.get("/notes/export");
};

// Import Notes from Text File
export const importNotesApi = (text) => {
  return api.post("/notes/import", { text });
};

export const reorderNotesApi = (items) => {
  return api.patch("/notes/reorder", { items });
};
