const API_BASE = import.meta.env.VITE_API_URL || '';

// Get token from localStorage
export const getToken = () => localStorage.getItem('token');

// Set token to localStorage
export const setToken = (token) => localStorage.setItem('token', token);

// Remove token from localStorage
export const removeToken = () => localStorage.removeItem('token');

// Get user from localStorage
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Set user to localStorage
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// Remove user from localStorage
export const removeUser = () => localStorage.removeItem('user');

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: token }),
    ...options.headers,
  };

  try {
    const url = `${API_BASE.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
    } catch {
      data = { success: false, error: text || 'Invalid response' };
    }

    return { response, data };
  } catch (error) {
    return { 
      response: { ok: false, status: 0 }, 
      data: { success: false, error: error.message } 
    };
  }
};

// Auth API
export const signup = async (name, email, password, role) => {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
};

export const login = async (email, password) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const getMe = async () => {
  return apiRequest('/auth/me');
};

export const forgotPassword = async (email) => {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const verifyOtp = async (email, otp) => {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};

export const resetPassword = async (email, otp, newPassword) => {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
};

// Class API
export const createClass = async (className) => {
  return apiRequest('/class', {
    method: 'POST',
    body: JSON.stringify({ className }),
  });
};

export const getClass = async (id) => {
  return apiRequest(`/class/${id}`);
};

export const addStudent = async (classId, studentId) => {
  return apiRequest(`/class/${classId}/add-student`, {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
};

export const getMyAttendance = async (classId) => {
  return apiRequest(`/class/${classId}/my-attendance`);
};

// Students API
export const getStudents = async () => {
  return apiRequest('/students');
};

// Teacher's classes
export const getMyClasses = async () => {
  return apiRequest('/class/my-classes');
};

// Student's enrolled classes
export const getEnrolledClasses = async () => {
  return apiRequest('/class/enrolled');
};

// Get class attendance records
export const getClassAttendance = async (classId) => {
  return apiRequest(`/attendance/class/${classId}`);
};

// Attendance API
export const startAttendance = async (classId) => {
  return apiRequest('/attendance/start', {
    method: 'POST',
    body: JSON.stringify({ classId }),
  });
};

// WebSocket helper
export const createWebSocket = () => {
  const token = getToken();
  if (!token) return null;
  
  const isSecure = API_BASE.startsWith('https');
  const wsProtocol = isSecure ? 'wss' : 'ws';
  const wsHost = API_BASE.replace(/^https?:\/\//, '');
  const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${token}`;
  return new WebSocket(wsUrl);
};
