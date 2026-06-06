// Practice hub surface map — pure data, no React, no store access.
// Grouped by exam skill so the page is scannable (chunking reduces cognitive
// load). `status` names an optional cheap, already-computed cue the page
// attaches at render: 'due' | 'mistakes' | 'readiness'. Keep this the single
// source of truth for what the hub shows; the guard test pins that it covers
// every nav destination. Design: docs/superpowers/specs/2026-05-31-practice-hub-design.md
import {
  BookOpen, Languages, MessageSquare, Trophy, GraduationCap, BookOpenCheck,
  Headphones, PenTool, Mic, FileDown, FileSearch, TreePine, AlertTriangle, Settings,
  PencilLine,
} from 'lucide-react'

export const PRACTICE_GROUPS = [
  {
    heading: 'Speaking',
    items: [
      { path: '/roleplay', label: 'Roleplay', icon: MessageSquare },
      { path: '/speaking', label: 'Speaking', icon: Mic },
      { path: '/cikgu', label: 'Cikgu Maya', icon: GraduationCap },
    ],
  },
  {
    heading: 'Writing',
    items: [
      { path: '/writing', label: 'Writing', icon: PenTool },
      { path: '/mistakes', label: 'Mistakes', icon: AlertTriangle, status: 'mistakes' },
    ],
  },
  {
    heading: 'Reading & Listening',
    items: [
      { path: '/comprehension', label: 'Comprehension', icon: BookOpenCheck },
      { path: '/listening', label: 'Listening', icon: Headphones },
      { path: '/pdf-reader', label: 'PDF Reader', icon: FileSearch },
    ],
  },
  {
    heading: 'Grammar & Vocab',
    items: [
      { path: '/grammar', label: 'Grammar', icon: Languages },
      { path: '/word-families', label: 'Word Families', icon: TreePine },
      { path: '/saved-cloze', label: 'Saved Words', icon: PencilLine, status: 'saved' },
    ],
  },
  {
    heading: 'Review',
    items: [
      { path: '/study', label: 'Study', icon: BookOpen, status: 'due' },
      { path: '/exam-rehearsal', label: 'Exam Rehearsal', icon: Trophy, status: 'readiness' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { path: '/import', label: 'Import Text', icon: FileDown },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

// Flat list of every path on the hub — used by the guard test and any caller
// that needs the full set.
export function allPracticePaths() {
  return PRACTICE_GROUPS.flatMap(g => g.items.map(i => i.path))
}
