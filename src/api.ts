const API_BASE_URL = 'http://localhost:5000/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  message?: string;
}

export interface AIResponse {
  success: boolean;
  model: string;
  prompt: string;
  response: string;
  message?: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  model?: string;
}

export interface ConversationItemApi {
  id: string;
  title: string;
  model?: string;
  timestamp: string;
}

export interface SendChatResponse {
  success: boolean;
  conversationId?: string;
  conversationTitle?: string;
  message?: string;
  response?: string;
  answer?: string;
  model?: string;
  timestamp?: string;
  messageText?: string;
  offline?: boolean;
  intent?: string;
  toolsUsed?: string[];
  sources?: any[];
  verified?: boolean;
  requestId?: string;
  totalLatencyMs?: number;
  generation_time_ms?: number;
}


// Get saved token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('mathiyon_jwt_token');
};

// Save token to localStorage
export const setToken = (token: string): void => {
  localStorage.setItem('mathiyon_jwt_token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem('mathiyon_jwt_token');
};

// API Register
export const apiRegister = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setToken(data.token);
    }
    return data;
  } catch (error) {
    return { success: false, message: 'Network error. Could not connect to Express server.' };
  }
};

// API Login
export const apiLogin = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setToken(data.token);
    }
    return data;
  } catch (error) {
    return { success: false, message: 'Network error. Could not connect to Express server.' };
  }
};

// API Get Current User
export const apiGetMe = async (): Promise<AuthResponse> => {
  const token = getToken();
  if (!token) return { success: false, message: 'No token found' };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Failed to verify session' };
  }
};

export interface DocumentItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  pageCount?: number;
  chunkCount?: number;
  createdAt: string;
}

// API Send Chat Prompt & Save to MongoDB (JWT Protected)
export const apiSendChatMessage = async (
  message: string,
  model: string,
  conversationId?: string,
  documentId?: string,
  enableWebSearch?: boolean
): Promise<SendChatResponse> => {
  const token = getToken();
  if (!token) return { success: false, messageText: 'Authentication required. No JWT token found.' };

  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, model, conversationId, documentId, enableWebSearch }),
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      messageText: 'Error connecting to Mathiyon Express Chat Server.',
    };
  }
};

// API Get Conversations for User (JWT Protected)
export const apiGetConversations = async (): Promise<{ success: boolean; conversations?: ConversationItemApi[]; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error loading user conversations' };
  }
};

// API Get Messages for a specific conversation (JWT Protected)
export const apiGetConversationMessages = async (
  conversationId: string
): Promise<{ success: boolean; messages?: ChatMessageItem[]; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error loading conversation messages' };
  }
};

// API Create New Conversation (JWT Protected)
export const apiCreateConversation = async (
  title?: string,
  model?: string
): Promise<{ success: boolean; conversation?: ConversationItemApi; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, model }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error creating new conversation' };
  }
};

// API Math Engine Solver (JWT Protected)
export const apiSolveMath = async (
  question: string,
  difficulty: string = 'intermediate'
): Promise<{
  success: boolean;
  category?: string;
  result?: string;
  explanation?: string;
  exact?: boolean;
  verified?: boolean;
  message?: string;
}> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/math/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question, difficulty }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error calling Mathiyon Math Engine' };
  }
};

// Legacy API fallback
export const apiGenerateAI = async (prompt: string, model: string): Promise<AIResponse> => {
  const res = await apiSendChatMessage(prompt, model);
  if (res.success && res.response) {
    return { success: true, model: res.model || model, prompt, response: res.response };
  }
  return { success: false, model, prompt, response: res.messageText || 'Error processing request' };
};

// API Upload Document (JWT Protected)
export const apiUploadDocument = async (file: File): Promise<{ success: boolean; document?: DocumentItem; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error uploading document to Mathiyon backend' };
  }
};

// API Get User Documents (JWT Protected)
export const apiGetDocuments = async (): Promise<{ success: boolean; documents?: DocumentItem[]; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/files`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error loading user documents' };
  }
};

// API Delete User Document (JWT Protected)
export const apiDeleteDocument = async (documentId: string): Promise<{ success: boolean; message?: string }> => {
  const token = getToken();
  if (!token) return { success: false, message: 'Authentication required' };

  try {
    const res = await fetch(`${API_BASE_URL}/files/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Error deleting document' };
  }
};

