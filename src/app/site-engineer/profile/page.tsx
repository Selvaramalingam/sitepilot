'use client'

import React from 'react'
import { ProfilePageClient } from '@/components/profile-page-client'

export default function SiteEngineerProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            My Profile
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your Site Engineer account credentials and login configurations.
          </p>
        </div>
      </div>

      <ProfilePageClient role="SITE_ENGINEER" />
    </div>
  )
}
