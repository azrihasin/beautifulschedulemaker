import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { useTimetableStore } from '@/stores/timetableStore'
import { RefreshCw, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'


export function UserAvatar() {
  const [initials, setInitials] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshFromDatabase } = useTimetableStore()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        
        // Set user name (use email prefix if no display name)
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0]
        setUserName(displayName)
        
        const emailInitials = user.email
          .split('@')[0]
          .substring(0, 2)
          .toUpperCase()
        setInitials(emailInitials)
        
        // Generate consistent color based on email
        const hash = user.email.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        const hue = Math.abs(hash) % 360
        setBgColor(`linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 60}, 70%, 50%))`)
      }
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      // Clear any local state
      setInitials('')
      setBgColor('')
      // Force a full page refresh to ensure all state is cleared
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleSync = async () => {
    if (!refreshFromDatabase || isSyncing) return
    
    setIsSyncing(true)
    try {
      const success: any = await refreshFromDatabase()
      if (success) {
        toast.success('Data synced successfully')
      } else {
        // Handle authentication error gracefully
        toast.error('Please login to sync data')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Failed to sync data')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="w-full p-3 flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className={cn(
            "flex items-center gap-3 cursor-pointer flex-1",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "transition-colors duration-200 ease-in-out rounded-md p-2 -m-2",
            "focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2"
          )}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback 
                style={{ background: bgColor }}
                className="text-white font-medium text-sm"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userName || 'shadcn'}
              </p>
              <p className="text-xs text-sidebar-muted-foreground truncate">
                {userEmail || 'm@example.com'}
              </p>
            </div>
          </div>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  )
}