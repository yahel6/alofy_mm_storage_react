// src/components/OfflineBanner.tsx
import { useOffline } from '../contexts/OfflineContext';
import './OfflineBanner.css';

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default function OfflineBanner() {
    const { isOffline, lastSyncedAt } = useOffline();

    if (!isOffline) return null;

    return (
        <div className="offline-banner" role="alert" aria-live="assertive">
            <div className="offline-banner-content">
                {/* Wi-Fi Off Icon (SVG) */}
                <svg
                    className="offline-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                    <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <circle cx="12" cy="20" r="1" fill="currentColor" />
                </svg>

                <div className="offline-text-group">
                    <span className="offline-title">מצב אופליין — צפייה בלבד</span>
                    <span className="offline-subtitle">לא ניתן לבצע עריכות או שינויים</span>
                    {lastSyncedAt && (
                        <span className="offline-sync-time">
                            מעודכן ל: {formatDate(lastSyncedAt)}
                        </span>
                    )}
                    {!lastSyncedAt && (
                        <span className="offline-sync-time">לא נסנכרן בעבר</span>
                    )}
                </div>
            </div>
        </div>
    );
}
