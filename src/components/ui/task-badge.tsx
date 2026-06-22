import React from 'react'
import { Badge } from '@/components/ui/badge'

export function TaskPriorityBadge({ priority }: { priority: string }) {
  let colorClass = 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
  if (priority === 'Low') colorClass = 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
  else if (priority === 'Medium') colorClass = 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
  else if (priority === 'High') colorClass = 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
  else if (priority === 'Critical') colorClass = 'bg-red-500/10 text-red-500 hover:bg-red-500/20'

  return <Badge variant="outline" className={`border-0 font-bold ${colorClass}`}>{priority}</Badge>
}

export function TaskStatusBadge({ status }: { status: string }) {
  let colorClass = 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
  
  switch (status) {
    case 'Draft':
      colorClass = 'bg-gray-400/10 text-gray-500 hover:bg-gray-400/20'
      break
    case 'Pending':
      colorClass = 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
      break
    case 'In Progress':
      colorClass = 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20'
      break
    case 'On Hold':
      colorClass = 'bg-red-400/10 text-red-500 hover:bg-red-400/20'
      break
    case 'Review':
      colorClass = 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
      break
    case 'Completed':
      colorClass = 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
      break
    case 'Cancelled':
      colorClass = 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
      break
  }

  return <Badge variant="outline" className={`border-0 font-bold ${colorClass}`}>{status}</Badge>
}
