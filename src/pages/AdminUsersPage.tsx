// src/pages/AdminUsersPage.tsx
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import HeaderNav from '../components/HeaderNav';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import '../components/Form.css';
import type { Unsubscribe } from 'firebase/auth';

type Row = {
  id: string;
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
  role?: 'pending' | 'member' | 'admin';
  approved?: boolean;
  createdAt?: any;
};

export default function AdminUsersPage() {
  const { currentUser } = useDatabase();
  const { isOffline } = useOffline();
  const [pending, setPending] = useState<Row[]>([]);
  const [all, setAll] = useState<Row[]>([]);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  // --- ממתינים (works גם ללא אדמין, אבל בפועל רק אדמין רואה את הדף) ---
  useEffect(() => {
    const q = query(collection(db, 'users'), where('approved', '==', false));
    const unsub = onSnapshot(
      q,
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
      err => console.error('pending users listener error:', err)
    );
    return () => unsub();
  }, []);

  // --- כל המשתמשים: נרשם רק כשברור שאתה אדמין ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setAll([]);
      return;
    }

    const colRef = collection(db, 'users');
    const qMain = query(colRef, orderBy('createdAt', 'desc'));

    let unsubMain: Unsubscribe | null = null;
    let unsubFallback: Unsubscribe | null = null;
    let cancelled = false;

    // 1) נסה מאזין עם orderBy
    try {
      unsubMain = onSnapshot(
        qMain,
        snap => {
          if (cancelled) return;
          setAll(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        },
        async (err) => {
          console.error('all users listener error (orderBy createdAt):', err);

          // 2) פולבאק: מאזין בלי orderBy
          if (unsubFallback) return; // אל תרשום פעמיים
          unsubFallback = onSnapshot(
            colRef,
            snap2 => {
              if (cancelled) return;
              setAll(snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
            },
            err2 => {
              console.error('all users fallback listener error (no orderBy):', err2);
            }
          );

          // 3) בנוסף, טעינה חד-פעמית כדי שלא תישאר ריק אם גם המאזין נפל
          try {
            const oneShot = await getDocs(colRef);
            if (!cancelled) {
              setAll(oneShot.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
            }
          } catch (getErr) {
            console.error('one-shot getDocs failed:', getErr);
          }
        }
      );
    } catch (e) {
      console.error('onSnapshot main failed immediately:', e);
    }

    // ניקוי
    return () => {
      cancelled = true;
      if (unsubMain) unsubMain();
      if (unsubFallback) unsubFallback();
    };
  }, [currentUser]);

  const approve = async (id: string) => updateDoc(doc(db, 'users', id), { approved: true, role: 'member' });
  const makeAdmin = async (id: string) => updateDoc(doc(db, 'users', id), { approved: true, role: 'admin' });
  const makeMember = async (id: string) => updateDoc(doc(db, 'users', id), { role: 'member' });
  const revokeApproval = async (id: string) => updateDoc(doc(db, 'users', id), { approved: false, role: 'pending' });

  const rows = tab === 'pending' ? pending : all;

  return (
    <div>
      <HeaderNav title="ניהול משתמשים" />
      <div className="container page-content" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setTab('pending')}
            style={{ padding: '8px 12px', borderRadius: 8, border: tab === 'pending' ? '2px solid var(--action-color)' : '1px solid #444', background: 'transparent', color: 'var(--text-primary)' }}
          >
            ממתינים ({pending.length})
          </button>
          <button
            onClick={() => setTab('all')}
            style={{ padding: '8px 12px', borderRadius: 8, border: tab === 'all' ? '2px solid var(--action-color)' : '1px solid #444', background: 'transparent', color: 'var(--text-primary)' }}
          >
            כל המשתמשים ({all.length})
          </button>
        </div>

        {rows.length === 0 ? (
          <div style={{ opacity: .7 }}>אין נתונים להצגה.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map(u => {
              const prettyName = u.name ?? u.displayName ?? (u.email ? u.email.split('@')[0] : 'ללא שם');
              return (
                <li key={u.id} style={{ border: '1px solid #444', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px', overflowWrap: 'anywhere' }}>
                      <div style={{ fontWeight: 700 }}>{prettyName}</div>
                      <div style={{ opacity: .8, fontSize: 14 }}>{u.email || 'ללא אימייל'}</div>
                      <div style={{ opacity: .8, fontSize: 12 }}>
                        סטטוס: {u.approved ? 'מאושר' : 'ממתין'} · תפקיד: {u.role || 'pending'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {isOffline ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 8px', border: '1px solid #555', borderRadius: '6px' }}>📵 אופליין</span>
                      ) : !u.approved ? (
                        <>
                          <button className="btn-submit" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => approve(u.id)}>
                            אשר (Member)
                          </button>
                          <button className="btn-submit" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => makeAdmin(u.id)}>
                            הגדר כמנהל (Admin)
                          </button>
                        </>
                      ) : (
                        <>
                          {u.role !== 'admin' && (
                            <button className="btn-submit" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => makeAdmin(u.id)}>
                              הפוך ל-Admin
                            </button>
                          )}
                          {u.role !== 'member' && (
                            <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: 'transparent', color: 'var(--text-primary)' }} onClick={() => makeMember(u.id)}>
                              הפוך ל-Member
                            </button>
                          )}
                          <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #a55', background: 'transparent', color: '#f66' }} onClick={() => revokeApproval(u.id)}>
                            בטל אישור
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
