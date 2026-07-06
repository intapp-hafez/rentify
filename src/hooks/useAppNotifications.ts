import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNotifications, type GeneratedNotification } from '@/api/analytics';

const EVENT_KEY = 'rentify-notifications-read';
const STORAGE_KEY = 'rentify_read_notifications';

export function useAppNotifications() {
  const { data: notifications = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 5 * 60 * 1000,
  });

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      }
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setReadIds(new Set(JSON.parse(saved)));
        }
      } catch {}
    };

    window.addEventListener(EVENT_KEY, handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_KEY, handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const saveReadIds = useCallback((newIds: Set<string>) => {
    setReadIds(newIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newIds)));
    window.dispatchEvent(new CustomEvent(EVENT_KEY));
  }, []);

  const markRead = useCallback((id: string) => {
    saveReadIds(new Set([...readIds, id]));
  }, [readIds, saveReadIds]);

  const markAllRead = useCallback(() => {
    saveReadIds(new Set(notifications.map(n => n.id)));
  }, [notifications, saveReadIds]);

  const enriched = notifications.map(n => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = enriched.filter(n => !n.read).length;

  return {
    notifications: enriched,
    unreadCount,
    isLoading,
    isFetching,
    refetch,
    markRead,
    markAllRead,
  };
}
