'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      // Force a full page refresh to ensure all state is cleared
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      window.location.href = '/'
    }
  }

  return <Button onClick={logout}>Logout</Button>
}
