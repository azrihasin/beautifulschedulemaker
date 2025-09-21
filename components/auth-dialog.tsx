import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { LoginForm } from './login-form';
import { SignUpForm } from './sign-up-form';

export default function AuthDialog({ isOpen, onClose, courseId }: any) {
    const [isLoginView, setIsLoginView] = useState(true);
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px] min-h-[55vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold">
              {isLoginView ? 'Welcome Back' : 'Create Account'}
            </DialogTitle>
          </DialogHeader>
          {isLoginView ? (
            <>
              <LoginForm setClose={onClose} />
              <div className="mt-4 text-center text-sm">
                Don't have an account?{' '}
                <button 
                  onClick={() => setIsLoginView(false)}
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                >
                  Sign up
                </button>
              </div>
            </>
          ) : (
            <>
              <SignUpForm setClose={onClose} />
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <button 
                  onClick={() => setIsLoginView(true)}
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                >
                  Login
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }