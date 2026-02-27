import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
    return (
        <div className="loading-screen-container">
            <div className="loading-logo-container">
                <img src="/ordo-logo.png" alt="Ordo Logo" className="loading-logo pulse-animation" />
            </div>
            {message && <div className="loading-message">{message}</div>}
        </div>
    );
};

export default LoadingScreen;
