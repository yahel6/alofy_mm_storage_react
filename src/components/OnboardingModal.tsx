import React, { useState } from 'react';
import './OnboardingModal.css';

interface OnboardingModalProps {
    onClose: () => void;
}

const slides = [
    {
        title: 'ברוכים הבאים ל-Ordo',
        description: 'המערכת המתקדמת לניהול ציוד חכם, כשירויות ופעילויות. בואו נכיר את הכלים שיעזרו לכם לשמור על סדר ומוכנות.',
        icon: '👋',
    },
    {
        title: 'קבוצות (Groups)',
        description: 'הכל מתחיל בקבוצה. ללא שיוך לקבוצה לא ניתן לנהל מחסנים או ציוד. כל קבוצה מנוהלת על ידי מנהלי קבוצה.',
        icon: '👥',
    },
    {
        title: 'מחסנים (Warehouses)',
        description: 'המחסן מאגד בתוכו את הציוד. ניתן להגדיר קטגוריות שונות בכל מחסן, ולבצע מעקב מלא אחר מלאי זמין, מושאל או בתיקון.',
        icon: '🏢',
    },
    {
        title: 'פעילויות ורשמ"צ',
        description: 'בניית רשימת ציוד לפעילות עתידית. ניתן לשייך לפעילות ציוד מתוך המחסן, או ליצור רשימה פשוטה של פריטים חסרים שאינם במלאי.',
        icon: '⛺',
    },
    {
        title: 'ווידוא ציוד (Validation)',
        description: 'כדי לוודא שהציוד אכן תקין ונמצא במקומו, יש לבצע "ווידוא" תקופתי (לרוב אחת ל-7 ימים). ציוד שלא עבר ווידוא יתריע למנהלים.',
        icon: '✅',
    },
    {
        title: 'כשירויות (Competences)',
        description: 'ניהול הסמכות והכשרות של חברי הקבוצה. המערכת תתריע על כשירויות שתוקפן פג או עומד לפוג בקרוב.',
        icon: '🎓',
    }
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const nextStep = () => {
        if (currentStep < slides.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose(); // סיים את המדריך
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <div className="onboarding-overlay active">
            <div className="onboarding-modal">
                {/* כפתור דלג */}
                <button className="onboarding-skip" onClick={onClose}>
                    דלג
                </button>

                {/* תוכן השקף */}
                <div className="onboarding-content">
                    <div className="onboarding-icon">{slides[currentStep].icon}</div>
                    <h2 className="onboarding-title">{slides[currentStep].title}</h2>
                    <p className="onboarding-description">{slides[currentStep].description}</p>
                </div>

                {/* פוטר חלון - כפתורי ניווט ושורת נקודות */}
                <div className="onboarding-footer">
                    <div className="onboarding-dots">
                        {slides.map((_, index) => (
                            <span
                                key={index}
                                className={`onboarding-dot ${index === currentStep ? 'active' : ''}`}
                                onClick={() => setCurrentStep(index)}
                            />
                        ))}
                    </div>

                    <div className="onboarding-actions">
                        <button
                            className="onboarding-btn secondary"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                        >
                            הקודם
                        </button>
                        <button className="onboarding-btn primary" onClick={nextStep}>
                            {currentStep === slides.length - 1 ? 'בואו נתחיל!' : 'הבא'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
