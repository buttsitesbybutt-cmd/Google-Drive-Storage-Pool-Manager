import React, { useState } from 'react';
import {
  Search,
  Upload,
  FolderPlus,
  Grid,
  List,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileCode,
  File,
  Download,
  Eye,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  HardDrive,
  ArrowLeft,
} from 'lucide-react';
import { DriveFileItem, ConnectedDriveAccount, DriveFolderItem } from '../types';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

interface FileExplorerProps {
  files: DriveFileItem[];
  folders: DriveFolderItem[];
  drives: ConnectedDriveAccount[];
  selectedDriveFilter: string;
  selectedCategory: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onDriveFilterChange: (driveId: string) => void;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onSortChange: (sortBy: string) => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onDeleteFolder: (folder: DriveFolderItem) => void;
  onPreviewFile: (file: DriveFileItem) => void;
  onDownloadFile: (file: DriveFileItem) => void;
  onDeleteFile: (file: DriveFileItem) => void;
}

const CATEGORIES = [
  'All',
  'Documents',
  'Spreadsheets',
  'Images',
  'Videos',
  'Audio',
  'Archives',
];

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  folders,
  drives,
  selectedDriveFilter,
  selectedCategory,
  searchQuery,
  viewMode,
  sortBy,
  sortOrder,
  currentFolderId,
  onSelectFolder,
  onDriveFilterChange,
  onCategoryChange,
  onSearchChange,
  onViewModeChange,
  onSortChange,
  onUploadClick,
  onNewFolderClick,
  onDeleteFolder,
  onPreviewFile,
  onDownloadFile,
  onDeleteFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const getFileIcon = (mimeType: string, filename: string) => {
    const cat = getFileCategory(mimeType, filename);
    switch (cat) {
      case 'Documents':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'Spreadsheets':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'Images':
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      case 'Videos':
        return <Film className="w-5 h-5 text-rose-600" />;
      case 'Audio':
        return <Music className="w-5 h-5 text-amber-600" />;
      case 'Archives':
        return <Archive className="w-5 h-5 text-orange-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  // Find active folder object (by id or google_folder_id)
  const activeFolder = folders.find(
    (f) => f.id === currentFolderId || f.google_folder_id === currentFolderId
  );

  // Build full ancestor breadcrumbs
  const breadcrumbs: DriveFolderItem[] = [];
  let curr = activeFolder;
  while (curr) {
    breadcrumbs.unshift(curr);
    if (!curr.parent_folder_id || curr.parent_folder_id === 'root') break;
    curr = folders.find(
      (f) => f.id === curr?.parent_folder_id || f.google_folder_id === curr?.parent_folder_id
    );
  }

  // Parent folder of the current folder
  const parentFolder = activeFolder?.parent_folder_id && activeFolder.parent_folder_id !== 'root'
    ? folders.find(
        (f) => f.id === activeFolder.parent_folder_id || f.google_folder_id === activeFolder.parent_folder_id
      )
    : null;

  // Subfolders in current level
  const displayedFolders = folders.filter((f) => {
    if (selectedDriveFilter && f.drive_account_id !== selectedDriveFilter) return false;
    if (searchQuery) {
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (currentFolderId) {
      return (
        f.parent_folder_id === currentFolderId ||
        (activeFolder && f.parent_folder_id === activeFolder.google_folder_id) ||
        (activeFolder && f.parent_folder_id === activeFolder.id)
      );
    }
    // In root level: folders with no parent_folder_id or parent is 'root' or parent not present in folder catalog
    return (
      !f.parent_folder_id ||
      f.parent_folder_id === 'root' ||
      !folders.some((other) => other.id === f.parent_folder_id || other.google_folder_id === f.parent_folder_id)
    );
  });

  // Filtered files in current level
  const displayedFiles = files.filter((f) => {
    if (selectedDriveFilter && f.drive_account_id !== selectedDriveFilter) return false;
    if (searchQuery) {
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (selectedCategory && selectedCategory !== 'All') {
      const cat = getFileCategory(f.mime_type, f.name);
      if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (currentFolderId) {
      return (
        f.folder_id === currentFolderId ||
        (activeFolder && f.folder_id === activeFolder.google_folder_id) ||
        (activeFolder && f.folder_id === activeFolder.id)
      );
    }
    // When in root catalog and not searching
    return (
      !f.folder_id ||
      f.folder_id === 'root' ||
      !folders.some((folder) => folder.id === f.folder_id || folder.google_folder_id === f.folder_id)
    );
  });

  return (
    <div
      className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs transition-colors ${
        isDragOver ? 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/20' : 'border-slate-200'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onUploadClick();
      }}
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Virtual File &amp; Folder Catalog</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse folders, stream media directly from Google Drive, and download without local disk storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="file-explorer-new-folder-btn"
            onClick={onNewFolderClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>New Folder</span>
          </button>

          <button
            id="file-explorer-upload-btn"
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/20 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Stream Upload File</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => onSelectFolder(null)}
            className={`inline-flex items-center gap-1 font-medium hover:text-indigo-600 transition-colors shrink-0 ${
              !currentFolderId ? 'text-indigo-600 font-bold' : 'text-slate-600'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Root Catalog</span>
          </button>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id || crumb.google_folder_id}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  onClick={() => onSelectFolder(crumb.google_folder_id || crumb.id)}
                  className={`inline-flex items-center gap-1 truncate max-w-[150px] transition-colors ${
                    isLast
                      ? 'text-indigo-600 font-bold'
                      : 'text-slate-600 hover:text-indigo-600 font-medium'
                  }`}
                  title={crumb.name}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{crumb.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {currentFolderId && (
          <button
            onClick={() => {
              if (parentFolder) {
                onSelectFolder(parentFolder.google_folder_id || parentFolder.id);
              } else {
                onSelectFolder(null);
              }
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Up One Level</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="file-search-input"
            type="text"
            placeholder="Search pooled files & folders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Drive Filter Dropdown */}
          <div className="relative">
            <select
              id="drive-filter-select"
              value={selectedDriveFilter}
              onChange={(e) => onDriveFilterChange(e.target.value)}
              className="px-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="">All Drives (Pooled View)</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.email} ({d.name})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="modified">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory.toLowerCase() === cat.toLowerCase()
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Folders Section */}
      {displayedFolders.length > 0 && (
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-600" />
              <span>Folders ({displayedFolders.length})</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayedFolders.map((folder) => {
              const fileCount = files.filter(
                (f) => f.folder_id === folder.id || f.folder_id === folder.google_folder_id
              ).length;
              return (
                <div
                  key={folder.id || folder.google_folder_id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/80 hover:bg-indigo-50/40 transition-all group shadow-2xs hover:shadow-xs"
                >
                  <div
                    onClick={() => onSelectFolder(folder.google_folder_id || folder.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-indigo-100/70 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 truncate block group-hover:text-indigo-900 transition-colors" title={folder.name}>
                        {folder.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {fileCount} item{fileCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteFolder(folder)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        {displayedFolders.length > 0 && displayedFiles.length > 0 && (
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Files ({displayedFiles.length})</span>
          </h4>
        )}

        {/* Empty State */}
        {displayedFiles.length === 0 && displayedFolders.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <File className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Files in this Folder</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery
                ? `No items match "${searchQuery}". Try clearing search or filters.`
                : 'Upload files to stream them directly into your connected Google Drives with zero local disk retention.'}
            </p>
            <button
              onClick={onUploadClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
            >
              Upload First File
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Drive Account</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Last Modified</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onPreviewFile(file)}
                  >
                    <td className="py-3 pl-2 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:shadow-xs transition-all shrink-0">
                          {getFileIcon(file.mime_type, file.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="truncate max-w-xs sm:max-w-md font-semibold text-slate-800 block" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block sm:hidden">
                            {formatBytes(file.size_bytes)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        <HardDrive className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[140px]">{file.drive_email}</span>
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-600">{formatBytes(file.size_bytes)}</td>
                    <td className="py-3 text-slate-500">{formatDate(file.modified_time)}</td>
                    <td className="py-3 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onPreviewFile(file)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="In-App Direct Stream Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Stream Direct Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteFile(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete from Google Drive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {displayedFiles.map((file) => {
              const mime = (file.mime_type || '').toLowerCase();
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              const isImg = mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext);
              const isVid = mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);

              return (
                <div
                  key={file.id}
                  onClick={() => onPreviewFile(file)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md bg-white transition-all group flex flex-col justify-between cursor-pointer"
                >
                  {/* Thumbnail / Media Container */}
                  {isImg ? (
                    <div className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden mb-2.5 flex items-center justify-center border border-slate-100">
                      <img
                        src={`/api/files/preview/${file.id}`}
                        alt={file.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-indigo-600 px-2 py-1 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 transition-opacity">
                          <Eye className="w-3 h-3" /> Stream Preview
                        </span>
                      </div>
                    </div>
                  ) : isVid ? (
                    <div className="relative w-full h-32 bg-slate-900 rounded-lg overflow-hidden mb-2.5 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                      <Film className="w-8 h-8 text-rose-400" />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                        Video Stream
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-rose-600 px-2 py-1 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 transition-opacity">
                          <Film className="w-3 h-3" /> Play Video
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-50 border border-slate-100 rounded-lg mb-2.5 flex flex-col items-center justify-center p-3 text-center group-hover:bg-indigo-50/30 transition-colors">
                      <div className="p-3 rounded-xl bg-white shadow-2xs mb-1.5">
                        {getFileIcon(file.mime_type, file.name)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase truncate max-w-full">
                        {file.mime_type?.split('/')[1] || ext || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Info and Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate flex-1" title={file.name}>
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Stream Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteFile(file)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{formatBytes(file.size_bytes)}</span>
                      <span className="truncate max-w-[80px] text-slate-400 text-[10px]" title={file.drive_email}>
                        {file.drive_email.split('@')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
