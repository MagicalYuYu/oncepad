import { useEffect, useRef } from 'react'
import type { Note, NoteFormat } from '../types'
import { DRAFT_TTL_MS } from '../lib/notes'

interface FileInfo {
  filePath: string
  fileName: string
}

interface UseAutoSaveParams {
  text: string
  fileInfo: FileInfo | null
  currentNote: Note | null
  selectedWorkspaceId: string
  editorFormat: NoteFormat
  saveCurrentNote: () => Promise<void>
}

/**
 * 自动保存 Hook
 * 1. 定时自动保存：text 变化后 2 秒无操作自动保存（防抖）
 * 2. 关闭前强制保存：监听 beforeunload 事件，同步保存当前笔记
 * 3. 组件卸载时清理定时器
 */
export function useAutoSave({
  text,
  fileInfo,
  currentNote,
  selectedWorkspaceId,
  editorFormat,
  saveCurrentNote,
}: UseAutoSaveParams) {
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // === 定时自动保存：text 变化后 2 秒无操作自动保存（防抖） ===
  // 避免用户编辑后忘记保存或关闭窗口导致内容丢失
  useEffect(() => {
    // 文件模式下不自动保存为笔记（文件模式有独立的 Ctrl+S 保存到文件）
    if (fileInfo) return
    // 无内容不保存
    if (!text.trim()) return
    // 清除上一次定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    // 2 秒后自动保存
    autoSaveTimerRef.current = setTimeout(() => {
      saveCurrentNote()
      autoSaveTimerRef.current = null
    }, 2000)
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [text, fileInfo, saveCurrentNote])

  // === 关闭前强制保存：监听窗口 beforeunload，同步保存当前笔记 ===
  // 注意：beforeunload 在 Electron 中关闭窗口时触发，此时需要同步保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 文件模式下不保存为笔记
      if (fileInfo) return
      // 无内容不保存
      if (!text.trim()) return
      // 同步保存：使用 IPC 同步调用（避免异步未完成窗口已关闭）
      try {
        const trimmed = text.trim()
        if (!trimmed) return
        const now = new Date()
        if (currentNote) {
          const newTitle = trimmed.split('\n')[0].slice(0, 100)
          if (text === currentNote.content && newTitle === currentNote.title) return
          const updated: Note = {
            ...currentNote,
            title: newTitle,
            content: text,
            updatedAt: now.toISOString(),
          }
          window.electronAPI.saveNote(updated)
        } else {
          const newNote: Note = {
            id: crypto.randomUUID(),
            title: trimmed.split('\n')[0].slice(0, 100),
            content: text,
            type: 'draft',
            tags: [],
            color: 'default',
            workspace: selectedWorkspaceId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
            format: editorFormat,
          }
          window.electronAPI.saveNote(newNote)
        }
      } catch {}
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [text, currentNote, fileInfo, selectedWorkspaceId, editorFormat])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [])
}
