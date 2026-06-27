import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center space-y-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-10 h-10 text-primary" />
        </div>

        <div>
          <p className="text-8xl font-black text-gradient">404</p>
          <h1 className="text-2xl font-bold text-foreground mt-2">Page not found</h1>
          <p className="text-muted-foreground mt-1">
            This route is rate limited to 0 requests. Even by you.
          </p>
        </div>

        <Button asChild>
          <Link to="/dashboard">
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  )
}
