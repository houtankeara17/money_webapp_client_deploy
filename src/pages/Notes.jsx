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
  Lock,
  Unlock,
  Pencil,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Type,
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
    folder: {
      icon: "text-amber-500",
      tab: "bg-amber-500",
      body: "bg-gradient-to-b from-amber-300 to-amber-400",
      cardBg: "bg-white dark:bg-slate-800/90",
    },
  },
  {
    id: "green",
    label: "Green",
    swatch: "bg-emerald-400",
    card: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs",
    folder: {
      icon: "text-emerald-600",
      tab: "bg-emerald-500",
      body: "bg-gradient-to-b from-emerald-300 to-emerald-500",
      cardBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    },
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "bg-sky-400",
    card: "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/60 shadow-xs",
    folder: {
      icon: "text-sky-600",
      tab: "bg-sky-500",
      body: "bg-gradient-to-b from-sky-300 to-sky-500",
      cardBg: "bg-sky-50/50 dark:bg-sky-950/20",
    },
  },
  {
    id: "yellow",
    label: "Yellow",
    swatch: "bg-amber-400",
    card: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-teal-600/60 shadow-xs",
    folder: {
      icon: "text-amber-600",
      tab: "bg-amber-500",
      body: "bg-gradient-to-b from-amber-200 to-amber-400",
      cardBg: "bg-amber-50/50 dark:bg-amber-950/20",
    },
  },
  {
    id: "red",
    label: "Red",
    swatch: "bg-rose-400",
    card: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 shadow-xs",
    folder: {
      icon: "text-rose-600",
      tab: "bg-rose-500",
      body: "bg-gradient-to-b from-rose-300 to-rose-500",
      cardBg: "bg-rose-50/50 dark:bg-rose-950/20",
    },
  },
  {
    id: "purple",
    label: "Purple",
    swatch: "bg-violet-400",
    card: "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/80 dark:border-violet-800/60 shadow-xs",
    folder: {
      icon: "text-violet-600",
      tab: "bg-violet-500",
      body: "bg-gradient-to-b from-violet-300 to-violet-500",
      cardBg: "bg-violet-50/50 dark:bg-violet-950/20",
    },
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "bg-orange-400",
    card: "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-800/60 shadow-xs",
    folder: {
      icon: "text-orange-600",
      tab: "bg-orange-500",
      body: "bg-gradient-to-b from-orange-300 to-orange-500",
      cardBg: "bg-orange-50/50 dark:bg-orange-950/20",
    },
  },
];

const getFolderStyle = (colorId) =>
  COLORS.find((c) => c.id === colorId)?.folder || COLORS[0].folder;

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
  password: "", // optional lock (test only — plain text)
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
  const [typeFilter, setTypeFilter] = useState(""); // folder | note | file | ""


  // Duplicate-with-rename modal
  const [dupModal, setDupModal] = useState(null); // { id, title, color, type } | null
  const [dupSaving, setDupSaving] = useState(false);
  const dupTitleRef = useRef(null);

  // Password unlock modal (test only)
  const [pwdModal, setPwdModal] = useState(null); // { note, action: 'open' | 'edit' } | null
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");
  const pwdInputRef = useRef(null);

  // Folder item counts / sizes (loaded after list fetch)
  const [folderStats, setFolderStats] = useState({}); // { [id]: { total, folders, files, size } }

  // Rename modal (folders + notes)
  const [renameModal, setRenameModal] = useState(null); // { id, title, type } | null
  const [renameSaving, setRenameSaving] = useState(false);
  const renameInputRef = useRef(null);
  const bodyRef = useRef(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, note } | null

  /** Insert markdown-style formatting into note body (real notes toolbar) */
  const insertFormat = (kind) => {
    const el = bodyRef.current;
    const body = form.body || "";
    let start = el ? el.selectionStart : body.length;
    let end = el ? el.selectionEnd : body.length;
    const selected = body.slice(start, end);
    let insert = "";
    let cursorOffset = 0;

    switch (kind) {
      case "h1":
        insert = selected ? `# ${selected}` : "# Big title\n";
        cursorOffset = selected ? insert.length : 2;
        break;
      case "h2":
        insert = selected ? `## ${selected}` : "## Small title\n";
        cursorOffset = selected ? insert.length : 3;
        break;
      case "bold":
        insert = selected ? `**${selected}**` : "**bold**";
        cursorOffset = selected ? insert.length : 2;
        break;
      case "italic":
        insert = selected ? `*${selected}*` : "*italic*";
        cursorOffset = selected ? insert.length : 1;
        break;
      case "ul":
        insert = selected
          ? selected
              .split("\n")
              .map((l) => (l.trim() ? `- ${l}` : l))
              .join("\n")
          : "- List item\n";
        cursorOffset = insert.length;
        break;
      case "ol":
        insert = selected
          ? selected
              .split("\n")
              .map((l, i) => (l.trim() ? `${i + 1}. ${l}` : l))
              .join("\n")
          : "1. Numbered item\n";
        cursorOffset = insert.length;
        break;
      case "link": {
        const url = window.prompt("Link URL", "https://");
        if (!url) return;
        const label = selected || "link text";
        insert = `[${label}](${url})`;
        cursorOffset = insert.length;
        break;
      }
      case "quote":
        insert = selected ? `> ${selected}` : "> Quote\n";
        cursorOffset = insert.length;
        break;
      default:
        return;
    }

    const next = body.slice(0, start) + insert + body.slice(end);
    setForm({ ...form, body: next });
    setTimeout(() => {
      if (!el) return;
      el.focus();
      const pos = start + (selected ? insert.length : cursorOffset);
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack keys while typing in inputs/modals
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        e.target?.isContentEditable;

      if (e.key === "Escape") {
        if (lightbox.images.length) setLightbox({ images: [], index: 0 });
        else if (pwdModal) {
          setPwdModal(null);
          setPwdInput("");
          setPwdError("");
        } else if (renameModal && !renameSaving) setRenameModal(null);
        else if (ctxMenu) setCtxMenu(null);
        else if (dupModal && !dupSaving) setDupModal(null);
        else if (showForm && !saving) setShowForm(false);
        else if (selectedIds.size) setSelectedIds(new Set());
        return;
      }

      // Ctrl/Cmd + D → duplicate with rename dialog
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "d" &&
        !isTyping &&
        !showForm &&
        !dupModal
      ) {
        e.preventDefault();
        const targetId =
          selectedIds.size >= 1 ? Array.from(selectedIds)[0] : null;
        if (!targetId) return;
        const note = items.find((i) => i._id === targetId);
        if (!note) return;
        setDupModal({
          id: note._id,
          title: `${note.title} (copy)`,
          color: note.color || "default",
          type: note.type || "note",
          originalTitle: note.title,
        });
        setTimeout(() => dupTitleRef.current?.focus?.(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showForm,
    saving,
    lightbox,
    selectedIds,
    dupModal,
    dupSaving,
    items,
    pwdModal,
    renameModal,
    renameSaving,
    ctxMenu,
  ]);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_notes", v);
  };

  const loadFolderStats = async (folderList) => {
    if (!folderList?.length) {
      setFolderStats({});
      return;
    }
    const next = {};
    await Promise.all(
      folderList.map(async (f) => {
        try {
          const { data } = await fetchNotesApi({
            folderId: f._id,
            limit: 200,
          });
          const children = Array.isArray(data?.data?.items)
            ? data.data.items
            : [];
          const total =
            data?.data?.pagination?.total ?? children.length;
          const folders = children.filter((c) => c.type === "folder").length;
          const files = Math.max(0, total - folders);
          const size = children.reduce(
            (sum, c) => sum + (Number(c.fileSize) || 0),
            0,
          );
          next[f._id] = { total, folders, files, size };
        } catch {
          next[f._id] = { total: 0, folders: 0, files: 0, size: 0 };
        }
      }),
    );
    setFolderStats(next);
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
        const list = Array.isArray(data?.data?.items) ? data.data.items : [];
        setItems(list);
        setSelectedIds(new Set());
        // Load counts/sizes for folders in this view
        const foldersOnly = list.filter((i) => i.type === "folder");
        loadFolderStats(foldersOnly);
      } catch (err) {
        console.error("Notes fetch error:", err);
        toast.error(err.response?.data?.message || "Failed to load notes");
        setItems([]);
        setFolderStats({});
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

  const enterFolder = (folder) => {
    setBreadcrumbs((prev) => [...prev, currentFolder].filter(Boolean));
    setCurrentFolder(folder);
    setSelectedIds(new Set());
  };

  const openEditForm = (note) => {
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
      password: note.password || "",
    });
    setNewItemText("");
    setNewLink({ url: "", label: "", tag: "" });
    setFormTab("content");
    setShowForm(true);
  };

  /** Gate open/edit behind password when set (test only — plain compare) */
  const requirePasswordThen = (note, action) => {
    if (note.password) {
      setPwdModal({ note, action });
      setPwdInput("");
      setPwdError("");
      setTimeout(() => pwdInputRef.current?.focus?.(), 50);
      return;
    }
    if (action === "open") enterFolder(note);
    else openEditForm(note);
  };

  const confirmPassword = async () => {
    if (!pwdModal) return;
    if (pwdInput !== pwdModal.note.password) {
      setPwdError("Incorrect password");
      return;
    }
    const { note, action } = pwdModal;
    setPwdModal(null);
    setPwdInput("");
    setPwdError("");

    if (action === "open") {
      enterFolder(note);
      return;
    }
    if (action === "edit") {
      openEditForm(note);
      return;
    }
    // Confirm current password, then remove lock
    if (action === "remove") {
      try {
        await updateNoteApi(note._id, { password: "" });
        if (editing && editing._id === note._id) {
          setForm((f) => ({ ...f, password: "" }));
          setEditing((e) => (e ? { ...e, password: "" } : e));
        }
        toast.success("Password removed");
        fetchData({ silent: true });
      } catch {
        toast.error(t("failed") || "Failed");
      }
    }
  };

  const requestRemovePassword = (note, e) => {
    e?.stopPropagation?.();
    if (!note?.password) {
      setForm((f) => ({ ...f, password: "" }));
      return;
    }
    setPwdModal({ note, action: "remove" });
    setPwdInput("");
    setPwdError("");
    setTimeout(() => pwdInputRef.current?.focus?.(), 50);
  };

  const handleOpenFolder = (folder) => {
    requirePasswordThen(folder, "open");
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
    requirePasswordThen(note, "edit");
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
        // Always send password (empty string removes lock on folder/note)
        password:
          form.password === undefined || form.password === null
            ? ""
            : String(form.password),
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

  const isFolderDropTarget = (id) => {
    if (!id || id === "root") return true;
    const inItems = items.find((i) => i._id === id);
    if (inItems?.type === "folder") return true;
    if (breadcrumbs.some((b) => b._id === id)) return true;
    if (currentFolder?._id === id) return true;
    return false;
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
    // If dragging an item that is part of multi-select, keep selection
    // so drop moves all selected items together
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
    }
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDragLeave = (e, id) => {
    // Only clear if leaving this element (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverId === id) setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedItem = items.find((i) => i._id === draggedId);
    // Allow drop even if item not in current list is rare; normally it is
    if (!draggedItem && !selectedIds.has(draggedId)) {
      setDraggedId(null);
      return;
    }

    // ── Move into folder / root ─────────────────────────────────────────────
    if (isFolderDropTarget(targetId)) {
      const newFolderId = targetId === "root" ? null : targetId;

      // Don't move a folder into itself
      if (draggedId === newFolderId) {
        setDraggedId(null);
        return;
      }

      // Multi-select: move all selected if the dragged item is part of selection
      let idsToMove =
        selectedIds.has(draggedId) && selectedIds.size > 1
          ? Array.from(selectedIds)
          : [draggedId];

      // Never move the destination folder into itself
      idsToMove = idsToMove.filter((id) => id !== newFolderId);

      const targetFolderIdStr = newFolderId ? String(newFolderId) : null;

      // Skip items already in the destination folder
      idsToMove = idsToMove.filter((id) => {
        const item = items.find((i) => i._id === id);
        if (!item) return true;
        const itemFid = item.folderId ? String(item.folderId) : null;
        return itemFid !== targetFolderIdStr;
      });

      if (idsToMove.length === 0) {
        setDraggedId(null);
        return;
      }

      // Prevent cycles: cannot move a folder into one of its own descendants
      if (newFolderId) {
        const foldersBeingMoved = idsToMove.filter((id) => {
          const it = items.find((i) => i._id === id);
          return it?.type === "folder";
        });

        for (const folderId of foldersBeingMoved) {
          const descendants = await getDescendantFolderIds(folderId);
          if (descendants.has(newFolderId) || folderId === newFolderId) {
            toast.error("Cannot move a folder into its own subfolder");
            setDraggedId(null);
            return;
          }
        }
      }

      // Optimistic remove from current view
      setItems((prev) => prev.filter((i) => !idsToMove.includes(i._id)));
      setSelectedIds(new Set());
      setDraggedId(null);

      try {
        await Promise.all(
          idsToMove.map((id) =>
            updateNoteApi(id, { folderId: newFolderId }),
          ),
        );
        toast.success(
          idsToMove.length > 1
            ? `Moved ${idsToMove.length} items`
            : "Moved successfully",
        );
      } catch (err) {
        console.error("Failed to move:", err);
        toast.error(err.response?.data?.message || "Failed to move");
        fetchData({ silent: true });
      }
      return;
    }

    // ── Reorder among siblings (drop on non-folder) ─────────────────────────
    const updatedItems = [...items];
    const draggedIdx = updatedItems.findIndex((i) => i._id === draggedId);
    const targetIdx = updatedItems.findIndex((i) => i._id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      return;
    }

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

  const openDuplicateModal = (id, e) => {
    e?.stopPropagation?.();
    const note = items.find((i) => i._id === id);
    if (!note) return;
    setDupModal({
      id: note._id,
      title: `${note.title} (copy)`,
      color: note.color || "default",
      type: note.type || "note",
      originalTitle: note.title,
      password: note.password || "",
    });
    setTimeout(() => dupTitleRef.current?.focus?.(), 50);
  };

  const handleDuplicate = openDuplicateModal;

  /**
   * Deep-copy an item into destFolderId.
   * Folders recurse: every nested folder/file/note is recreated under the new folder.
   * Password (if any) is copied too.
   */
  const deepDuplicateFromItem = async (item, destFolderId, overrides = {}) => {
    const payload = {
      title: overrides.title ?? item.title,
      body: item.body || "",
      icon: item.icon || (item.type === "folder" ? "📁" : "📝"),
      type: item.type || "note",
      fileType: item.fileType || "",
      folderId: destFolderId ?? null,
      categoryTag: item.categoryTag || "General",
      color: overrides.color ?? item.color ?? "default",
      pinned: false,
      image: item.image || "",
      images: Array.isArray(item.images) ? item.images : [],
      items: (item.items || []).map((it, idx) => ({
        text: typeof it === "string" ? it : it?.text || "",
        checked: false,
        order: idx,
      })),
      links: (item.links || []).map((l) => ({
        url: l.url,
        label: l.label || "",
        tag: l.tag || "",
      })),
      password:
        overrides.password !== undefined
          ? overrides.password
          : item.password || "",
    };

    const { data } = await createNoteApi(payload);
    const created = data?.data || data;

    // Recurse into folder children
    if (item.type === "folder" && created?._id) {
      const { data: childRes } = await fetchNotesApi({
        folderId: item._id,
        limit: 500,
      });
      const children = Array.isArray(childRes?.data?.items)
        ? childRes.data.items
        : [];

      for (const child of children) {
        await deepDuplicateFromItem(child, created._id);
      }
    }

    return created;
  };

  const confirmDuplicate = async () => {
    if (!dupModal?.id) return;
    const title = (dupModal.title || "").trim();
    if (!title) {
      toast.error(t("titleRequired") || "Title is required");
      return;
    }
    const source = items.find((i) => i._id === dupModal.id);
    if (!source) {
      toast.error("Item not found");
      return;
    }

    setDupSaving(true);
    try {
      // Place the copy in the same parent as the source
      const destFolderId =
        source.folderId || currentFolder?._id || null;

      await deepDuplicateFromItem(source, destFolderId, {
        title,
        color: dupModal.color || "default",
        password:
          dupModal.password !== undefined
            ? dupModal.password
            : source.password || "",
      });

      toast.success(
        source.type === "folder"
          ? "Folder duplicated (including all contents)"
          : t("duplicated") || "Duplicated",
      );
      setDupModal(null);
      fetchData({ silent: true });
    } catch (err) {
      console.error("Duplicate failed:", err);
      toast.error(err.response?.data?.message || t("failed") || "Failed");
    } finally {
      setDupSaving(false);
    }
  };

  const openRename = (note, e) => {
    e?.stopPropagation?.();
    setCtxMenu(null);
    setRenameModal({
      id: note._id,
      title: note.title || "",
      type: note.type || "note",
    });
    setTimeout(() => renameInputRef.current?.focus?.(), 50);
  };

  const confirmRename = async () => {
    if (!renameModal?.id) return;
    const title = (renameModal.title || "").trim();
    if (!title) {
      toast.error(t("titleRequired") || "Title is required");
      return;
    }
    setRenameSaving(true);
    try {
      await updateNoteApi(renameModal.id, { title });
      // Update local list + current folder title if needed
      setItems((prev) =>
        prev.map((i) =>
          i._id === renameModal.id ? { ...i, title } : i,
        ),
      );
      if (currentFolder?._id === renameModal.id) {
        setCurrentFolder((prev) => (prev ? { ...prev, title } : prev));
      }
      setBreadcrumbs((prev) =>
        prev.map((b) =>
          b._id === renameModal.id ? { ...b, title } : b,
        ),
      );
      toast.success("Renamed");
      setRenameModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed") || "Failed");
    } finally {
      setRenameSaving(false);
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

  /**
   * Recursively delete a folder and every nested child at any depth.
   * Children are loaded via the API, folders are deleted depth-first,
   * then the folder itself is removed.
   */
  const deleteRecursive = async (id) => {
    try {
      const { data } = await fetchNotesApi({
        folderId: id,
        limit: 500,
      });
      const children = Array.isArray(data?.data?.items) ? data.data.items : [];

      for (const child of children) {
        if (child.type === "folder") {
          await deleteRecursive(child._id);
        } else {
          await deleteNoteApi(child._id);
        }
      }
    } catch (err) {
      console.error("Recursive delete – failed loading children:", err);
    }
    await deleteNoteApi(id);
  };

  /**
   * Collect all descendant folder IDs under a given folder (BFS).
   * Used to prevent moving a folder into one of its own descendants.
   */
  const getDescendantFolderIds = async (folderId) => {
    const ids = new Set();
    const queue = [folderId];

    while (queue.length > 0) {
      const fid = queue.shift();
      try {
        const { data } = await fetchNotesApi({
          folderId: fid,
          limit: 500,
          type: "folder",
        });
        const children = Array.isArray(data?.data?.items)
          ? data.data.items
          : [];
        for (const c of children) {
          if (c.type === "folder" && !ids.has(c._id)) {
            ids.add(c._id);
            queue.push(c._id);
          }
        }
      } catch {
        break;
      }
    }
    return ids;
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "selected") {
        const ids = Array.from(selectedIds);
        // Delete folders recursively so nested content is removed
        for (const id of ids) {
          const item = items.find((i) => i._id === id);
          if (item?.type === "folder") {
            await deleteRecursive(id);
          } else {
            await deleteNoteApi(id);
          }
        }
        toast.success(`${ids.length} item(s) deleted`);
        setSelectedIds(new Set());
      } else if (confirmDel === "all") {
        await deleteNoteApi("all");
        toast.success(t("allNotesDeleted") || "All notes deleted");
      } else {
        const item = items.find((i) => i._id === confirmDel);
        if (item?.type === "folder") {
          await deleteRecursive(confirmDel);
        } else {
          await deleteNoteApi(confirmDel);
        }
        toast.success(t("noteDeleted") || "Deleted");
        if (editing && editing._id === confirmDel) {
          setShowForm(false);
          setEditing(null);
        }
        // If we deleted a folder that is in the breadcrumb path, navigate up
        if (
          currentFolder &&
          (currentFolder._id === confirmDel ||
            breadcrumbs.some((b) => b._id === confirmDel))
        ) {
          setCurrentFolder(null);
          setBreadcrumbs([]);
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
      let exportItems = [];
      // Export only selected rows when selection exists
      if (selectedIds.size > 0) {
        exportItems = items.filter((i) => selectedIds.has(i._id));
      } else {
        const { data } = await exportNotesApi();
        exportItems = data?.data || items;
      }
      if (!exportItems || exportItems.length === 0) {
        toast.error("No data to export — select items or create notes first");
        return;
      }
      const formattedText = exportItems
        .map((note) =>
          `Title: ${note.title}\nCategory: ${note.categoryTag || ""}\nType: ${
            note.type || "note"
          }\n\n${note.body || ""}`.trim(),
        )
        .join("\n\n---\n\n");

      const blob = new Blob([formattedText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        selectedIds.size > 0
          ? `notes_selected_${selectedIds.size}_${Date.now()}.txt`
          : `notes_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        selectedIds.size > 0
          ? `Exported ${exportItems.length} selected item(s)`
          : "Export successful",
      );
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

  /** Compact type badge for file-manager style cards */
  const getTypeBadge = (note) => {
    if (note.type === "folder") {
      return {
        label: "FOLDER",
        bg: "bg-amber-400",
        text: "text-amber-950",
        cardIcon: (
          <Folder size={28} className="text-amber-400" fill="currentColor" />
        ),
        typeLabel: "Folder",
      };
    }
    const ft = (note.fileType || "").toLowerCase();
    const title = (note.title || "").toLowerCase();
    if (ft.includes("pdf") || title.endsWith(".pdf")) {
      return {
        label: "PDF",
        bg: "bg-rose-500",
        text: "text-white",
        cardIcon: <File size={28} className="text-rose-500" />,
        typeLabel: "Documents",
      };
    }
    if (
      ft.includes("doc") ||
      title.endsWith(".doc") ||
      title.endsWith(".docx")
    ) {
      return {
        label: "DOC",
        bg: "bg-blue-500",
        text: "text-white",
        cardIcon: <File size={28} className="text-blue-500" />,
        typeLabel: "Documents",
      };
    }
    if (ft.includes("svg") || title.endsWith(".svg")) {
      return {
        label: "SVG",
        bg: "bg-emerald-500",
        text: "text-white",
        cardIcon: <ImageIcon size={28} className="text-emerald-500" />,
        typeLabel: "Image",
      };
    }
    if (
      ft.includes("image") ||
      /\.(png|jpe?g|gif|webp)$/i.test(title)
    ) {
      return {
        label: "IMG",
        bg: "bg-violet-500",
        text: "text-white",
        cardIcon: <ImageIcon size={28} className="text-violet-500" />,
        typeLabel: "Image",
      };
    }
    if (note.type === "file") {
      return {
        label: "FILE",
        bg: "bg-slate-500",
        text: "text-white",
        cardIcon: <Paperclip size={28} className="text-slate-400" />,
        typeLabel: "File",
      };
    }
    // note
    return {
      label: "NOTE",
      bg: "bg-teal-500",
      text: "text-white",
      cardIcon: (
        <span className="text-2xl leading-none">{note.icon || "📝"}</span>
      ),
      typeLabel: note.categoryTag || "Note",
    };
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


  // ─── Compact file-manager card (screenshot style) ─────────────────────────
  const CompactFileCard = ({ note }) => {
    const isFolder = note.type === "folder";
    const isSelected = selectedIds.has(note._id);
    const isBeingDragged =
      draggedId === note._id ||
      (draggedId && selectedIds.has(note._id) && selectedIds.has(draggedId));
    const isDropTarget =
      dragOverId === note._id && draggedId && draggedId !== note._id;
    const badge = getTypeBadge(note);
    const stats = folderStats[note._id];
    const imagesList =
      Array.isArray(note.images) && note.images.length > 0
        ? note.images
        : note.image
          ? [note.image]
          : [];

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, note._id)}
        onDragOver={(e) => handleDragOver(e, note._id)}
        onDragLeave={(e) => handleDragLeave(e, note._id)}
        onDrop={(e) => handleDrop(e, note._id)}
        onDragEnd={handleDragEnd}
        onClick={() => (isFolder ? handleOpenFolder(note) : openEdit(note))}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY, note });
        }}
        className={`group relative rounded-xl border bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 p-3.5 cursor-pointer hover:border-teal-400/50 dark:hover:border-teal-500/40 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center min-h-[128px] ${
          isSelected
            ? "ring-2 ring-teal-500 border-teal-500 bg-teal-50/40 dark:bg-teal-950/20"
            : ""
        } ${
          isBeingDragged
            ? "opacity-30 scale-95 border-dashed border-teal-500"
            : ""
        } ${
          isDropTarget
            ? "ring-2 ring-amber-500 border-amber-500 scale-[1.03]"
            : ""
        }`}
      >
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelect(note._id, e)}
            onClick={(e) => e.stopPropagation()}
            className="rounded text-violet-600 h-3.5 w-3.5 cursor-pointer"
          />
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCtxMenu({ x: e.clientX, y: e.clientY, note });
            }}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-1 w-full">
          {imagesList.length > 0 && !isFolder ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 border border-slate-200 dark:border-slate-600">
              <img
                src={imagesList[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center mb-2">
              {isFolder ? (
                note.icon && note.icon !== "📁" ? (
                  <span className="text-2xl">{note.icon}</span>
                ) : (
                  badge.cardIcon
                )
              ) : (
                <div
                  className={`px-1.5 py-1 rounded-md text-[10px] font-black tracking-wide ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </div>
              )}
            </div>
          )}

          {isFolder ? (
            <button
              type="button"
              onClick={(e) => openRename(note, e)}
              className="font-medium text-xs text-slate-800 dark:text-slate-100 truncate w-full px-1 hover:text-violet-600 transition flex items-center justify-center gap-0.5"
              title="Click to rename"
            >
              {note.password ? (
                <Lock size={10} className="text-amber-500 shrink-0" />
              ) : null}
              <span className="truncate">{note.title}</span>
            </button>
          ) : (
            <h3 className="font-medium text-xs text-slate-800 dark:text-slate-100 truncate w-full px-1 flex items-center justify-center gap-0.5">
              {note.password ? (
                <Lock size={10} className="text-amber-500 shrink-0" />
              ) : null}
              <span className="truncate">{note.title}</span>
            </h3>
          )}

          <p className="text-[10px] text-slate-400 mt-0.5 truncate w-full px-1">
            {isFolder
              ? stats
                ? stats.total === 0
                  ? "Empty"
                  : `${stats.total} items${stats.size ? ` · ${formatSize(stats.size)}` : ""}`
                : "…"
              : formatSize(note.fileSize)}
          </p>
        </div>
      </div>
    );
  };

  const CreateFolderCard = () => (
    <button
      type="button"
      onClick={() => openCreate("folder")}
      className="group relative rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-transparent p-3.5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all duration-200 flex flex-col items-center justify-center min-h-[128px] text-slate-400 hover:text-teal-600"
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-2 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition">
        <Plus size={18} />
      </div>
      <span className="text-xs font-semibold">New folder</span>
    </button>
  );

  // Legacy aliases so any remaining references keep working
  const FolderCard = CompactFileCard;
  const NoteCard = CompactFileCard;

  // ─── List / Table row ─────────────────────────────────────────────────────
  const ListRow = ({ note }) => {
    const isFolder = note.type === "folder";
    const isFile = note.type === "file";
    const formattedDate = formatDate(note.updatedAt || note.createdAt);
    const isSelected = selectedIds.has(note._id);
    const isDropTarget =
      dragOverId === note._id && draggedId && draggedId !== note._id;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, note._id)}
        onDragOver={(e) => handleDragOver(e, note._id)}
        onDragLeave={(e) => handleDragLeave(e, note._id)}
        onDrop={(e) => handleDrop(e, note._id)}
        onDragEnd={handleDragEnd}
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
          isDropTarget && isFolder
            ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/60 dark:bg-amber-950/20"
            : isDropTarget
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
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
            {note.password ? (
              <Lock size={12} className="text-amber-600 shrink-0" />
            ) : null}
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


  // ─── Table view (file manager style) ──────────────────────────────────────
  const TableView = ({ list }) => (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-800/90">
      <div className="grid grid-cols-[40px_minmax(0,1.4fr)_120px_100px_130px_90px_70px] gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={list.length > 0 && selectedIds.size === list.length}
            onChange={toggleSelectAll}
            className="rounded text-violet-600 h-4 w-4 cursor-pointer"
            title="Select all"
          />
        </div>
        <div className="flex items-center gap-1">Name</div>
        <div>File Type</div>
        <div>File Size</div>
        <div>Last Modified</div>
        <div>Status</div>
        <div className="text-right"> </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((note) => {
          const isFolder = note.type === "folder";
          const isSelected = selectedIds.has(note._id);
          const updated = formatDate(note.updatedAt || note.createdAt);
          const badge = getTypeBadge(note);
          const isDropTarget =
            dragOverId === note._id && draggedId && draggedId !== note._id;
          const isBeingDragged =
            draggedId === note._id ||
            (draggedId &&
              selectedIds.has(note._id) &&
              selectedIds.has(draggedId));

          return (
            <div
              key={note._id}
              draggable
              onDragStart={(e) => handleDragStart(e, note._id)}
              onDragOver={(e) => handleDragOver(e, note._id)}
              onDragLeave={(e) => handleDragLeave(e, note._id)}
              onDrop={(e) => handleDrop(e, note._id)}
              onDragEnd={handleDragEnd}
              onClick={() =>
                isFolder ? handleOpenFolder(note) : openEdit(note)
              }
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, note });
              }}
              className={`grid grid-cols-[40px_minmax(0,1.4fr)_120px_100px_130px_90px_70px] gap-2 px-4 py-2.5 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group ${
                isSelected ? "bg-violet-50/50 dark:bg-violet-950/20" : ""
              } ${
                isDropTarget && isFolder
                  ? "bg-amber-50/70 dark:bg-amber-950/25 ring-1 ring-inset ring-amber-400"
                  : ""
              } ${isBeingDragged ? "opacity-30" : ""}`}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelect(note._id, e)}
                  className="rounded text-violet-600 h-4 w-4 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  {isFolder ? (
                    <Folder
                      size={16}
                      className="text-amber-400"
                      fill="currentColor"
                    />
                  ) : (
                    <span
                      className={`text-[9px] font-black px-1 py-0.5 rounded ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                  {note.password ? (
                    <Lock size={11} className="text-amber-500 shrink-0" />
                  ) : null}
                  {note.title}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {badge.typeLabel}
              </div>
              <div className="text-xs text-slate-500">
                {isFolder
                  ? folderStats[note._id]
                    ? formatSize(folderStats[note._id].size)
                    : "…"
                  : formatSize(note.fileSize)}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {updated || "—"}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={(e) => openRename(note, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600"
                >
                  <Pencil size={13} />
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
        })}
      </div>
    </div>
  );


  const renderList = (list) => {
    if (view === "list") {
      return (
        <div className="space-y-1.5 w-full">
          <div className="flex items-center gap-2 px-1 mb-2">
            <input
              type="checkbox"
              checked={list.length > 0 && selectedIds.size === list.length}
              onChange={toggleSelectAll}
              className="rounded text-violet-600 h-4 w-4 cursor-pointer"
            />
            <span className="text-xs text-slate-500 font-medium">
              Select all ({list.length})
            </span>
          </div>
          {list.map((note) => (
            <ListRow key={note._id} note={note} />
          ))}
        </div>
      );
    }
    if (view === "table") {
      return <TableView list={list} />;
    }
    // Grid — compact file-manager cards (folders + notes together)
    const folderItems = list.filter((n) => n.type === "folder");
    const otherItems = list.filter((n) => n.type !== "folder");
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={list.length > 0 && selectedIds.size === list.length}
            onChange={toggleSelectAll}
            className="rounded text-violet-600 h-4 w-4 cursor-pointer"
          />
          <span className="text-xs text-slate-500 font-medium">
            Select all · {list.length} items
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </span>
        </div>

        {(folderItems.length > 0 || !currentFolder) && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Folders
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {folderItems.map((n) => (
                <CompactFileCard key={n._id} note={n} />
              ))}
              <CreateFolderCard />
            </div>
          </div>
        )}

        {otherItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Files & Notes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {otherItems.map((n) => (
                <CompactFileCard key={n._id} note={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeFilterCount = [
    catFilter,
    pinFilter,
    typeFilter,
    search.trim(),
  ].filter(Boolean).length;

  // Client-side type filter (API still returns mixed types in folder)
  const displayItems = typeFilter
    ? items.filter((i) => i.type === typeFilter)
    : items;
  const displayPinned = displayItems.filter((n) => n.pinned);
  const displayUnpinned = displayItems.filter((n) => !n.pinned);

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-[1700px] mx-auto ">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-500/10 dark:bg-teal-400/10 rounded-2xl border border-teal-500/20">
              <Sparkles className="w-6 h-6 text-teal-600 dark:text-amber-400" />
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
            title="Export selected rows, or all if none selected"
          >
            <Download size={14} /> {selectedIds.size > 0 ? `Export (${selectedIds.size})` : (t("export") || "Export")}
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

      {/* Breadcrumb — droppable to move items up */}
      <nav className="flex items-center gap-1.5 mb-5 px-3.5 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-sm font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => handleNavigateBreadcrumb(null)}
          onDragOver={(e) => handleDragOver(e, "root")}
          onDragLeave={(e) => handleDragLeave(e, "root")}
          onDrop={(e) => handleDrop(e, "root")}
          className={`hover:text-teal-600 transition shrink-0 px-2 py-1 rounded-lg ${
            !currentFolder ? "text-teal-600 font-bold" : "text-slate-500"
          } ${
            dragOverId === "root" && draggedId
              ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700"
              : ""
          }`}
        >
          Root
        </button>
        {breadcrumbs.map((b, idx) => (
          <Fragment key={b._id}>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => handleNavigateBreadcrumb(b, idx)}
              onDragOver={(e) => handleDragOver(e, b._id)}
              onDragLeave={(e) => handleDragLeave(e, b._id)}
              onDrop={(e) => handleDrop(e, b._id)}
              className={`text-slate-500 hover:text-teal-600 transition truncate max-w-[120px] px-2 py-1 rounded-lg ${
                dragOverId === b._id && draggedId
                  ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700"
                  : ""
              }`}
            >
              {b.title}
            </button>
          </Fragment>
        ))}
        {currentFolder && (
          <>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <span className="text-teal-600 font-bold truncate max-w-[160px] px-2 py-1">
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
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Filters
            </span>
            {(catFilter || pinFilter || typeFilter || search.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setCatFilter("");
                  setPinFilter("");
                  setTypeFilter("");
                  setSearch("");
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <X size={12} /> Reset all
              </button>
            )}
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Type</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTypeFilter("")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  !typeFilter
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400"
                }`}
              >
                All
              </button>
              {[
                { id: "folder", label: "📁 Folders" },
                { id: "note", label: "📝 Notes" },
                { id: "file", label: "📄 Files" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setTypeFilter((v) => (v === opt.id ? "" : opt.id))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    typeFilter === opt.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
              Category
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              <button
                type="button"
                onClick={() => setCatFilter("")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  !catFilter
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                All
              </button>
              {NOTE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setCatFilter((v) => (v === c.id ? "" : c.id))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    catFilter === c.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.emoji} {tEnum(c.id)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
              Pinned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "", label: "Any" },
                { id: "true", label: "📌 Pinned" },
                { id: "false", label: "Not pinned" },
              ].map((opt) => (
                <button
                  key={opt.id || "any"}
                  type="button"
                  onClick={() => setPinFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    pinFilter === opt.id
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Multi-select action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-full bg-[#12141c]/95 text-white shadow-2xl border border-white/10 backdrop-blur-md">
          <span className="text-sm font-semibold">
            {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="w-px h-5 bg-slate-600" />
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
            title="Export selected"
          >
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            onClick={async () => {
              const ids = Array.from(selectedIds);
              if (ids.length === 1) {
                openDuplicateModal(ids[0]);
              } else if (ids.length > 1) {
                try {
                  for (const id of ids) {
                    const source = items.find((i) => i._id === id);
                    if (!source) continue;
                    const destFolderId =
                      source.folderId || currentFolder?._id || null;
                    await deepDuplicateFromItem(source, destFolderId, {
                      title: `${source.title} (copy)`,
                    });
                  }
                  toast.success(`Duplicated ${ids.length} items`);
                  setSelectedIds(new Set());
                  fetchData({ silent: true });
                } catch {
                  toast.error(t("failed") || "Failed");
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
            title="Duplicate (Ctrl/Cmd+D to rename)"
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

      {/* Create / Edit Modal — teal light/dark + notes toolbar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header toolbar */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1 hidden sm:inline">
                {editing
                  ? "Edit"
                  : form.type === "folder"
                    ? "New folder"
                    : "New note"}
              </span>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />

              <button
                type="button"
                onClick={() => setForm({ ...form, pinned: !form.pinned })}
                className={`p-2 rounded-lg transition ${
                  form.pinned
                    ? "bg-amber-500/15 text-amber-500"
                    : "text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                }`}
                title="Pin"
              >
                <Pin size={15} className={form.pinned ? "fill-amber-500" : ""} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.id })}
                    title={c.label}
                    className={`w-4 h-4 rounded-full ${c.swatch} border transition ${
                      form.color === c.id
                        ? "border-teal-600 scale-125"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />

              {form.type !== "folder" &&
                ["content", "checklist", "media"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFormTab(tab)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize transition ${
                      formTab === tab
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                        : "text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab === "content"
                      ? "Write"
                      : tab === "checklist"
                        ? "List"
                        : "Media"}
                  </button>
                ))}

              <div className="flex-1" />

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                title="Close"
              >
                <X size={16} />
              </button>
              <button
                type="submit"
                form="note-modal-form"
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition"
              >
                {saving ? "…" : t("save") || "Save"}
              </button>
            </div>

            {/* Formatting toolbar (real notes) */}
            {form.type !== "folder" && formTab === "content" && (
              <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-800">
                {[
                  { kind: "h1", icon: Heading1, title: "Big title" },
                  { kind: "h2", icon: Heading2, title: "Small title" },
                  { kind: "bold", icon: Bold, title: "Bold" },
                  { kind: "italic", icon: Italic, title: "Italic" },
                  { kind: "ul", icon: List, title: "Bullet list" },
                  { kind: "ol", icon: ListOrdered, title: "Numbered list" },
                  { kind: "link", icon: LinkIcon, title: "Link" },
                  { kind: "quote", icon: Type, title: "Quote" },
                ].map(({ kind, icon: Icon, title }) => (
                  <button
                    key={kind}
                    type="button"
                    title={title}
                    onClick={() => insertFormat(kind)}
                    className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:bg-teal-500/15 transition"
                  >
                    <Icon size={15} />
                  </button>
                ))}
                <span className="ml-2 text-[10px] text-slate-400 hidden sm:inline">
                  Select text then click a style
                </span>
              </div>
            )}

            <form
              id="note-modal-form"
              onSubmit={handleSubmit}
              className="px-5 sm:px-6 py-5 space-y-5 overflow-y-auto flex-1 bg-white dark:bg-slate-800"
            >

              {(formTab === "content" || form.type === "folder") && (
                <>
                  {/* Type selector — hide when creating folder via New Folder button */}
                  {!(form.type === "folder" && !editing) && (
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
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      {form.type === "folder"
                        ? "Folder name"
                        : t("title") || "Title"}
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

                  {/* Emoji / icon picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      {t("chooseIcon") || "Emoji / Icon"}
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
                              : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note/file body — not for folders */}
                  {form.type !== "folder" && formTab === "content" && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {t("content") || "Content"}
                      </label>
                      <textarea
                        ref={bodyRef}
                        value={form.body}
                        onChange={(e) =>
                          setForm({ ...form, body: e.target.value })
                        }
                        rows={8}
                        className={`${inputCls} leading-relaxed min-h-[160px] font-normal`}
                        placeholder={
                          t("writeNoteBody") ||
                          "Write your note… Use the toolbar for titles, lists, links"
                        }
                      />
                    </div>
                  )}

                  <div
                    className={`grid gap-4 ${
                      form.type === "folder"
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-2"
                    }`}
                  >
                    {form.type !== "folder" && (
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
                    )}

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {t("themeColor") || "Color"}
                      </label>
                      <div className="flex gap-2 items-center pt-2 flex-wrap">
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

              <div className="pt-2 space-y-4">
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

                {/* Password — can set, change, or remove */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Lock size={12} /> Password
                    {editing && form.password ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[10px] font-bold normal-case tracking-normal">
                        Protected
                      </span>
                    ) : null}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={form.password || ""}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className={inputCls}
                      placeholder={
                        editing
                          ? "New password (or clear to remove)"
                          : "Optional password"
                      }
                      autoComplete="new-password"
                    />
                    {(form.password || (editing && editing.password)) && (
                      <button
                        type="button"
                        onClick={() => {
                          // If item already has a saved password, confirm it first
                          if (editing?.password) {
                            requestRemovePassword(editing);
                          } else {
                            setForm({ ...form, password: "" });
                          }
                        }}
                        className="shrink-0 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        title="Remove password (requires confirmation)"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Set a password to lock this{" "}
                    {form.type === "folder" ? "folder" : "item"}. Removing a
                    saved password requires entering it first.
                  </p>
                </div>
              </div>
            </form>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {form.type === "folder"
                  ? "Folder"
                  : form.pinned
                    ? "Pinned note"
                    : "Note"}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="font-semibold text-slate-500 hover:text-teal-600"
              >
                Close
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

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-[180px] rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-sm"
            style={{
              left: Math.min(ctxMenu.x, window.innerWidth - 200),
              top: Math.min(ctxMenu.y, window.innerHeight - 280),
            }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left"
              onClick={() => {
                const n = ctxMenu.note;
                setCtxMenu(null);
                // Edit works for folders too (password, color, icon…)
                requirePasswordThen(n, "edit");
              }}
            >
              <Pencil size={14} className="text-slate-400" /> Edit
              {ctxMenu.note.type === "folder" ? " folder" : ""}
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left"
              onClick={() => openRename(ctxMenu.note)}
            >
              <Sparkles size={14} className="text-slate-400" /> Rename
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left"
              onClick={() => {
                openDuplicateModal(ctxMenu.note._id);
                setCtxMenu(null);
              }}
            >
              <Copy size={14} className="text-slate-400" /> Duplicate
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left"
              onClick={(e) => {
                handleTogglePin(ctxMenu.note._id, e);
                setCtxMenu(null);
              }}
            >
              <Pin size={14} className="text-slate-400" />
              {ctxMenu.note.pinned ? "Unpin" : "Pin"}
            </button>
            {ctxMenu.note.password ? (
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left"
                onClick={() => {
                  const n = ctxMenu.note;
                  setCtxMenu(null);
                  requestRemovePassword(n);
                }}
              >
                <Unlock size={14} className="text-amber-500" /> Remove password
              </button>
            ) : null}
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 text-left"
              onClick={() => {
                setConfirmDel(ctxMenu.note._id);
                setCtxMenu(null);
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => !renameSaving && setRenameModal(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Rename {renameModal.type === "folder" ? "folder" : "item"}
              </h2>
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">
              <input
                ref={renameInputRef}
                value={renameModal.title}
                onChange={(e) =>
                  setRenameModal((prev) =>
                    prev ? { ...prev, title: e.target.value } : prev,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmRename();
                  }
                }}
                className={`${inputCls} font-semibold`}
                placeholder="New name..."
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                disabled={renameSaving}
                onClick={() => setRenameModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renameSaving}
                onClick={confirmRename}
                className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                {renameSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password unlock (test only) */}
      {pwdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => {
            setPwdModal(null);
            setPwdInput("");
            setPwdError("");
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Lock size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {pwdModal.action === "remove"
                      ? "Confirm to remove password"
                      : "Password required"}
                  </h2>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {pwdModal.action === "remove"
                      ? "Enter current password to unlock"
                      : pwdModal.note.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPwdModal(null);
                  setPwdInput("");
                  setPwdError("");
                }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <input
                ref={pwdInputRef}
                type="password"
                value={pwdInput}
                onChange={(e) => {
                  setPwdInput(e.target.value);
                  setPwdError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmPassword();
                  }
                }}
                className={inputCls}
                placeholder="Enter password..."
                autoComplete="current-password"
              />
              {pwdError && (
                <p className="text-xs text-rose-500 font-medium">{pwdError}</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => {
                  setPwdModal(null);
                  setPwdInput("");
                  setPwdError("");
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPassword}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 ${
                  pwdModal.action === "remove"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-teal-600 hover:bg-teal-500"
                }`}
              >
                {pwdModal.action === "remove" ? (
                  <>
                    <Unlock size={14} /> Remove lock
                  </>
                ) : (
                  <>
                    <Unlock size={14} /> Unlock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate with rename + color */}
      {dupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => !dupSaving && setDupModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Duplicate
                  {dupModal.type === "folder" ? " folder" : ""}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dupModal.type === "folder"
                    ? "Copies folder + all nested folders & files · "
                    : "Rename and choose a color · "}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">
                    Ctrl+D
                  </kbd>
                </p>
              </div>
              <button
                type="button"
                disabled={dupSaving}
                onClick={() => setDupModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Name
                </label>
                <input
                  ref={dupTitleRef}
                  value={dupModal.title}
                  onChange={(e) =>
                    setDupModal((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmDuplicate();
                    }
                  }}
                  className={`${inputCls} font-semibold`}
                  placeholder="New name..."
                />
                {dupModal.originalTitle && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Original: {dupModal.originalTitle}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Color
                  {dupModal.type === "folder" ? " (folder)" : ""}
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setDupModal((prev) =>
                          prev ? { ...prev, color: c.id } : prev,
                        )
                      }
                      title={c.label}
                      className={`w-8 h-8 rounded-full ${c.swatch} border-2 transition ${
                        dupModal.color === c.id
                          ? "border-teal-600 scale-110 ring-2 ring-teal-500/30"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lock size={12} /> Password (optional)
                </label>
                <input
                  type="password"
                  value={dupModal.password || ""}
                  onChange={(e) =>
                    setDupModal((prev) =>
                      prev ? { ...prev, password: e.target.value } : prev,
                    )
                  }
                  className={inputCls}
                  placeholder="Leave empty for no lock"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                disabled={dupSaving}
                onClick={() => setDupModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dupSaving}
                onClick={confirmDuplicate}
                className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-1.5"
              >
                <Copy size={14} />
                {dupSaving ? "Duplicating..." : "Duplicate"}
              </button>
            </div>
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
              : items.find((i) => i._id === confirmDel)?.type === "folder"
                ? "Delete Folder"
                : t("delete") || "Delete"
        }
        message={
          confirmDel === "all"
            ? t("confirmDeleteAll") || "Delete all notes and folders?"
            : confirmDel === "selected"
              ? `Delete ${selectedIds.size} selected item(s)? Folders will be deleted with all nested contents.`
              : items.find((i) => i._id === confirmDel)?.type === "folder"
                ? "Delete this folder and all nested folders, notes, and files inside it? This cannot be undone."
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
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No matching items"
          hint="Try clearing filters or create something new."
        />
      ) : (
        <>
          {displayPinned.length > 0 && pinFilter !== "false" && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Pin size={13} className="text-amber-500 fill-amber-500" />{" "}
                {t("pinned") || "Pinned"}
              </h2>
              {renderList(displayPinned)}
            </div>
          )}
          {displayUnpinned.length > 0 && pinFilter !== "true" && (
            <div>
              {displayPinned.length > 0 && pinFilter === "" && typeFilter === "" && (
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                  All files
                </h2>
              )}
              {renderList(displayUnpinned)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notes;
