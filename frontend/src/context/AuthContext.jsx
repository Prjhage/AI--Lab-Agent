import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [labs, setLabs] = useState([]);
  
  // Track completions: { studentId: { labId: { expId: true } } }
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);

  // Dynamic helper to fetch completions for all labs for the active student
  const fetchStudentCompletions = async (user, labsList) => {
    if (!user || user.role !== 'student') return;
    try {
      const comps = {};
      for (const lab of labsList) {
        try {
          const completedIds = await api.get(`/api/labs/${lab.id}/completions`);
          const labComps = {};
          for (const id of completedIds) {
            labComps[id] = true;
          }
          comps[lab.id] = labComps;
        } catch (e) {
          console.error(`Failed to load completions for lab ${lab.id}:`, e);
        }
      }
      setCompletions({ [user.email]: comps });
    } catch (err) {
      console.error("Failed to query completion status:", err);
    }
  };

  // Initialize session on startup
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await api.get('/api/auth/me');
          setCurrentUser(user);
          
          const labsList = await api.get('/api/labs');
          setLabs(labsList);
          
          if (user.role === 'student') {
            await fetchStudentCompletions(user, labsList);
          }
        } catch (e) {
          console.error("Session initialization failed, purging invalid token:", e);
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };
    initSession();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.access_token);
      
      // Fetch authenticated user profile details from DB
      const user = await api.get('/api/auth/me');
      setCurrentUser(user);
      
      const labsList = await api.get('/api/labs');
      setLabs(labsList);
      
      if (user.role === 'student') {
        await fetchStudentCompletions(user, labsList);
      }
      return { success: true, user };
    } catch (err) {
      return { success: false, message: err.message || 'Invalid credentials!' };
    }
  };

  const signup = async (username, email, role, password) => {
    try {
      // 1. Perform Signup registration
      await api.post('/api/auth/signup', { username, email, role, password });
      
      // 2. Perform Login dynamically to get the JWT access token and load session!
      const loginRes = await login(email, password);
      if (!loginRes.success) {
        throw new Error(loginRes.message);
      }
      
      return { success: true, user: loginRes.user };
    } catch (err) {
      return { success: false, message: err.message || 'Signup failed!' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setLabs([]);
    setCompletions({});
  };

  const createLab = async (title, type, editorType) => {
    try {
      const newLab = await api.post('/api/labs', {
        title,
        type,
        editor_type: type === 'code' ? editorType : null
      });
      // Refresh list
      const labsList = await api.get('/api/labs');
      setLabs(labsList);
      return newLab;
    } catch (err) {
      console.error("Create lab failed:", err);
      throw err;
    }
  };

  const joinLab = async (code) => {
    try {
      const res = await api.post('/api/labs/join', { code });
      // Refresh list to pull enrollment
      const labsList = await api.get('/api/labs');
      setLabs(labsList);
      
      if (currentUser) {
        await fetchStudentCompletions(currentUser, labsList);
      }
      return { success: true, lab: res.lab };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to join lab!' };
    }
  };

  const addExperiment = async (labId, title, description, testCases, points, docFile) => {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('points', points);
      
      if (testCases && testCases.length > 0) {
        formData.append('test_cases', JSON.stringify(testCases));
      }
      if (docFile) {
        formData.append('file', docFile);
      }
      
      const newExp = await api.upload(`/api/labs/${labId}/experiments`, formData);
      
      // Refresh labs list
      const labsList = await api.get('/api/labs');
      setLabs(labsList);
      return newExp;
    } catch (err) {
      console.error("Add experiment failed:", err);
      throw err;
    }
  };

  const deleteExperiment = async (labId, expId) => {
    try {
      await api.delete(`/api/labs/${labId}/experiments/${expId}`);
      // Refresh labs list
      const labsList = await api.get('/api/labs');
      setLabs(labsList);
    } catch (err) {
      console.error("Delete experiment failed:", err);
      throw err;
    }
  };

  const completeExperiment = async (labId, expId) => {
    if (!currentUser) return;
    try {
      await api.post(`/api/labs/${labId}/experiments/${expId}/complete`);
      
      // Update completion state locally
      setCompletions(prev => {
        const studentComps = prev[currentUser.email] || {};
        const labComps = studentComps[labId] || {};
        return {
          ...prev,
          [currentUser.email]: {
            ...studentComps,
            [labId]: {
              ...labComps,
              [expId]: true
            }
          }
        };
      });
    } catch (err) {
      console.error("Failed to submit completion record:", err);
    }
  };

  const isExperimentCompleted = (labId, expId) => {
    if (!currentUser) return false;
    return !!(completions[currentUser.email]?.[labId]?.[expId]);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      labs,
      completions,
      loading,
      login,
      signup,
      logout,
      createLab,
      joinLab,
      addExperiment,
      deleteExperiment,
      completeExperiment,
      isExperimentCompleted
    }}>
      {children}
    </AuthContext.Provider>
  );
};
