import { io } from 'socket.io-client';
import { useUserStore } from '@/stores/userStore'


const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to server');
    const token = useUserStore().getToken()
    if (token) {
        socket.emit('authenticate', { token });
    }

});
