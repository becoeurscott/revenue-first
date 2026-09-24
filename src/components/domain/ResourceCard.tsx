import { Link } from 'react-router-dom'
import { Bookmark, Calculator, ChevronRight, ClipboardCheck, FileText, MessageSquareText, Map as MapIcon, Wrench } from 'lucide-react'
import type { Resource, ResourceType } from '@/data/types'
import { useApp } from '@/store/useApp'

export const resourceIcons: Record<ResourceType, typeof FileText> = {
  Template: FileText,
  Tool: Wrench,
  Guide: MapIcon,
  Checklist: ClipboardCheck,
  Script: MessageSquareText,
  Calculator: Calculator,
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const saved = useApp((s) => s.savedResources.includes(resource.id))
  const Icon = resourceIcons[resource.type]
  return (
    <Link to={`/resources/${resource.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-300"><Icon className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold">{resource.title}</span>
          {saved && <Bookmark className="size-3.5 shrink-0 fill-current text-brand-300" aria-label="Saved" />}
        </span>
        <span className="block truncate text-xs text-faint">{resource.type} · {resource.minutes} min</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
    </Link>
  )
}
