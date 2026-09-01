'use client';

import { ReactNode } from 'react';
import useCopyProtection from '@/hooks/use-copy-protection';
import { useAuth } from '@/hooks/use-auth';

interface ContentProtectionProviderProps {
  children: ReactNode;
}

export default function ContentProtectionProvider({ children }: ContentProtectionProviderProps) {
  // The role comes from the verified session (`AuthProvider` establishes it from
  // the signed cookie via /api/auth/me), not from the `kairali_user` localStorage
  // key, which is a write-only compatibility cache anyone with devtools can edit
  // (matrix M8, rollout step 12). This component sits inside `AuthProvider` in
  // `app/layout.tsx`, so the context is always available here.
  //
  // The read-and-parse effect it replaces produced the same value for an
  // untampered cache and left `userRole` null while it ran; `user` is likewise
  // null until the bootstrap settles, so the loading window is unchanged.
  const { user } = useAuth();

  // ✅ Check if user is super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Apply protection only if NOT super_admin
  useCopyProtection(
    isSuperAdmin
      ? {
          // 🔓 No protection for super_admin
          disableRightClick: false,
          disableCopy: false,
          disableCut: false,
          enablePaste: true,
          disableTextSelection: false,
          disableDevTools: false,
          disablePrint: false,
          showAlert: false,
        }
      : {
          // 🔓 Normal browser behavior for other users
          disableRightClick: false,
          disableCopy: false,
          disableCut: false,
          enablePaste: true,
          disableTextSelection: false,
          disableDevTools: false,
          disablePrint: false,
          showAlert: false,
          onAttempt: () => {},
        }
  );

  return <>{children}</>;
}
