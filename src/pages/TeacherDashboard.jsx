import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { createClass, getStudents, addStudent, startAttendance, createWebSocket, getClass, getMyClasses, getClassAttendance } from '../api';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [ws, setWs] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Load teacher's classes
      const { data: classesData } = await getMyClasses();
      if (classesData.success) {
        setClasses(classesData.data);
      }
      
      // Load all students
      const { data: studentsData } = await getStudents();
      if (studentsData.success) {
        setStudents(studentsData.data);
      }
    };
    loadData();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    const { data } = await createClass(newClassName);
    if (data.success) {
      setClasses([...classes, data.data]);
      setNewClassName('');
    } else {
      setError(data.error);
    }
  };

  const handleAddStudent = async (classId, studentId) => {
    const { data } = await addStudent(classId, studentId);
    if (data.success) {
      setClasses(classes.map(c => c._id === classId ? data.data : c));
    }
  };

  const [viewedSession, setViewedSession] = useState(null);

  const handleViewSession = async (classDoc) => {
    const { data } = await getClassAttendance(classDoc._id);
    if (data.success) {
      setViewedSession(data.data);
    }
  };

  const handleStartSession = async (classDoc) => {
    const { data } = await startAttendance(classDoc._id);
    if (data.success) {
      setActiveSession(data.data);
      setSelectedClass(classDoc);
      
      // Load class with students
      const { data: classData } = await getClass(classDoc._id);
      if (classData.success) {
        setSelectedClass(classData.data);
      }
      
      // Connect WebSocket
      const socket = createWebSocket();
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        switch (msg.event) {
          case 'ATTENDANCE_MARKED':
            setAttendance(prev => ({ ...prev, [msg.data.studentId]: msg.data.status }));
            break;
          case 'TODAY_SUMMARY':
            setSummary(msg.data);
            break;
          case 'DONE':
            setSummary(msg.data);
            setActiveSession(null);
            setPendingRequests([]);
            socket.close();
            break;
          case 'NEW_JOIN_REQUEST':
            setPendingRequests(prev => {
              // Avoid duplicates
              if (prev.some(r => r._id === msg.data.student._id)) return prev;
              return [...prev, msg.data.student];
            });
            break;
          case 'PENDING_REQUESTS':
            setPendingRequests(msg.data.requests.map(r => ({
              _id: r.studentId,
              name: r.studentName,
              email: r.studentEmail
            })));
            break;
          case 'STUDENT_ADDED':
            // Refresh class to get updated student list
            refreshClassStudents();
            break;
        }
      };
      
      socket.onopen = () => {
        // Get existing pending requests
        socket.send(JSON.stringify({ event: 'GET_PENDING_REQUESTS' }));
      };
      
      setWs(socket);
    }
  };

  const refreshClassStudents = async () => {
    if (activeSession) {
      const { data } = await getClass(activeSession.classId);
      if (data.success) {
        setSelectedClass(data.data);
      }
    }
  };

  const approveJoin = (studentId) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        event: 'APPROVE_JOIN',
        data: { studentId }
      }));
      // Remove from pending list
      setPendingRequests(prev => prev.filter(r => r._id !== studentId));
    }
  };

  const rejectJoin = (studentId) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        event: 'REJECT_JOIN',
        data: { studentId }
      }));
      // Remove from pending list
      setPendingRequests(prev => prev.filter(r => r._id !== studentId));
    }
  };

  const markAttendance = (studentId, status) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        event: 'ATTENDANCE_MARKED',
        data: { studentId, status }
      }));
    }
  };

  const requestSummary = () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'TODAY_SUMMARY' }));
    }
  };

  const endSession = () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'DONE' }));
    }
  };

  const handleLogout = () => {
    if (ws) ws.close();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">👨‍🏫 Teacher Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/60">Welcome, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!activeSession ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Create Class */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">📝 Create New Class</h2>
              <form onSubmit={handleCreateClass} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Class name..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Create
                </button>
              </form>

              {/* Classes List */}
              <div className="mt-6 space-y-3">
                {classes.map(c => (
                  <div key={c._id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium text-lg">{c.className}</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-green-400 text-sm">
                            👥 {c.studentCount || c.studentIds?.length || 0} students
                          </span>
                          <span className="text-white/40 text-sm">
                            📅 Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                          {c.hasAttendance && (
                            <span className="text-blue-400 text-sm">✓ Session completed</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {c.hasAttendance && (
                          <button
                            onClick={() => handleViewSession(c)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                          >
                            View Session
                          </button>
                        )}
                        <button
                          onClick={() => handleStartSession(c)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                        >
                          {c.hasAttendance ? 'New Session' : 'Start Session'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Students */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">🎓 Available Students</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map(s => (
                  <div key={s._id} className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <div>
                      <p className="text-white">{s.name}</p>
                      <p className="text-white/40 text-sm">{s.email}</p>
                    </div>
                    {classes.length > 0 && (
                      <select
                        onChange={(e) => e.target.value && handleAddStudent(e.target.value, s._id)}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>Add to class</option>
                        {classes.map(c => (
                          <option key={c._id} value={c._id} className="bg-slate-800">{c.className}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-white/40 text-center py-8">No students registered yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active Session */
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white">📋 {selectedClass?.className}</h2>
                  <p className="text-white/40">Session started at {new Date(activeSession.startedAt).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={requestSummary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Get Summary
                  </button>
                  <button
                    onClick={endSession}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    End Session
                  </button>
                </div>
              </div>

              {summary && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-500/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{summary.present}</p>
                    <p className="text-green-400/60">Present</p>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-400">{summary.absent}</p>
                    <p className="text-red-400/60">Absent</p>
                  </div>
                  <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">{summary.total}</p>
                    <p className="text-purple-400/60">Total</p>
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="space-y-2">
                {selectedClass?.students?.map(s => (
                  <div key={s._id} className="flex justify-between items-center bg-white/5 rounded-lg p-4 border border-white/10">
                    <div>
                      <p className="text-white font-medium">{s.name}</p>
                      <p className="text-white/40 text-sm">{s.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(s._id, 'present')}
                        className={`px-4 py-2 rounded-lg transition ${
                          attendance[s._id] === 'present'
                            ? 'bg-green-600 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-green-600/50'
                        }`}
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => markAttendance(s._id, 'absent')}
                        className={`px-4 py-2 rounded-lg transition ${
                          attendance[s._id] === 'absent'
                            ? 'bg-red-600 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-red-600/50'
                        }`}
                      >
                        ✗ Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Join Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-yellow-500/10 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
                <h3 className="text-xl font-semibold text-yellow-400 mb-4">
                  🔔 Pending Join Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map(student => (
                    <div key={student._id} className="flex justify-between items-center bg-white/5 rounded-lg p-4 border border-white/10">
                      <div>
                        <p className="text-white font-medium">{student.name}</p>
                        <p className="text-white/40 text-sm">{student.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveJoin(student._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => rejectJoin(student._id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Session Modal */}
        {viewedSession && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">📊 {viewedSession.className} - Attendance</h2>
                <button
                  onClick={() => setViewedSession(null)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{viewedSession.summary.present}</p>
                  <p className="text-green-400/60">Present</p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{viewedSession.summary.absent}</p>
                  <p className="text-red-400/60">Absent</p>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">{viewedSession.summary.total}</p>
                  <p className="text-purple-400/60">Total</p>
                </div>
              </div>

              {/* Student Records */}
              <div className="space-y-2">
                {viewedSession.records.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <div>
                      <p className="text-white">{r.studentName}</p>
                      <p className="text-white/40 text-sm">{r.studentEmail}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      r.status === 'present' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {r.status === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setViewedSession(null)}
                className="mt-6 w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
