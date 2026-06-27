import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Note, NoteIndexEntry, Workspace, Tag, TrashNoteEntry } from '../types'
import { type SortBy, isExpiringSoon } from '../lib/notes'
import { truncate, formatDate } from '../lib/format'
import { COLOR_HEX } from '../lib/constants'

// 笔记筛选类型：draft=草稿，pin=收藏
export type NoteFilter = 'draft' | 'pin'

/**
 * NotesPanel 组件 Props 接口
 *
 * 设计原则：纯展示组件（Presentational Component）
 * - 所有状态（state）由父组件 App.tsx 持有，通过 props 传入
 * - 所有事件处理函数（handlers）由父组件通过 useCallback 定义，通过 props 传入
 * - 组件本身不持有任何业务状态，只负责 UI 渲染和事件转发
 *
 * 字段分组：
 *   1. 工作区侧边栏（workspaces / selectedWorkspaceId / 上下文菜单）
 *   2. 笔记列表右键菜单
 *   3. 笔记列表（notes / search / sort / filter / 列表项交互）
 *   4. 回收站视图（trashNotes / 恢复 / 永久删除 / 清空）
 *   5. 标签管理（当前笔记的标签添加/移除/自动补全）
 */
interface NotesPanelProps {
  // === 工作区侧边栏 ===
  workspaces: Workspace[]
  selectedWorkspaceId: string
  onSelectWorkspace: (id: string) => void
  showNewWorkspace: boolean
  onToggleNewWorkspace: () => void
  newWorkspaceName: string
  newWorkspaceIcon: string
  onNewWorkspaceNameChange: (name: string) => void
  onNewWorkspaceIconChange: (icon: string) => void
  onCreateWorkspace: () => void
  onWorkspaceContextMenu: (e: React.MouseEvent, ws: Workspace) => void
  workspaceContextMenu: { wsId: string; wsName: string; x: number; y: number } | null
  onCloseWorkspaceContextMenu: () => void
  onDeleteWorkspace: (wsId: string, wsName: string) => void
  showTrashView: boolean
  onToggleTrash: () => void

  // === 笔记列表右键菜单 ===
  noteContextMenu: { entry: NoteIndexEntry; x: number; y: number } | null
  onCloseNoteContextMenu: () => void
  onTogglePinFromMenu: (entry: NoteIndexEntry) => void
  onDeleteNoteFromMenu: (entry: NoteIndexEntry) => void
  // 移动笔记到工作区
  onMoveNoteToWorkspace: (noteId: string, workspaceId: string) => void

  // === 笔记列表 ===
  notes: NoteIndexEntry[]
  searchKeyword: string
  onSearchChange: (value: string) => void
  sortBy: SortBy
  onSortChange: (sortBy: SortBy) => void
  noteFilter: NoteFilter
  onNoteFilterChange: (filter: NoteFilter) => void
  currentNoteId: string | null
  onSelectNote: (id: string) => void
  onNoteContextMenu: (e: React.MouseEvent, entry: NoteIndexEntry) => void
  onNoteListKeyDown: (e: React.KeyboardEvent, index: number) => void
  onDeleteNote: (id: string, e: React.MouseEvent) => void
  onClearAllDrafts: () => void
  tags: Tag[] // 用于笔记列表项的标签徽章名称查找
  // 按标签筛选
  filterTagId: string
  onFilterTagChange: (tagId: string) => void

  // === 回收站 ===
  trashNotes: TrashNoteEntry[]
  onRestoreNote: (id: string, e: React.MouseEvent) => void
  onPermanentDelete: (id: string, e: React.MouseEvent) => void
  onEmptyTrash: () => void

  // === 标签管理（当前笔记） ===
  currentNote: Note | null
  currentNoteTags: Tag[]
  tagInput: string
  showTagSuggest: boolean
  tagSuggestions: Tag[]
  onTagInputChange: (value: string) => void
  onTagInputFocus: () => void
  onTagInputBlur: () => void
  onTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onAddTag: (name: string) => void
  onRemoveTag: (tagId: string) => void
}

/**
 * 笔记列表面板组件
 *
 * 包含两大区域：
 *   1. 工作区侧边栏（workspace-sidebar）：全部工作区按钮 + 工作区列表 + 新建 + 回收站
 *      - 工作区右键菜单（删除工作区）通过 Portal 渲染到 document.body
 *      - 笔记右键菜单（置顶/收藏/删除）通过 Portal 渲染到 document.body
 *   2. 笔记主区（notes-main）：搜索 + 排序 + 草稿/收藏切换 + 标签管理 + 列表/回收站视图
 *
 * 该组件从 App.tsx L1740-L2065 迁移而来，保持 JSX 结构完全一致，
 * 仅将 state 和 handler 改为通过 props 接收。
 */
export function NotesPanel(props: NotesPanelProps) {
  const { t, i18n } = useTranslation()
  // 标签输入框按需出现：仅在用户点击"+标签"按钮时显示，添加完成或失焦后消失
  const [showTagInput, setShowTagInput] = useState(false)
  // 右键菜单"移动到工作区"子菜单展开状态（纯 UI 状态，内部管理）
  const [noteContextMenuSubmenu, setNoteContextMenuSubmenu] = useState<'none' | 'moveToWorkspace'>('none')
  // 关闭右键菜单时同时重置子菜单状态
  const handleCloseNoteContextMenu = () => {
    setNoteContextMenuSubmenu('none')
    props.onCloseNoteContextMenu()
  }

  return (
    <div className="panel notes-panel">
      {/* 工作区侧边栏 */}
      <div className="workspace-sidebar">
        <button
          className={`workspace-item ${props.selectedWorkspaceId === '' ? 'active' : ''}`}
          onClick={() => props.onSelectWorkspace('')}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('drag-over')
            const noteId = e.dataTransfer.getData('text/note-id')
            if (noteId) props.onMoveNoteToWorkspace(noteId, '')
          }}
          title={t('workspace.all')}
          aria-label={t('workspace.all')}
        >
          <span className="workspace-icon">🗂️</span>
        </button>
        {props.workspaces.map(ws => (
          <button
            key={ws.id}
            className={`workspace-item ${props.selectedWorkspaceId === ws.id ? 'active' : ''}`}
            onClick={() => props.onSelectWorkspace(ws.id)}
            onContextMenu={(e) => props.onWorkspaceContextMenu(e, ws)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('drag-over')
              const noteId = e.dataTransfer.getData('text/note-id')
              if (noteId) props.onMoveNoteToWorkspace(noteId, ws.id)
            }}
            title={ws.name}
          >
            <span className="workspace-icon">{ws.icon}</span>
          </button>
        ))}
        <button
          className="workspace-item workspace-add"
          onClick={props.onToggleNewWorkspace}
          title={t('workspace.add')}
          aria-label={t('workspace.add')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className={`workspace-item workspace-trash ${props.showTrashView ? 'active' : ''}`}
          onClick={props.onToggleTrash}
          title={t('trash.title')}
          aria-label={t('trash.title')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
        {props.showNewWorkspace && (
          <div className="workspace-create-form">
            <input
              className="workspace-icon-input"
              value={props.newWorkspaceIcon}
              onChange={(e) => props.onNewWorkspaceIconChange(e.target.value)}
              maxLength={2}
              placeholder={t('workspace.iconPlaceholder')}
            />
            <input
              className="workspace-name-input"
              value={props.newWorkspaceName}
              onChange={(e) => props.onNewWorkspaceNameChange(e.target.value)}
              placeholder={t('workspace.namePlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && props.onCreateWorkspace()}
              autoFocus
            />
            <button className="workspace-create-btn" onClick={props.onCreateWorkspace}>
              {t('workspace.create')}
            </button>
          </div>
        )}
        {/* 工作区右键菜单：通过 Portal 渲染到 document.body，避免 main-area 的 zoom 干扰 fixed 定位 */}
        {props.workspaceContextMenu && createPortal(
          <>
            <div
              className="popover-backdrop"
              onClick={props.onCloseWorkspaceContextMenu}
              onContextMenu={(e) => { e.preventDefault(); props.onCloseWorkspaceContextMenu() }}
            />
            <div
              className="workspace-context-menu"
              style={{ left: props.workspaceContextMenu.x, top: props.workspaceContextMenu.y }}
            >
              <button
                className="context-menu-item context-menu-danger"
                onClick={() => props.onDeleteWorkspace(props.workspaceContextMenu!.wsId, props.workspaceContextMenu!.wsName)}
              >
                {t('workspace.delete', '删除工作区')}
              </button>
            </div>
          </>,
          document.body
        )}
        {/* 笔记列表右键菜单：通过 Portal 渲染到 document.body */}
        {props.noteContextMenu && createPortal(
          <>
            <div
              className="popover-backdrop"
              onClick={handleCloseNoteContextMenu}
              onContextMenu={(e) => { e.preventDefault(); handleCloseNoteContextMenu() }}
            />
            <div
              className="workspace-context-menu"
              style={{ left: props.noteContextMenu.x, top: props.noteContextMenu.y }}
            >
              <button
                className="context-menu-item"
                onClick={() => props.onTogglePinFromMenu(props.noteContextMenu!.entry)}
              >
                {props.noteContextMenu.entry.type === 'draft'
                  ? t('notes.favorite', '收藏')
                  : props.noteContextMenu.entry.pinned === true
                    ? t('notes.unpin', '取消置顶')
                    : t('notes.pin', '置顶')}
              </button>
              <button
                className="context-menu-item"
                onMouseEnter={() => setNoteContextMenuSubmenu('moveToWorkspace')}
              >
                {t('workspace.moveTo')} ▸
              </button>
              {noteContextMenuSubmenu === 'moveToWorkspace' && (
                <div className="context-submenu">
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      props.onMoveNoteToWorkspace(props.noteContextMenu!.entry.id, '')
                      handleCloseNoteContextMenu()
                    }}
                  >
                    {t('workspace.defaultWorkspaceAll')}
                  </button>
                  {props.workspaces.map(ws => (
                    <button
                      key={ws.id}
                      className="context-menu-item"
                      onClick={() => {
                        props.onMoveNoteToWorkspace(props.noteContextMenu!.entry.id, ws.id)
                        handleCloseNoteContextMenu()
                      }}
                    >
                      {ws.icon} {ws.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="context-menu-item context-menu-danger"
                onClick={() => props.onDeleteNoteFromMenu(props.noteContextMenu!.entry)}
              >
                {t('notes.delete')}
              </button>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* 笔记主区：搜索 + 排序 + 草稿/收藏切换 + 列表 */}
      <div className="notes-main">
        <div className="notes-header">
          <h3>{t('notes.title')}</h3>
          <div className="notes-toolbar">
            <input
              className="notes-search"
              type="text"
              value={props.searchKeyword}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder={t('notes.searchPlaceholder')}
            />
            <select
              className="notes-sort"
              value={props.sortBy}
              onChange={(e) => props.onSortChange(e.target.value as SortBy)}
            >
              <option value="updated">{t('notes.sortUpdated')}</option>
              <option value="title">{t('notes.sortTitle')}</option>
              <option value="color">{t('notes.sortColor')}</option>
            </select>
          </div>
          <div className="notes-tabs">
            <button
              className={`notes-tab ${props.noteFilter === 'draft' ? 'active' : ''}`}
              onClick={() => props.onNoteFilterChange('draft')}
            >
              {t('notes.tabDraft')}
            </button>
            <button
              className={`notes-tab ${props.noteFilter === 'pin' ? 'active' : ''}`}
              onClick={() => props.onNoteFilterChange('pin')}
            >
              {t('notes.tabPin')}
            </button>
          </div>
          {/* 标签筛选条：显示所有标签，点击筛选，再次点击取消 */}
          {props.tags.length > 0 && !props.showTrashView && (
            <div className="notes-filter-tags">
              {props.tags.map(tag => (
                <button
                  key={tag.id}
                  className={`filter-tag-chip ${props.filterTagId === tag.id ? 'active' : ''}`}
                  onClick={() => props.onFilterTagChange(props.filterTagId === tag.id ? '' : tag.id)}
                  title={t('tag.filterBy', { name: tag.name })}
                >
                  <span className="filter-tag-dot" style={{ background: tag.color }} />
                  {tag.name}
                  {tag.usageCount > 0 && <span className="filter-tag-count">{tag.usageCount}</span>}
                </button>
              ))}
            </div>
          )}
          {/* 当前笔记标签管理（仅当选中笔记时显示） */}
          {props.currentNote && (
            <div className="notes-tag-section">
              <div className="notes-tag-badges">
                {props.currentNoteTags.map(tag => (
                  <span key={tag.id} className="tag-badge">
                    {tag.name}
                    <button className="tag-badge-remove" onClick={() => props.onRemoveTag(tag.id)}>&times;</button>
                  </span>
                ))}
                {/* +标签按钮：点击后显示输入框 */}
                {!showTagInput && (
                  <button
                    className="tag-add-btn"
                    onClick={() => setShowTagInput(true)}
                    title={t('tag.addTag')}
                  >
                    {t('tag.addTag')}
                  </button>
                )}
              </div>
              {/* 标签输入框按需出现：点击+标签按钮后显示，添加完成或失焦后消失 */}
              {showTagInput && (
                <div className="tag-input-wrap">
                  <input
                    className="tag-input"
                    type="text"
                    value={props.tagInput}
                    onChange={(e) => props.onTagInputChange(e.target.value)}
                    onFocus={props.onTagInputFocus}
                    onBlur={() => {
                      props.onTagInputBlur()
                      // 延迟隐藏输入框，等待点击建议项完成
                      setTimeout(() => setShowTagInput(false), 200)
                    }}
                    onKeyDown={(e) => {
                      props.onTagInputKeyDown(e)
                      // 回车添加标签后隐藏输入框
                      if (e.key === 'Enter') {
                        setTimeout(() => setShowTagInput(false), 100)
                      }
                      // Escape 隐藏输入框
                      if (e.key === 'Escape') {
                        setShowTagInput(false)
                      }
                    }}
                    placeholder={t('editor.tagPlaceholder')}
                    autoFocus
                  />
                  {props.showTagSuggest && (
                    <div className="tag-suggestions">
                      {props.tagSuggestions.map(tg => (
                        <div key={tg.id} className="tag-suggestion-item" onMouseDown={() => {
                          props.onAddTag(tg.name)
                          setShowTagInput(false)
                        }}>
                          {tg.name}
                        </div>
                      ))}
                      {props.tagInput.trim() && !props.tags.some(tg => tg.name.toLowerCase() === props.tagInput.trim().toLowerCase()) && (
                        <div className="tag-suggestion-item tag-create" onMouseDown={() => {
                          props.onAddTag(props.tagInput)
                          setShowTagInput(false)
                        }}>
                          {t('tag.create')} &ldquo;{props.tagInput.trim()}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="panel-content notes-content">
          {props.showTrashView ? (
            // 回收站视图：显示已删除的笔记，支持恢复和永久删除
            <>
              {props.trashNotes.length > 0 && (
                <div className="trash-toolbar">
                  <button className="btn btn-empty-trash" onClick={props.onEmptyTrash}>
                    {t('trash.emptyTrash')}
                  </button>
                </div>
              )}
              {props.trashNotes.length === 0 ? (
                <div className="empty-message">{t('trash.empty')}</div>
              ) : (
                props.trashNotes.map(entry => {
                  // 计算剩余小时数
                  const expiresTime = new Date(entry.expiresAt).getTime()
                  const hoursLeft = Math.max(0, Math.ceil((expiresTime - Date.now()) / (60 * 60 * 1000)))
                  return (
                    <div key={entry.id} className="note-item trash-item">
                      {entry.color !== 'default' && (
                        <div className="note-color-bar" style={{ background: COLOR_HEX[entry.color] }} />
                      )}
                      <div className="note-item-body">
                        <div className="note-item-title">
                          {truncate(entry.title || t('notes.untitled'), 60)}
                        </div>
                        <div className="note-item-footer">
                          <span className="note-item-date">{formatDate(entry.deletedAt, i18n.language)}</span>
                          <span className="trash-expires">{t('trash.expiresIn', { hours: hoursLeft })}</span>
                        </div>
                      </div>
                      <div className="trash-actions">
                        <button
                          className="btn-icon btn-restore"
                          onClick={(e) => props.onRestoreNote(entry.id, e)}
                          title={t('trash.restore')}
                          aria-label={t('trash.restore')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-permanent-delete"
                          onClick={(e) => props.onPermanentDelete(entry.id, e)}
                          title={t('trash.permanentDelete')}
                          aria-label={t('trash.permanentDelete')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          ) : (
            // 普通笔记视图（草稿/收藏）
            <>
              {props.notes.length === 0 ? (
                <div className="empty-message">
                  {props.searchKeyword ? t('notes.emptySearch') : t('notes.empty')}
                </div>
              ) : (
                props.notes.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`note-item ${props.currentNoteId === entry.id ? 'selected' : ''} ${entry.pinned === true ? 'pinned' : ''}`}
                    onClick={() => props.onSelectNote(entry.id)}
                    onContextMenu={(e) => props.onNoteContextMenu(e, entry)}
                    onKeyDown={(e) => props.onNoteListKeyDown(e, index)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/note-id', entry.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    draggable
                    tabIndex={0}
                    role="button"
                  >
                    {entry.color !== 'default' && (
                      <div className="note-color-bar" style={{ background: COLOR_HEX[entry.color] }} />
                    )}
                    <div className="note-item-body">
                      <div className="note-item-title">
                        {entry.pinned === true && <span className="note-pin-icon" aria-label={t('notes.pin', '置顶')}>📌</span>}
                        {truncate(entry.title || t('notes.untitled'), 60)}
                      </div>
                      <div className="note-item-footer">
                        <span className="note-item-date">{formatDate(entry.updatedAt, i18n.language)}</span>
                        <div className="note-item-tags">
                          {entry.tags.slice(0, 3).map(tagId => {
                            const tag = props.tags.find(tg => tg.id === tagId)
                            return tag ? (
                              <span key={tagId} className="note-tag-badge">{tag.name}</span>
                            ) : null
                          })}
                        </div>
                        {isExpiringSoon(entry) && (
                          <span className="note-expiring">{t('notes.expiringSoon')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="note-delete-btn"
                      onClick={(e) => props.onDeleteNote(entry.id, e)}
                      title={t('notes.delete')}
                      aria-label={t('notes.delete')}
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
              {/* 草稿列表底部：清空草稿按钮（仅草稿 tab 且有草稿时显示） */}
              {props.noteFilter === 'draft' && props.notes.length > 0 && (
                <div className="notes-footer">
                  <button className="btn btn-clear-drafts" onClick={props.onClearAllDrafts}>
                    {t('notes.clearAllDrafts')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
