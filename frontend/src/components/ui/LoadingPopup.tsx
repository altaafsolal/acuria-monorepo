import { FiLoader } from 'react-icons/fi';
import './LoadingPopup.css';

interface LoadingPopupProps {
  show: boolean;
  title: string;
  message?: string;
}

export default function LoadingPopup({ show, title, message }: LoadingPopupProps) {
  if (!show) return null;

  return (
    <div className="loading-popup-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-popup-card">
        <FiLoader className="loading-popup-icon spin" aria-hidden="true" />
        <h2>{title}</h2>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
