import { useEffect } from "react";
import './toast.css';

interface ToastProps {
  message: string;
  duration?: number; // Durée en millisecondes (par défaut 3000ms)
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="toast">
      <h2 className="toast-message">{message}</h2>
    </div>
  );
};

export default Toast;
