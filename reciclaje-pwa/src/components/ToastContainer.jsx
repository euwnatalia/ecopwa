import { useState, useCallback } from 'react';
import Toast from './Toast.jsx';

let toastId = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Exponer la función globalmente
  window.showToast = showToast;

  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            position: 'fixed',
            top: `${2 + index * 5}rem`,
            right: '2rem',
            zIndex: 9999 - index
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

