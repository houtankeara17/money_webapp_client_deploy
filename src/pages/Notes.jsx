import { useRef, useEffect, useState, useCallback, Fragment } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Search,
  StickyNote,
  Link as LinkIcon,
  Image as ImageIcon,
  ListChecks,
  Download,
  Copy,
  ExternalLink,
  X,
  CheckCircle2,
  Circle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Eye,
  Filter,
  Sparkles,
  Folder,
  File,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Move,
  Archive,
} from "lucide-react";
import useI18n from "../hooks/useI18n";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import ConfirmModal from "../components/common/ConfirmModal";
import ViewToggle from "../components/common/ViewToggle";
import { NOTE_CATEGORIES } from "../constants/categories";
import {
  fetchNotesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  togglePinApi,
  duplicateNoteApi,
  toggleChecklistItemApi,
  exportNotesApi,
  importNotesApi,
  reorderNotesApi,
} from "../services/notesApi";

const COLORS = [
  {
    id: "default",
    label: "Default",
    swatch: "bg-slate-200 dark:bg-slate-600",
    card: "bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 shadow-xs",
  },
  {
    id: "green",
    label: "Green",
    swatch: "bg-emerald-400",
    card: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs",
  },
  {
    id: "blue",
    label: "Teal",
    swatch: "bg-teal-400",
    card: "bg-teal-50/80 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-800/60 shadow-xs",
  },
  {
    id: "yellow",
    label: "Yellow",
    swatch: "bg-amber-400",
    card: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 shadow-xs",
  },
  {
    id: "red",
    label: "Red",
    swatch: "bg-rose-400",
    card: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 shadow-xs",
  },
  {
    id: "purple",
    label: "Purple",
    swatch: "bg-violet-400",
    card: "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/80 dark:border-violet-800/60 shadow-xs",
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "bg-orange-400",
    card: "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-800/60 shadow-xs",
  },
];

const ICONS = [
  "📝",
  "📁",
  "📄",
  "📌",
  "💡",
  "⭐",
  "🔥",
  "💼",
  "🏠",
  "💰",
  "🎯",
  "📚",
  "✈️",
  "🛒",
  "❤️",
  "✅",
];

const emptyForm = () => ({
  title: "",
  body: "",
  icon: "📝",
  type: "note",
  fileType: "",
  categoryTag: "General",
  color: "default",
  pinned: false,
  items: [],
  links: [],
  image: "",
  images: [],
});

const Notes = () => {
  useDocumentTitle("Notes");
  const { t, tEnum } = useI18n();

  const [items, setItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const [catFilter, setCatFilter] = useState("");
  const [pinFilter, setPinFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(
    () => localStorage.getItem("view_notes") || "grid",
  );
  const [form, setForm] = useState(emptyForm());
  const [newItemText, setNewItemText] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [newLink, setNewLink] = useState({ url: "", label: "", tag: "" });
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState("content");
  const [lightbox, setLightbox] = useState({ images: [], index: 0 });
  const [scale, setScale] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (lightbox.images.length) setLightbox({ images: [], index: 0 });
        else if (showForm && !saving) setShowForm(false);
        else if (selectedIds.size) setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForm, saving, lightbox, selectedIds]);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_notes", v);
  };

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const params = {
          limit: 100,
          folderId: currentFolder ? currentFolder._id : "root",
        };
        if (catFilter) params.categoryTag = catFilter;
        if (pinFilter) params.pinned = pinFilter;
        if (search.trim()) params.search = search.trim();

        const { data } = await fetchNotesApi(params);
        setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
        setSelectedIds(new Set());
      } catch (err) {
        console.error("Notes fetch error:", err);
        toast.error(err.response?.data?.message || "Failed to load notes");
        setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [catFilter, pinFilter, search, currentFolder],
  );

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) fetchData();
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchData]);

  const handleOpenFolder = (folder) => {
    setBreadcrumbs((prev) => [...prev, currentFolder].filter(Boolean));
    setCurrentFolder(folder);
    setSelectedIds(new Set());
  };

  const handleNavigateBreadcrumb = (targetFolder, index) => {
    if (targetFolder === null) {
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      setCurrentFolder(targetFolder);
      setBreadcrumbs((prev) => prev.slice(0, index));
    }
    setSelectedIds(new Set());
  };

  const openCreate = (defaultType = "note") => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      type: defaultType,
      icon:
        defaultType === "folder" ? "📁" : defaultType === "file" ? "📄" : "📝",
    });
    setNewItemText("");
    setNewLink({ url: "", label: "", tag: "" });
    setFormTab("content");
    setShowForm(true);
  };

  const openEdit = (note) => {
    if (note.type === "folder") {
      handleOpenFolder(note);
      return;
    }
    setEditing(note);
    const imagesList =
      Array.isArray(note.images) && note.images.length > 0
        ? note.images
        : note.image
          ? [note.image]
          : [];

    setForm({
      title: note.title || "",
      body: note.body || "",
      icon: note.icon || "📝",
      type: note.type || "note",
      fileType: note.fileType || "",
      categoryTag: note.categoryTag || "General",
      color: note.color || "default",
      pinned: !!note.pinned,
      items: (note.items || []).map((i) => ({
        _id: i._id,
        text: typeof i === "string" ? i : i.text || "",
        checked: !!i.checked,
        order: i.order ?? 0,
      })),
      links: (note.links || []).map((l) => ({
        _id: l._id,
        url: l.url,
        label: l.label || "",
        tag: l.tag || "",
      })),
      image: note.image || "",
      images: imagesList,
    });
    setNewItemText("");
    setNewLink({ url: "", label: "", tag: "" });
    setFormTab("content");
    setShowForm(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const imagePromises = files
      .filter((file) => file.type.startsWith("image/"))
      .map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.readAsDataURL(file);
          }),
      );

    Promise.all(imagePromises).then((base64Images) => {
      setForm((prev) => ({
        ...prev,
        image: prev.image || base64Images[0] || "",
        images: [...(prev.images || []), ...base64Images],
      }));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t("titleRequired"));
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body || "",
        icon: form.icon,
        type: form.type,
        fileType: form.fileType,
        folderId: currentFolder?._id || null,
        categoryTag: form.categoryTag || "General",
        color: form.color || "default",
        pinned: !!form.pinned,
        image: form.image || form.images?.[0] || "",
        images: form.images || [],
        items: (form.items || []).map((it, idx) => ({
          text: typeof it === "string" ? it : it?.text || "",
          checked: !!it?.checked,
          order: idx,
        })),
        links: (form.links || []).map((l) => ({
          url: l.url,
          label: l.label || "",
          tag: l.tag || "",
        })),
      };

      if (editing) {
        await updateNoteApi(editing._id, payload);
      } else {
        await createNoteApi(payload);
      }
      setShowForm(false);
      fetchData({ silent: true });
    } catch (err) {
      console.error("Save Note Error:", err);
      toast.error(err.response?.data?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    const updatedItems = [...items];
    const draggedIdx = updatedItems.findIndex((i) => i._id === draggedId);
    const targetIdx = updatedItems.findIndex((i) => i._id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedNote] = updatedItems.splice(draggedIdx, 1);
    updatedItems.splice(targetIdx, 0, draggedNote);
    setItems(updatedItems);
    setDraggedId(null);

    const reorderedPayload = updatedItems.map((item, index) => ({
      _id: item._id,
      position: index,
    }));

    try {
      await reorderNotesApi(reorderedPayload);
      toast.success("Order saved successfully!");
    } catch (err) {
      console.error("Failed to reorder notes:", err);
      toast.error(err.response?.data?.message || "Failed to save order");
      fetchData({ silent: true });
    }
  };

  const handleTogglePin = async (id, e) => {
    e?.stopPropagation?.();
    try {
      await togglePinApi(id);
      fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleDuplicate = async (id, e) => {
    e?.stopPropagation?.();
    try {
      await duplicateNoteApi(id);
      toast.success(t("duplicated"));
      fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleToggleCheck = async (noteId, itemId, e) => {
    e?.stopPropagation?.();
    setItems((prev) =>
      prev.map((n) => {
        if (n._id !== noteId) return n;
        return {
          ...n,
          items: (n.items || []).map((it) =>
            it._id === itemId ? { ...it, checked: !it.checked } : it,
          ),
        };
      }),
    );
    try {
      await toggleChecklistItemApi(noteId, itemId);
    } catch {
      toast.error(t("failed"));
      fetchData({ silent: true });
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "selected") {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map((id) => deleteNoteApi(id)));
        toast.success(`${ids.length} item(s) deleted`);
        setSelectedIds(new Set());
      } else {
        await deleteNoteApi(confirmDel);
        toast.success(
          confirmDel === "all" ? t("allNotesDeleted") : t("noteDeleted"),
        );
        if (editing && editing._id === confirmDel) {
          setShowForm(false);
          setEditing(null);
        }
      }
      setConfirmDel(null);
      await fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const importRef = useRef(null);
  const handleDeleteAll = () => {
    setConfirmDel("all");
  };

  const handleExport = async () => {
    try {
      const { data } = await exportNotesApi();
      const exportItems = data?.data || items;
      if (!exportItems || exportItems.length === 0) {
        toast.error("No data to export");
        return;
      }
      const formattedText = exportItems
        .map((note) =>
          `Title: ${note.title}\nCategory: ${note.categoryTag}\nType: ${
            note.type
          }\n\n${note.body || ""}`.trim(),
        )
        .join("\n\n---\n\n");

      const blob = new Blob([formattedText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export successful");
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const fileContent = evt.target.result;
        if (!fileContent?.trim()) return;
        const { data: resData } = await importNotesApi(fileContent);
        toast.success(resData.message || t("success"));
        fetchData({ silent: true });
      } catch (err) {
        toast.error(err.response?.data?.message || "Import failed");
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    setForm({
      ...form,
      items: [
        ...(form.items || []),
        {
          text: newItemText.trim(),
          checked: false,
          order: form.items?.length || 0,
        },
      ],
    });
    setNewItemText("");
  };

  const addLink = () => {
    let url = newLink.url.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setForm({
      ...form,
      links: [
        ...(form.links || []),
        { url, label: newLink.label.trim() || url, tag: newLink.tag.trim() },
      ],
    });
    setNewLink({ url: "", label: "", tag: "" });
  };

  const openLightbox = (images, startIndex, e) => {
    e?.stopPropagation();
    setLightbox({ images, index: startIndex });
    setScale(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const colorClass = (c) =>
    COLORS.find((x) => x.id === c)?.card || COLORS[0].card;

  const toggleSelect = (id, e) => {
    e?.stopPropagation?.();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i._id)));
    }
  };

  const folders = items.filter((n) => n.type === "folder");
  const filesAndNotes = items.filter((n) => n.type !== "folder");
  const pinned = items.filter((n) => n.pinned);
  const unpinned = items.filter((n) => !n.pinned);

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-sm shadow-2xs";

  // ─── Folder Card (grid) – matches screenshot style ────────────────────────
  const FolderCard = ({ note }) => {
    const isSelected = selectedIds.has(note._id);
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, note._id)}
        onDragOver={(e) => handleDragOver(e, note._id)}
        onDrop={(e) => handleDrop(e, note._id)}
        onClick={() => handleOpenFolder(note)}
        className={`group relative rounded-2xl border bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center text-center min-h-[160px] ${
          isSelected ? "ring-2 ring-teal-500 border-teal-500" : ""
        } ${
          draggedId === note._id
            ? "opacity-30 scale-95 border-dashed border-teal-500"
            : ""
        } ${
          dragOverId === note._id
            ? "ring-2 ring-teal-500 border-teal-500 scale-[1.02]"
            : ""
        }`}
      >
        <div className="absolute top-2.5 left-2.5 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelect(note._id, e)}
            onClick={(e) => e.stopPropagation()}
            className="rounded text-teal-600 h-4 w-4 cursor-pointer"
          />
        </div>

        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <button
            type="button"
            onClick={(e) => handleTogglePin(note._id, e)}
            className={`p-1.5 rounded-lg transition ${
              note.pinned
                ? "text-amber-500"
                : "text-slate-400 hover:text-amber-500"
            }`}
          >
            {note.pinned ? (
              <Pin size={13} className="fill-amber-500" />
            ) : (
              <PinOff size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDel(note._id);
            }}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-2">
          <div className="w-16 h-14 mb-3 relative">
            {/* Yellow folder icon like the screenshot */}
            <div className="absolute inset-0 rounded-lg bg-amber-400/90 shadow-md" />
            <div className="absolute top-0 left-1 right-1 h-3 rounded-t-md bg-amber-500" />
            <div className="absolute bottom-0 left-0 right-0 h-10 rounded-b-lg bg-gradient-to-b from-amber-300 to-amber-400" />
            <Folder
              size={28}
              className="absolute inset-0 m-auto text-amber-700/40"
              strokeWidth={1.5}
            />
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate w-full px-1">
            {note.title}
          </h3>
          {note.pinned && (
            <Pin size={11} className="text-amber-500 fill-amber-500 mt-1" />
          )}
        </div>
      </div>
    );
  };

  // ─── Create new folder card ───────────────────────────────────────────────
  const CreateFolderCard = () => (
    <button
      type="button"
      onClick={() => openCreate("folder")}
      className="group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] text-slate-400 hover:text-teal-600"
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 transition">
        <Plus size={22} />
      </div>
      <span className="text-sm font-semibold">Create new folder</span>
    </button>
  );

  // ─── Note / File Card (grid) ──────────────────────────────────────────────
  const NoteCard = ({ note }) => {
    const isFile = note.type === "file";
    const total = note.items?.length || 0;
    const formattedDate = formatDate(note.updatedAt || note.createdAt);
    const isSelected = selectedIds.has(note._id);

    const imagesList =
      Array.isArray(note.images) && note.images.length > 0
        ? note.images
        : note.image
          ? [note.image]
          : [];

    const [imgIndex, setImgIndex] = useState(0);

    const prevImage = (e) => {
      e.stopPropagation();
      setImgIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
    };

    const nextImage = (e) => {
      e.stopPropagation();
      setImgIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
    };

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, note._id)}
        onDragOver={(e) => handleDragOver(e, note._id)}
        onDrop={(e) => handleDrop(e, note._id)}
        onClick={() => openEdit(note)}
        className={`group relative rounded-2xl border p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-full min-h-[220px] backdrop-blur-md ${colorClass(
          note.color,
        )} ${isSelected ? "ring-2 ring-teal-500 border-teal-500" : ""} ${
          draggedId === note._id
            ? "opacity-30 scale-95 border-dashed border-teal-500"
            : ""
        } ${
          dragOverId === note._id
            ? "ring-2 ring-teal-500 border-teal-500 scale-[1.02]"
            : ""
        }`}
      >
        <div className="absolute top-2.5 left-2.5 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelect(note._id, e)}
            onClick={(e) => e.stopPropagation()}
            className="rounded text-teal-600 h-4 w-4 cursor-pointer"
          />
        </div>

        <div>
          {imagesList.length > 0 && (
            <div className="relative overflow-hidden rounded-xl mb-3 h-32 w-full bg-slate-900/10 dark:bg-slate-900 group/img border border-slate-200/50 dark:border-slate-700/50 mt-5">
              <img
                src={imagesList[imgIndex]}
                alt=""
                className="w-full h-full object-cover transition-all duration-500"
              />
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/img:opacity-100 transition-all hover:bg-slate-900"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/img:opacity-100 transition-all hover:bg-slate-900"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                    {imagesList.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === imgIndex
                            ? "w-4 bg-teal-400"
                            : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={(e) => openLightbox(imagesList, imgIndex, e)}
                className="absolute top-2 right-2 p-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md text-white opacity-0 group-hover/img:opacity-100 transition-all hover:scale-105"
              >
                <Eye size={14} />
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-2 mt-1">
            <div className="flex items-center gap-2.5 min-w-0 pl-5">
              <span className="text-lg p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl shrink-0 shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
                {isFile ? (
                  <Paperclip size={16} className="text-slate-500" />
                ) : (
                  note.icon || "📝"
                )}
              </span>
              <h3 className="font-bold truncate text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                {note.title}
              </h3>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <button
                type="button"
                onClick={(e) => handleDuplicate(note._id, e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => handleTogglePin(note._id, e)}
                className={`p-1.5 rounded-lg transition ${
                  note.pinned
                    ? "text-amber-500"
                    : "text-slate-400 hover:text-amber-500"
                }`}
              >
                {note.pinned ? (
                  <Pin size={13} className="fill-amber-500" />
                ) : (
                  <PinOff size={13} />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel(note._id);
                }}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {note.body ? (
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 whitespace-pre-wrap leading-relaxed px-1">
              {note.body}
            </p>
          ) : null}

          {total > 0 && (
            <ul className="space-y-1 mb-2 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xs p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
              {note.items.slice(0, 2).map((item) => (
                <li
                  key={item._id || item.text}
                  className="text-xs flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={(e) =>
                      item._id && handleToggleCheck(note._id, item._id, e)
                    }
                    className={`shrink-0 ${
                      item.checked ? "text-teal-600" : "text-slate-400"
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Circle size={13} />
                    )}
                  </button>
                  <span
                    className={`truncate ${
                      item.checked
                        ? "line-through text-slate-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {note.links && note.links.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.links.slice(0, 2).map((link, idx) => (
                <a
                  key={link._id || idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[11px] font-medium border border-teal-500/20 transition"
                >
                  <ExternalLink size={10} />
                  <span className="truncate max-w-[80px]">
                    {link.label || link.url}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-auto flex items-center justify-between">
          <span className="font-medium bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300 text-[11px]">
            {isFile ? "📄 File" : note.categoryTag || "Note"}
          </span>
          {formattedDate && (
            <span className="text-[11px] text-slate-400">{formattedDate}</span>
          )}
        </div>
      </div>
    );
  };

  // ─── List / Table row ─────────────────────────────────────────────────────
  const ListRow = ({ note }) => {
    const isFolder = note.type === "folder";
    const isFile = note.type === "file";
    const formattedDate = formatDate(note.updatedAt || note.createdAt);
    const isSelected = selectedIds.has(note._id);

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, note._id)}
        onDragOver={(e) => handleDragOver(e, note._id)}
        onDrop={(e) => handleDrop(e, note._id)}
        onClick={() => (isFolder ? handleOpenFolder(note) : openEdit(note))}
        className={`group rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition ${
          isSelected
            ? "bg-teal-50/50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-700"
            : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80"
        } ${
          draggedId === note._id
            ? "opacity-30 border-dashed border-teal-500"
            : ""
        } ${
          dragOverId === note._id
            ? "ring-2 ring-teal-500 border-teal-500"
            : ""
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => toggleSelect(note._id, e)}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-teal-600 h-4 w-4 shrink-0 cursor-pointer"
        />

        <div className="text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition">
          <GripVertical size={14} />
        </div>

        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/60">
          {isFolder ? (
            <Folder size={18} className="text-amber-500" />
          ) : isFile ? (
            <Paperclip size={16} className="text-slate-500" />
          ) : (
            <span className="text-base">{note.icon || "📝"}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
            {note.title}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span>
              {isFolder ? "Folder" : isFile ? "File" : note.categoryTag}
            </span>
            {formattedDate && <span>• {formattedDate}</span>}
          </div>
        </div>

        {note.pinned && (
          <Pin size={13} className="text-amber-500 fill-amber-500 shrink-0" />
        )}

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          {!isFolder && (
            <button
              type="button"
              onClick={(e) => handleDuplicate(note._id, e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Copy size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => handleTogglePin(note._id, e)}
            className={`p-1.5 rounded-lg ${
              note.pinned
                ? "text-amber-500"
                : "text-slate-400 hover:text-amber-500"
            }`}
          >
            {note.pinned ? (
              <Pin size={13} className="fill-amber-500" />
            ) : (
              <PinOff size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDel(note._id);
            }}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  // ─── Table view (like screenshot) ─────────────────────────────────────────
  const TableView = ({ list }) => (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-800/80">
      <div className="grid grid-cols-[40px_1fr_140px_100px_140px_80px] gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={
              list.length > 0 && selectedIds.size === list.length
            }
            onChange={toggleSelectAll}
            className="rounded text-teal-600 h-4 w-4 cursor-pointer"
          />
        </div>
        <div>File name</div>
        <div>Date added</div>
        <div>Size</div>
        <div>Last update</div>
        <div className="text-right">Actions</div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {list.map((note) => {
          const isFolder = note.type === "folder";
          const isFile = note.type === "file";
          const isSelected = selectedIds.has(note._id);
          const created = formatDate(note.createdAt);
          const updated = formatDate(note.updatedAt || note.createdAt);

          return (
            <div
              key={note._id}
              draggable
              onDragStart={(e) => handleDragStart(e, note._id)}
              onDragOver={(e) => handleDragOver(e, note._id)}
              onDrop={(e) => handleDrop(e, note._id)}
              onClick={() =>
                isFolder ? handleOpenFolder(note) : openEdit(note)
              }
              className={`grid grid-cols-[40px_1fr_140px_100px_140px_80px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                isSelected
                  ? "bg-teal-50/40 dark:bg-teal-950/15"
                  : ""
              }`}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelect(note._id, e)}
                  className="rounded text-teal-600 h-4 w-4 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700/50">
                  {isFolder ? (
                    <Folder size={16} className="text-amber-500" />
                  ) : isFile ? (
                    <File size={15} className="text-slate-500" />
                  ) : (
                    <span className="text-sm">{note.icon || "📝"}</span>
                  )}
                </div>
                <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                  {note.title}
                </span>
                {note.pinned && (
                  <Pin
                    size={12}
                    className="text-amber-500 fill-amber-500 shrink-0"
                  />
                )}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {created || "—"}
              </div>
              <div className="text-xs text-slate-500">
                {isFolder ? "—" : formatSize(note.fileSize)}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {updated || "—"}
              </div>
              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                {!isFolder && (
                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(note._id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600"
                  >
                    <Copy size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDel(note._id);
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = (list) => {
    if (view === "list") {
      return (
        <div className="space-y-2 w-full">
          {list.map((note) => (
            <ListRow key={note._id} note={note} />
          ))}
        </div>
      );
    }
    if (view === "table") {
      return <TableView list={list} />;
    }
    // Grid: folders first as folder cards, then notes/files
    const folderItems = list.filter((n) => n.type === "folder");
    const otherItems = list.filter((n) => n.type !== "folder");
    return (
      <div className="space-y-6 w-full">
        {(folderItems.length > 0 || !currentFolder) && (
          <div>
            {folderItems.length > 0 && (
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Folders
              </h3>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {folderItems.map((n) => (
                <FolderCard key={n._id} note={n} />
              ))}
              <CreateFolderCard />
            </div>
          </div>
        )}
        {otherItems.length > 0 && (
          <div>
            {folderItems.length > 0 && (
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Files & Notes
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {otherItems.map((n) => (
                <NoteCard key={n._id} note={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeFilterCount = [catFilter, pinFilter, search.trim()].filter(
    Boolean,
  ).length;

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-500/10 dark:bg-teal-400/10 rounded-2xl border border-teal-500/20">
              <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {currentFolder ? currentFolder.title : t("notes") || "Notes"}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1.5 font-medium pl-1">
            {items.length} {t("entries") || "entries"}
            {folders.length > 0 && ` · ${folders.length} folders`}
            {pinned.length > 0 && ` · ${pinned.length} ${t("pinned") || "pinned"}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ViewToggle
            view={view}
            onChange={setViewMode}
            options={["grid", "list", "table"]}
          />

          <input
            type="file"
            ref={importRef}
            onChange={handleImport}
            accept=".txt,text/plain"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Upload size={14} /> {t("import") || "Import"}
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Download size={14} /> {t("export") || "Export"}
          </button>

          <button
            type="button"
            onClick={() => openCreate("folder")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition"
          >
            <FolderPlus size={15} /> {t("newFolder") || "New Folder"}
          </button>

          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">{t("deleteAll") || "Delete All"}</span>
          </button>

          <button
            type="button"
            onClick={() => openCreate("note")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/25 active:scale-95 transition"
          >
            <Plus size={16} /> {t("addNote") || "Add Note"}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-5 px-3.5 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => handleNavigateBreadcrumb(null)}
          className={`hover:text-teal-600 transition shrink-0 ${
            !currentFolder ? "text-teal-600 font-bold" : "text-slate-500"
          }`}
        >
          Root
        </button>
        {breadcrumbs.map((b, idx) => (
          <Fragment key={b._id}>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <button
              onClick={() => handleNavigateBreadcrumb(b, idx)}
              className="text-slate-500 hover:text-teal-600 transition truncate max-w-[120px]"
            >
              {b.title}
            </button>
          </Fragment>
        ))}
        {currentFolder && (
          <>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <span className="text-teal-600 font-bold truncate max-w-[160px]">
              {currentFolder.title}
            </span>
          </>
        )}
      </nav>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search") || "Search..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500/30 text-sm shadow-2xs transition"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition ${
            showFilters || activeFilterCount > 0
              ? "bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
              : "bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300"
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className={`${inputCls} w-auto min-w-[140px]`}
          >
            <option value="">All categories</option>
            {NOTE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {tEnum(c.id)}
              </option>
            ))}
          </select>
          <select
            value={pinFilter}
            onChange={(e) => setPinFilter(e.target.value)}
            className={`${inputCls} w-auto min-w-[120px]`}
          >
            <option value="">All</option>
            <option value="true">Pinned</option>
            <option value="false">Unpinned</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setCatFilter("");
                setPinFilter("");
                setSearch("");
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Multi-select action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800 text-white shadow-2xl border border-slate-700 backdrop-blur-md">
          <span className="text-sm font-semibold">
            {selectedIds.size} Files Selected
          </span>
          <div className="w-px h-5 bg-slate-600" />
          <button
            type="button"
            onClick={() => {
              Array.from(selectedIds).forEach((id) => handleDuplicate(id));
              setSelectedIds(new Set());
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel("selected")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg hover:bg-white/10 transition ml-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing
                  ? t("edit") || "Edit"
                  : form.type === "folder"
                    ? t("newFolder") || "New Folder"
                    : t("addNote") || "Add Note"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form
              id="note-modal-form"
              onSubmit={handleSubmit}
              className="px-6 py-5 space-y-5"
            >
              {/* Tabs – hide media/checklist for pure folders if desired, but keep for flexibility */}
              {form.type !== "folder" && (
                <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80">
                  {["content", "checklist", "media"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFormTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                        formTab === tab
                          ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              {(formTab === "content" || form.type === "folder") && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {t("entryType") || "Type"}
                      </label>
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            type: e.target.value,
                            icon:
                              e.target.value === "folder"
                                ? "📁"
                                : e.target.value === "file"
                                  ? "📄"
                                  : form.icon || "📝",
                          })
                        }
                        className={inputCls}
                        disabled={!!editing}
                      >
                        <option value="note">📝 {t("note") || "Note"}</option>
                        <option value="folder">
                          📁 {t("folder") || "Folder"}
                        </option>
                        <option value="file">
                          📄 {t("fileUpload") || "File"}
                        </option>
                      </select>
                    </div>
                    {form.type !== "folder" && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                          {t("chooseIcon") || "Icon"}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {ICONS.map((ic) => (
                            <button
                              key={ic}
                              type="button"
                              onClick={() => setForm({ ...form, icon: ic })}
                              className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition ${
                                form.icon === ic
                                  ? "bg-teal-50 border-2 border-teal-500 scale-105"
                                  : "bg-slate-50 border"
                              }`}
                            >
                              {ic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      {t("title") || "Title"}
                    </label>
                    <input
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className={`${inputCls} font-semibold`}
                      placeholder={
                        form.type === "folder"
                          ? "Folder name..."
                          : t("noteText") || "Title..."
                      }
                    />
                  </div>

                  {/* Folders: optional description only */}
                  {form.type === "folder" ? (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        Description (optional)
                      </label>
                      <textarea
                        value={form.body}
                        onChange={(e) =>
                          setForm({ ...form, body: e.target.value })
                        }
                        rows={2}
                        className={`${inputCls} leading-relaxed`}
                        placeholder="Optional description for this folder..."
                      />
                    </div>
                  ) : (
                    formTab === "content" && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                          {t("content") || "Content"}
                        </label>
                        <textarea
                          value={form.body}
                          onChange={(e) =>
                            setForm({ ...form, body: e.target.value })
                          }
                          rows={4}
                          className={`${inputCls} leading-relaxed`}
                          placeholder={t("writeNoteBody") || "Write your note..."}
                        />
                      </div>
                    )
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {t("category") || "Category"}
                      </label>
                      <select
                        value={form.categoryTag}
                        onChange={(e) =>
                          setForm({ ...form, categoryTag: e.target.value })
                        }
                        className={inputCls}
                      >
                        {NOTE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {tEnum(c.id)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {t("themeColor") || "Color"}
                      </label>
                      <div className="flex gap-2 items-center pt-2">
                        {COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setForm({ ...form, color: c.id })}
                            className={`w-7 h-7 rounded-full ${c.swatch} border-2 transition ${
                              form.color === c.id
                                ? "border-teal-600 scale-110"
                                : "border-transparent opacity-80"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {formTab === "checklist" && form.type !== "folder" && (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(form.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={!!item.checked}
                          onChange={() => {
                            const items = [...form.items];
                            items[idx] = {
                              ...items[idx],
                              checked: !items[idx].checked,
                            };
                            setForm({ ...form, items });
                          }}
                          className="rounded text-teal-600 h-4 w-4"
                        />
                        <input
                          value={
                            typeof item === "string" ? item : item.text || ""
                          }
                          onChange={(e) => {
                            const items = [...form.items];
                            items[idx] = {
                              ...items[idx],
                              text: e.target.value,
                            };
                            setForm({ ...form, items });
                          }}
                          className="flex-1 text-sm bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              items: form.items.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addChecklistItem())
                      }
                      placeholder={`${t("addItem") || "Add item"}...`}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
                    >
                      {t("add") || "Add"}
                    </button>
                  </div>
                </div>
              )}

              {formTab === "media" && form.type !== "folder" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <ImageIcon size={14} className="text-teal-600" /> Image
                      Gallery / File Uploads
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={form.image}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            image: e.target.value,
                            images: form.images?.length
                              ? [e.target.value, ...form.images.slice(1)]
                              : [e.target.value],
                          })
                        }
                        className={inputCls}
                        placeholder={`${t("pasteURL") || "Paste URL"} (https://...)`}
                      />
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Upload size={14} className="text-teal-600" />
                        <span>Upload Files (Multiple)</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {form.images && form.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {form.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-20 bg-slate-100 dark:bg-slate-900"
                          >
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextImages = form.images.filter(
                                  (_, i) => i !== idx,
                                );
                                setForm({
                                  ...form,
                                  images: nextImages,
                                  image: nextImages[0] || "",
                                });
                              }}
                              className="absolute top-1 right-1 p-1 bg-slate-900/80 text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <LinkIcon size={14} className="text-teal-600" />{" "}
                      {t("external") || "Links"}
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={newLink.url}
                        onChange={(e) =>
                          setNewLink({ ...newLink, url: e.target.value })
                        }
                        placeholder="https://..."
                        className={`flex-1 ${inputCls}`}
                      />
                      <input
                        value={newLink.label}
                        onChange={(e) =>
                          setNewLink({ ...newLink, label: e.target.value })
                        }
                        placeholder={t("labelOptional") || "Label"}
                        className={`w-full sm:w-32 ${inputCls}`}
                      />
                      <div className="flex gap-2">
                        <input
                          value={newLink.tag}
                          onChange={(e) =>
                            setNewLink({ ...newLink, tag: e.target.value })
                          }
                          placeholder="Tag"
                          className={`w-full sm:w-28 ${inputCls}`}
                        />
                        <button
                          type="button"
                          onClick={addLink}
                          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold shrink-0"
                        >
                          {t("add") || "Add"}
                        </button>
                      </div>
                    </div>

                    {(form.links || []).length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {form.links.map((link, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <ExternalLink
                                size={12}
                                className="text-teal-600 shrink-0"
                              />
                              <span className="font-semibold truncate">
                                {link.label || link.url}
                              </span>
                              {link.tag && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 font-bold text-[10px] uppercase">
                                  {link.tag}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  links: form.links.filter((_, i) => i !== idx),
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) =>
                      setForm({ ...form, pinned: e.target.checked })
                    }
                    className="rounded text-teal-600 h-4 w-4"
                  />
                  <Pin size={15} className="text-amber-500 fill-amber-500" />{" "}
                  {t("pinned") || "Pinned"}
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                form="note-modal-form"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md shadow-teal-500/20"
              >
                {saving ? t("loading") || "Saving..." : t("save") || "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox.images.length > 0 && (
        <div
          onClick={() => setLightbox({ images: [], index: 0 })}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full flex flex-col items-center justify-center"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-700 z-20">
              <button
                onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
                className="p-2 text-white"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                className="p-2 text-white"
              >
                <ZoomOut size={16} />
              </button>
              <button onClick={() => setScale(1)} className="p-2 text-white">
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setLightbox({ images: [], index: 0 })}
                className="p-2 text-rose-400"
              >
                <X size={16} />
              </button>
            </div>

            {lightbox.images.length > 1 && (
              <button
                onClick={() =>
                  setLightbox((prev) => ({
                    ...prev,
                    index:
                      prev.index === 0
                        ? prev.images.length - 1
                        : prev.index - 1,
                  }))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 z-20"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="overflow-auto max-h-[80vh] max-w-full p-6 flex items-center justify-center">
              <img
                src={lightbox.images[lightbox.index]}
                alt=""
                className="transition-transform duration-200 max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                style={{ transform: `scale(${scale})` }}
              />
            </div>

            {lightbox.images.length > 1 && (
              <button
                onClick={() =>
                  setLightbox((prev) => ({
                    ...prev,
                    index:
                      prev.index === prev.images.length - 1
                        ? 0
                        : prev.index + 1,
                  }))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 z-20"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={deleting}
        title={
          confirmDel === "all"
            ? t("deleteAll") || "Delete All"
            : confirmDel === "selected"
              ? "Delete Selected"
              : t("delete") || "Delete"
        }
        message={
          confirmDel === "all"
            ? t("confirmDeleteAll") || "Delete all notes and folders?"
            : confirmDel === "selected"
              ? `Delete ${selectedIds.size} selected item(s)?`
              : t("confirmDelete") || "Delete this item?"
        }
      />

      {loading ? (
        <LoadingSpinner label={t("loading") || "Loading..."} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={t("noData") || "No items yet"}
          hint={
            currentFolder
              ? "This folder is empty. Create a note or subfolder."
              : t("noDataHint") || "Create your first note or folder."
          }
          action={
            <div className="flex gap-2">
              <button
                onClick={() => openCreate("folder")}
                className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm font-semibold"
              >
                <FolderPlus size={15} className="inline mr-1.5" />
                New Folder
              </button>
              <button
                onClick={() => openCreate("note")}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold"
              >
                {t("addNote") || "Add Note"}
              </button>
            </div>
          }
        />
      ) : (
        <>
          {pinned.length > 0 && pinFilter !== "false" && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Pin size={13} className="text-amber-500 fill-amber-500" />{" "}
                {t("pinned") || "Pinned"}
              </h2>
              {renderList(pinned)}
            </div>
          )}
          {unpinned.length > 0 && pinFilter !== "true" && (
            <div>
              {pinned.length > 0 && pinFilter === "" && (
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                  {t("others") || "Others"}
                </h2>
              )}
              {renderList(unpinned)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notes;
