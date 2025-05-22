import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaBell, FaCheckCircle, FaTrashAlt } from 'react-icons/fa'; // Using react-icons for better UI

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getToken = () => localStorage.getItem("token");

    const fetchNotificationsAndCount = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
            setIsLoading(false);
            return;
        }
        try {
            const [countRes, notificationsRes] = await Promise.all([
                axios.get(`${API_URL}/notifications/count`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUnreadCount(countRes.data.unreadCount || 0);
            setNotifications(notificationsRes.data || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch notifications");
            console.error("Fetch notifications error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchNotificationsAndCount();
        // Optional: Set up polling for new notifications
        const intervalId = setInterval(fetchNotificationsAndCount, 60000); // Poll every 60 seconds
        return () => clearInterval(intervalId);
    }, [fetchNotificationsAndCount]);

    const handleMarkAsRead = async (notificationId) => {
        const token = getToken();
        try {
            await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchNotificationsAndCount(); // Refresh list and count
        } catch (err) {
            console.error("Mark as read error:", err);
            setError(err.response?.data?.message || "Failed to mark as read");
        }
    };

    const handleDeleteNotification = async (notificationId) => {
        if (window.confirm("Are you sure you want to delete this notification?")) {
            const token = getToken();
            try {
                await axios.delete(`${API_URL}/notifications/${notificationId}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchNotificationsAndCount(); // Refresh list and count
            } catch (err) {
                console.error("Delete notification error:", err);
                setError(err.response?.data?.message || "Failed to delete notification");
            }
        }
    };
    
    const handleMarkAllAsRead = async () => {
        const token = getToken();
        try {
            await axios.put(`${API_URL}/notifications/mark-all-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchNotificationsAndCount();
        } catch (err) {
            console.error("Mark all as read error:", err);
            setError(err.response?.data?.message || "Failed to mark all as read");
        }
    };

    const toggleDropdown = () => setShowDropdown(!showDropdown);

    const bellStyle = {
        position: 'relative',
        cursor: 'pointer',
        marginRight: '20px', // Adjust as needed for layout
        fontSize: '1.5em',
        color: '#333'
    };

    const countBadgeStyle = {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: 'red',
        color: 'white',
        borderRadius: '50%',
        padding: '2px 6px',
        fontSize: '0.7em',
        fontWeight: 'bold',
        display: unreadCount > 0 ? 'block' : 'none'
    };

    const dropdownStyle = {
        position: 'absolute',
        top: '100%',
        right: 0,
        width: '350px',
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        padding: '10px'
    };

    const notificationItemStyle = (isRead) => ({
        padding: '10px',
        borderBottom: '1px solid #eee',
        backgroundColor: isRead ? '#f9f9f9' : '#fff',
        opacity: isRead ? 0.7 : 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    });

    const notificationContentStyle = {
        flexGrow: 1,
        marginRight: '10px'
    };

    const notificationActionsStyle = {
        display: 'flex',
        gap: '8px'
    };

    const actionButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9em'
    };

    return (
        <div style={bellStyle} onClick={toggleDropdown}>
            <FaBell />
            <span style={countBadgeStyle}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            {showDropdown && (
                <div style={dropdownStyle} onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside dropdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4>Notifications</h4>
                        {notifications.some(n => !n.is_read) && (
                            <button onClick={handleMarkAllAsRead} style={{...actionButtonStyle, fontSize: '0.8em', color: '#007bff'}}>Mark all as read</button>
                        )}
                    </div>
                    {isLoading && <p>Loading notifications...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && notifications.length === 0 && <p>No notifications.</p>}
                    {!isLoading && notifications.map(notif => (
                        <div key={notif.notification_id} style={notificationItemStyle(notif.is_read)}>
                            <div style={notificationContentStyle}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: notif.is_read ? 'normal' : 'bold' }}>
                                    {notif.type.replace(/_/g, ' ').toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase())}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>{notif.message}</p>
                                <small style={{ fontSize: '0.75em', color: '#777' }}>
                                    {new Date(notif.created_at).toLocaleString()}
                                    {notif.due_date && ` (Due: ${new Date(notif.due_date).toLocaleDateString()})`}
                                </small>
                            </div>
                            <div style={notificationActionsStyle}>
                                {!notif.is_read && (
                                    <button onClick={() => handleMarkAsRead(notif.notification_id)} title="Mark as read" style={{...actionButtonStyle, color: '#28a745'}}>
                                        <FaCheckCircle />
                                    </button>
                                )}
                                <button onClick={() => handleDeleteNotification(notif.notification_id)} title="Delete notification" style={{...actionButtonStyle, color: '#dc3545'}}>
                                    <FaTrashAlt />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

// Example of how to integrate into App.js or a Header component:
// import NotificationBell from './components/NotificationBell';
// ... in your header/navbar JSX ...
// <NotificationBell />

