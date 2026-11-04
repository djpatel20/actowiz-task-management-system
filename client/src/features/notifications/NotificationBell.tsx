import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { notificationsApi } from './notificationsApi.js';
import { getSocket } from '../../lib/socket.js';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell: React.FC<{ onSelectTask?: (taskId: string) => void }> = ({
  onSelectTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.listNotifications({ limit: 15 }),
    refetchInterval: 30000,
  });

  // Socket listener for real-time notifications
  useEffect(() => {
    const socket = getSocket();

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  const handleNotificationClick = (link: string, id: string, isRead: boolean) => {
    if (!isRead) {
      markReadMutation.mutate(id);
    }
    const match = link.match(/selected=([0-9a-fA-F]{24})/);
    if (match && onSelectTask) {
      onSelectTask(match[1]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#777B76] hover:text-[#252824] hover:bg-[#F0F0EC] rounded-lg transition-colors"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C35D5D] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E5E6E1] rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E6E1] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-[#252824]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0F0EC] text-[#777B76]">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-[#5556A6] hover:text-[#45468F] font-medium flex items-center space-x-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E6E1]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#969A94]">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n.link, n._id, n.isRead)}
                    className={`p-3.5 hover:bg-[#F7F7F4] cursor-pointer transition-colors flex items-start space-x-3 ${
                      !n.isRead ? 'bg-[#FAF8F5]' : ''
                    }`}
                  >
                    {!n.isRead ? (
                      <Circle className="w-2 h-2 text-[#5556A6] fill-[#5556A6] shrink-0 mt-1.5" />
                    ) : (
                      <span className="w-2 h-2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#252824] truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-[#777B76] mt-0.5 line-clamp-2">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-[#969A94] mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
