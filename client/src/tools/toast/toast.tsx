import { useEffect } from "react";

interface ToastProps {
  message: string;
  duration?: number; // Durée en millisecondes (par défaut 3000ms)
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onClose }) => {
    console.log("toast créé" + message);
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg">
      {message}
    </div>
  );
};

export default Toast;
