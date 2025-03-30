// components/CustomToaster.tsx
'use client';

import { Toaster, ToastBar, toast } from 'react-hot-toast';

export default function CustomToaster() {
  return (
    <Toaster
    position="top-right"
    toastOptions={{
      success: {
        style: {
          background: 'rgba(115, 235, 185, 0.2)', // Hijau dengan transparansi
          backdropFilter: 'blur(8px)',          // Efek blur untuk tampilan glass
          border: '1px solid rgba(23, 232, 162, 0.4)', // Opsional: garis tepi untuk efek lebih nyata
           // Teks putih agar kontras
        },
      },
      error: {
        style: {
          background: 'rgba(244, 67, 54, 0.2)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(244, 67, 54, 0.4)',
          
        },
      },
    }}
  >
    {(t) => (
      <ToastBar toast={t}>
        {({ icon, message }) => (
          <>
            {icon}
            {message}
            {t.type !== 'loading' && (
              <button onClick={() => toast.dismiss(t.id)}>X</button>
            )}
          </>
        )}
      </ToastBar>
    )}
  </Toaster>
  

  );
}
