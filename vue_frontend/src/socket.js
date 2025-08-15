import { io } from 'socket.io-client';
import { useUserStore } from '@/stores/userStore'
import { useGameStateStore } from './stores/gameStateStore';



const socketURL = 'http://localhost:4000';

class SocketService{
    socket;
    UserStore;
    GameStateStore;
    constructor(){
        this.socket = null;
    }

    connect(){
        if(this.socket && this.socket.connected) {return;}

        this.UserStore = useUserStore();
        this.GameStateStore = useGameStateStore();

        this.socket = io(socketURL);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            const token = this.UserStore.token;
            if (token) {
                this.socket.emit('authenticate', { token });
            }
        });

        this.socket.on('update_game_state', (newState) => {
            this.GameStateStore.updateGameState(newState);
            console.log('Received game state update:', newState);
        });

        this.socket.on('authentication_failed', (data) => {
            console.error('Socket.IO: 认证失败!', data.message);
            // 认证失败，说明 token 有问题，需要强制用户登出
            this.UserStore.logout();
        }); 

        this.socket.on('receive_system_message', (data) => {
            console.log('Received system message:', data);
            // 这里可以添加处理系统消息的逻辑
        });
    }

    disconnect(){
        if(this.socket && this.socket.connected) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit(event, data){
        if(this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.error('Socket.IO: 未连接到服务器!');
        }
    }
}

export const socketService = new SocketService();




