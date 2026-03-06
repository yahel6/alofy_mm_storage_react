import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebaseConfig';
import { useDatabase } from '../contexts/DatabaseContext';

const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE'; // TODO: Replace with your actual VAPID key from Firebase Console

export const usePushNotifications = () => {
    const { currentUser } = useDatabase();

    useEffect(() => {
        if (!currentUser) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Get FCM token
                    const token = await getToken(messaging, {
                        vapidKey: VAPID_KEY === 'YOUR_PUBLIC_VAPID_KEY_HERE' ? undefined : VAPID_KEY
                    });

                    if (token) {
                        console.log('FCM Token:', token);
                        // Save token to user's document
                        const userRef = doc(db, 'users', currentUser.uid);
                        await updateDoc(userRef, {
                            fcmTokens: arrayUnion(token)
                        });
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token:', error);
            }
        };

        requestPermission();

        // Handle foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received in foreground:', payload);
            // You can show a custom toast or notification here
            if (payload.notification) {
                const { title, body } = payload.notification;
                new Notification(title || 'התראה חדשה', {
                    body: body || '',
                    icon: '/pwa-192x192.png'
                });
            }
        });

        return () => unsubscribe();
    }, [currentUser]);
};
