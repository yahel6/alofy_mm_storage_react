import React from 'react';
import { TourProvider, type StepType } from '@reactour/tour';

import { useUI } from '../contexts/UIContext';
import { useDatabase } from '../contexts/DatabaseContext';

// Helper component for rich text formatting
const TourContent = ({ title, content, setIsOpen, isFinalStep }: { title: string; content: React.ReactNode; setIsOpen: (val: boolean) => void; isFinalStep?: boolean }) => {
    const { setShouldHighlightProfile, setHasCompletedOnboarding } = useUI();
    const { currentUser } = useDatabase();

    const handleClose = () => {
        setIsOpen(false);
        if (isFinalStep) {
            setHasCompletedOnboarding(true);
            if (currentUser) {
                localStorage.setItem(`ordo_onboarding_shown_${currentUser.uid}`, 'true');
            }
            setShouldHighlightProfile(true);
        }
    };

    return (
        <div style={{
            padding: '8px 0',
            lineHeight: '1.6',
            fontSize: '1rem',
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* כפתור דילוג הוסר כדי להפוך את המדריך לחובה */}
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--accent-blue)', fontSize: '1.4rem', fontWeight: 600 }}>{title}</h3>
            <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{content}</div>
            {isFinalStep && (
                <button
                    onClick={handleClose}
                    style={{
                        marginTop: 'auto',
                        width: '100%',
                        padding: '16px',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0,123,255,0.3)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    סגור
                </button>
            )}
        </div>
    );
};

const steps: StepType[] = [
    {
        selector: '.welcome-section', // Centered on the welcome text
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="ברוכים הבאים ל-Ordo!"
                content="המערכת לניהול ציוד חכם, כשירויות ופעילויות. באמצעות Ordo תוכלו לשמור על סדר במחסן שלכם, לעקוב אחר כשירות אמצעים, ווידוא ציוד, כשירות לוחמים ועוד. דרך מערכת זו תוכלו לקחת צעד קדימה בשגרה היומיומית של הצוות ולהקל על חייכם בפרטים הקטנים ביותר!"
            />
        ),
    },
    {
        selector: '[data-tour="profile-btn"]',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="פרופיל אישי"
                content={<>
                    <p style={{ margin: '0 0 10px 0' }}>כאן נמצא הפרופיל האישי שלך. דבר ראשון הקלד את השם בו תופיע לשאר המשתמשים במערכת. משם גם תוכל לבקש להצטרף לאחת הקבוצות הקיימות.</p>
                    <p style={{ margin: 0 }}>בנוסף, מומלץ להוריד את האפליקציה למסך הבית לחווית משתמש טובה.</p>
                </>}
            />
        ),
    },
    {
        selector: '[data-tour="profile-btn"]',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="קבוצות"
                content="הכל מתחיל בקבוצה. בכדי להשתמש במערכת עליכם להשתייך לפחות לקבוצה אחת (בדומה לקבוצת וואצאפ). מכיוון שזו הפעם הראשונה שלכם, עליכם להיכנס לפרופיל ולבקש להצטרף לקבוצה קיימת או ליצור אחת חדשה. רק לאחר שתהיו חברים בקבוצה, המחסנים, הפעילויות והכשירויות שלכם יהיו זמינים עבורכם."
            />
        ),
    },
    {
        selector: '[data-tour="warehouses-nav"]',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="מחסנים"
                content={`הלב הפועם של הציוד שלכם. כל קבוצה יכולה לנהל מספר מחסנים במקביל. כאן תוכלו להוסיף ציוד, לקטלג אותו לפי קטגוריות (למשל ציוד קידוחים), להקצות לו רשמ"צ פנימי, לעקוב מה הסטטוס שלו ומתי ווידאו אותו לאחרונה ולמנות אחראי על הפריט הספציפי.`}
            />
        ),
    },
    {
        selector: '[data-tour="activities-nav"]',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="פעילויות"
                content={<>
                    <p style={{ margin: '0 0 10px 0' }}>אזור הפעילויות מאפשר לכם להכין רשמ"צ לפעילות ספציפית אליה אתם יוצאים.</p>
                    <p style={{ margin: 0 }}>תוכלו לשייך ציוד מתוך המחסן אל הפעילות ולבצע 'Check-out' מסודר (שיעדכן את סטטוס הציוד במחסן). לחלופין, מצב רשמ״צ פשוט מאפשר לכם להקליד במהירות רשימת פריטים, ללא קשר למלאי הקיים, לשם התארגנות מהירה.</p>
                </>}
            />
        ),
    },
    {
        selector: '#attention-card',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="ווידוא ציוד"
                content="כדי להיות בבקרה על כשירות האמצעים שלנו עלינו לוודא אותם מדי פעם. באמצעות המערכת תוכלו להגדיר לכל פריט 'זמן ווידוא' משלו (לדוגמה: כל 7, 30 או 60 ימים), והמערכת תתריע לאחראי על הפריט בנוסף למחסן כאשר נדרש לעשות ווידוא ציוד חוזר."
            />
        ),
    },
    {
        selector: '[data-tour="competences-nav"]',
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                title="כשירויות"
                content="כלוחמים מקצועיים נדרש מאיתנו להיות בכשירות גם בעצמנו, לכן דרך המערכת ניתן ליצור כשירויות לקבוצה (לדוגמא ירי יום, רפואה, הטסת רחפן, הפעלת דובה...). המערכת מאפשרת הזנת תאריכי תפוגה שונים לכשירויות, ותנהל מעקב אחרי כלל הכשירויות של הקבוצה דרך שיטת ציון (כל יום שעובר מפג תוקף הכשירות יורד 5 נקודות) בנוסף היא תתריע ללוחם כאשר הוא צריך לחדש את הכשירות שלו."
            />
        ),
    },
    {
        selector: '.welcome-section', // Back to center for summary
        position: 'center',
        content: ({ setIsOpen }: any) => (
            <TourContent
                setIsOpen={setIsOpen}
                isFinalStep={true}
                title="יוצאים לדרך!"
                content={<>
                    <p style={{ margin: '0 0 10px 0' }}>וזהו, אתם מוכנים להשתמש במערכת Ordo!</p>
                    <p style={{ margin: '0 0 10px 0' }}>צאו לגלות את כל הפיצ'רים הנוספים שלא דיברנו עליהם והכי חשוב, אם יש לכם רעיונות לשיפור או סתם משוב תוכלו לכתוב הודעה ונשפר את המערכת בהקדם, בהבטחה!</p>
                    <p style={{ margin: 0 }}>אז יאללה צאו ליצור את הקבוצה החדשה שלכם או הצטרפו לקבוצה קיימת.</p>
                </>}
            />
        ),
    }
];

// Dark premium theme styles for the tour popup
const styles = {
    popover: (base: any) => ({
        ...base,
        backgroundColor: 'rgba(30,30,35,0.98)',
        backdropFilter: 'blur(12px)',
        color: 'var(--text-primary)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        padding: '44px 28px 28px 28px',
        direction: 'rtl',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '420px',
        width: '90vw',
        height: '450px', // Increased slightly for better fit
        zIndex: 1000002,
        display: 'flex',
        flexDirection: 'column',
    }),
    controls: (base: any) => ({
        ...base,
        marginTop: 'auto', // Push navigation to the absolute bottom
        paddingBottom: '10px',
    }),
    dot: (base: any, state?: any) => {
        const current = state?.current || false;
        return {
            ...base,
            backgroundColor: current ? 'var(--accent-blue)' : 'rgba(255,255,255,0.2)',
            width: current ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            transition: 'all 0.3s ease',
        };
    },
    close: (base: any) => ({
        ...base,
        display: 'none', // Hide default close in favor of our skip button
    }),
    arrow: (base: any) => ({
        ...base,
        color: 'white',
        width: '40px',
        height: '40px',
        padding: '12px',
        transition: 'transform 0.2s ease',
    }),
    badge: (base: any) => ({
        ...base,
        display: 'none',
    }),
    maskArea: (base: any) => ({
        ...base,
        rx: 12,
    }),
};

interface TourProviderWrapperProps {
    children: React.ReactNode;
}

const TourProviderWrapper: React.FC<TourProviderWrapperProps> = ({ children }) => {
    return (
        <TourProvider
            steps={steps}
            styles={styles}
            showPrevNextButtons={true}
            showCloseButton={true}
            showBadge={false}
            rtl={true}
            maskClassName="tour-mask-custom"
            onClickMask={() => { }} // Disables clicking outside to close
        >
            {children}
        </TourProvider>
    );
};

export default TourProviderWrapper;
