import { writable } from 'svelte/store';
import { api, fetchMe, accessToken, user } from './auth.js';
import { matchState } from './match.js';




const WS_URL = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:8000';

export const lobbyWs = writable(null);
export const onlineCount = writable(0);


/**
 * Connect to global lobby WebSocket.
 */
export function connectToLobby(onLeaderboardUpdate = null) {
    let socket;
    
    lobbyWs.update(current => {
        if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
            return current;
        }
        
        let token = '';
        accessToken.subscribe(t => token = t)();

        socket = new WebSocket(`${WS_URL}/ws/lobby${token ? '?token=' + token : ''}`);
        
        socket.onopen = () => {

            console.log('✅ Connected to Global Lobby WS');
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📢 Lobby Message:', data);
            
            if (data.type === 'leaderboard_update') {
                // Refresh local user data if they were in a match
                fetchMe();
                // Execute callback if provided (e.g. reload leaderboard)
                if (onLeaderboardUpdate) {
                    onLeaderboardUpdate(data);
                }
            } else if (data.type === 'online_count') {
                onlineCount.set(data.count);
            } else if (data.type === 'match_found') {
                console.log('🎯 Match Found via WS!', data);
                
                let currentUserId = null;
                user.subscribe(u => currentUserId = u?.id)();

                matchState.update(s => ({
                    ...s,
                    matchId: data.match_id,
                    status: 'matched',
                    opponentId: data.player1_id === currentUserId ? data.player2_id : data.player1_id,
                    problemId: data.problem_id
                }));
            }
        };



        
        socket.onclose = () => {
            console.log('❌ Lobby WS Disconnected. Retrying in 5s...');
            setTimeout(() => connectToLobby(onLeaderboardUpdate), 5000);
        };
        
        return socket;
    });
}
