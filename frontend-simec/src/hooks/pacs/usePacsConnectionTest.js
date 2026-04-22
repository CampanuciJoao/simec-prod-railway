import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_API_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:5000';

function getToken() {
  try {
    const raw = localStorage.getItem('userInfo');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export function usePacsConnectionTest() {
  const [eventsByConnection, setEventsByConnection] = useState({});

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('pacs:connection-test', (event) => {
      setEventsByConnection((current) => ({
        ...current,
        [event.connectionId]: event,
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    eventsByConnection,
  };
}
