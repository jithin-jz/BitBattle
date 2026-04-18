import { writable, get } from 'svelte/store';
import { user, accessToken } from './auth.js';

/**
 * @typedef {Object} MatchState
 * @property {string|null} matchId
 * @property {string} status - 'idle' | 'queued' | 'matched' | 'started' | 'finished'
 * @property {Object|null} problem
 * @property {Array} testCases
 * @property {number} timeRemaining
 * @property {string|null} winnerId
 * @property {string|null} opponentId
 */

/** @type {import('svelte/store').Writable<MatchState>} */
export const matchState = writable({
    matchId: null,
    status: 'idle',
    problem: null,
    testCases: [],
    timeRemaining: 0,
    winnerId: null,
    player1Id: null,
    player2Id: null,
    player1Username: null,
    player2Username: null,
    player1Avatar: null,
    player2Avatar: null,
});

// Auto-reset match state when logging out
if (typeof window !== 'undefined') {
    user.subscribe($user => {
        if (!$user) {
            matchState.set({
                matchId: null,
                status: 'idle',
                problem: null,
                testCases: [],
                timeRemaining: 0,
                winnerId: null,
                player1Id: null,
                player2Id: null,
                player1Username: null,
                player2Username: null,
                player1Avatar: null,
                player2Avatar: null,
                opponentId: null,
            });
        }

    });
}


/** @type {import('svelte/store').Writable<WebSocket|null>} */
export const ws = writable(null);

/** @type {import('svelte/store').Writable<string>} */
export const opponentStatus = writable('waiting');

/**
 * Connect WebSocket to match.
 * @param {string} matchId
 * @param {string} token
 */
export function connectToMatch(matchId, token) {
    if (!token || token === 'null') {
        console.error('Cannot connect to WebSocket: No token provided');
        return null;
    }
    const WS_URL = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:8000';
    const socket = new WebSocket(`${WS_URL}/ws/match/${matchId}?token=${token}`);

    socket.onopen = () => {
        console.log('🔌 WebSocket connected to match', matchId);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWSMessage(data);
    };

    socket.onerror = (err) => {
        console.error('WebSocket error:', err);
    };

    socket.onclose = () => {
        console.log('WebSocket closed');
    };

    ws.set(socket);
    return socket;
}

/**
 * Handle incoming WebSocket messages.
 * @param {Object} data
 */
function handleWSMessage(data) {
    switch (data.type) {
        case 'player_connected':
            console.log('Player connected:', data.user_id, `(${data.connected_count}/2)`);
            break;

        case 'match_start':
            matchState.update((s) => ({
                ...s,
                status: 'started',
                problem: data.problem,
                testCases: data.test_cases || [],
                timeRemaining: data.problem?.time_limit || 600,
                player1Id: data.player1_id,
                player2Id: data.player2_id,
                player1Username: data.player1_username,
                player2Username: data.player2_username,
                player1Avatar: data.player1_avatar,
                player2Avatar: data.player2_avatar,
            }));
            break;

        case 'timer_update':
            matchState.update((s) => ({
                ...s,
                timeRemaining: data.remaining,
            }));
            break;

        case 'match_end':
            matchState.update((s) => ({
                ...s,
                status: 'finished',
                winnerId: data.winner_id || null,
            }));
            break;

        case 'opponent_submission':
            opponentStatus.set(data.status);
            break;

        case 'opponent_typing':
            opponentStatus.set('typing');
            setTimeout(() => opponentStatus.set('coding'), 2000);
            break;

        case 'player_disconnected':
            opponentStatus.set('disconnected');
            break;

        default:
            console.log('Unknown WS message:', data);
    }
}

/**
 * Send a message through the WebSocket.
 * @param {Object} message
 */
export function sendWSMessage(message) {
    let socket = null;
    ws.subscribe((s) => (socket = s))();
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

/**
 * Reset match state.
 */
export function resetMatch() {
    // Close existing socket
    let socket = null;
    ws.subscribe((s) => (socket = s))();
    if (socket) {
        socket.close();
    }
    ws.set(null);

    matchState.set({
        matchId: null,
        status: 'idle',
        problem: null,
        testCases: [],
        timeRemaining: 0,
        winnerId: null,
        opponentId: null,
    });
    opponentStatus.set('waiting');
}
