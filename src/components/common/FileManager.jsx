import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  File,
  ChevronRight,
  Plus,
  ArrowLeft,
  Trash2,
  Paperclip,
} from "lucide-react";
import {
  fetchNotes,
  createNoteOrFolder,
  deleteNoteOrFolder,
} from "../api/notes";

export default function FileManager() {
  const [items, setItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = Root
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createType, setCreateType] = useState("note"); // 'note' | 'folder' | 'file'

  // Load items based on current folder scope
  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchNotes({
        folderId: currentFolder?._id || "root",
      });
      setItems(res.data.items);
    } catch (err) {
      console.error("Failed to load items", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [currentFolder]);

  // Navigate into a subfolder
  const handleOpenFolder = (folder) => {
    setBreadcrumbs([...breadcrumbs, currentFolder].filter(Boolean));
    setCurrentFolder(folder);
  };

  // Go back up to root or specific breadcrumb level
  const handleNavigateTo = (folder, index) => {
    if (folder === null) {
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      setCurrentFolder(folder);
      setBreadcrumbs(breadcrumbs.slice(0, index));
    }
  };

  // Create new Note, Folder, or File entry
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createNoteOrFolder({
        title: newTitle,
        type: createType,
        folderId: currentFolder?._id || null,
        icon:
          createType === "folder" ? "📁" : createType === "file" ? "📄" : "📝",
        fileType: createType === "file" ? "document" : "",
      });
      setNewTitle("");
      loadItems();
    } catch (err) {
      console.error("Failed to create item", err);
    }
  };

  // Delete item (folder or file)
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteNoteOrFolder(id);
      loadItems();
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Breadcrumb Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => handleNavigateTo(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Home
        </button>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={b._id}>
            <ChevronRight size={16} />
            <button
              onClick={() => handleNavigateTo(b, idx)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {b.title}
            </button>
          </React.Fragment>
        ))}
        {currentFolder && (
          <>
            <ChevronRight size={16} />
            <span style={{ fontWeight: "bold" }}>{currentFolder.title}</span>
          </>
        )}
      </div>

      {/* Item Creation Controls */}
      <form
        onSubmit={handleCreate}
        style={{ display: "flex", gap: "8px", marginBottom: "24px" }}
      >
        <select
          value={createType}
          onChange={(e) => setCreateType(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px" }}
        >
          <option value="note">Note</option>
          <option value="folder">Folder</option>
          <option value="file">File</option>
        </select>
        <input
          type="text"
          placeholder={`New ${createType} title...`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <Plus size={16} inline /> Add
        </button>
      </form>

      {/* Grid Display */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          {items.length === 0 && <p>This folder is empty.</p>}
          {items.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              onOpenFolder={handleOpenFolder}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Subcomponent: Individual Card Rendering
function ItemCard({ item, onOpenFolder, onDelete }) {
  const isFolder = item.type === "folder";
  const isFile = item.type === "file";

  const renderIcon = () => {
    if (isFolder) return <Folder size={32} color="#f59e0b" />;
    if (isFile) return <Paperclip size={32} color="#6b7280" />;
    return <FileText size={32} color="#3b82f6" />;
  };

  return (
    <div
      onClick={() => isFolder && onOpenFolder(item)}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: isFolder ? "pointer" : "default",
        background: isFolder ? "#fef3c7" : "#ffffff",
        position: "relative",
      }}
    >
      <div style={{ alignSelf: "flex-end" }}>
        <button
          onClick={(e) => onDelete(e, item._id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ margin: "12px 0" }}>{renderIcon()}</div>

      <div style={{ textAlign: "center", width: "100%" }}>
        <strong
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </strong>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>
          {isFolder ? "Folder" : isFile ? item.fileType || "File" : "Note"}
        </span>
      </div>
    </div>
  );
}
