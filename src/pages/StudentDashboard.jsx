import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { createWebSocket, getEnrolledClasses } from '../api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [joinStatus, setJoinStatus] = useState(null); // null, 'pending', 'approved', 'rejected', 'already_enrolled'
  const [myStatus, setMyStatus] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('Connecting...');

  // Load enrolled classes from database on mount
  useEffect(() => {
    const loadClasses = async () => {
      const { data } = await getEnrolledClasses();
      if (data.success) {
        setMyClasses(data.data);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const socket = createWebSocket();
    
    if (!socket) {
      setMessage('Failed to connect - no token');
      return;
    }
    
    socket.onopen = () => {
      setMessage('Connected!');
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      switch (msg.event) {
        case 'SESSION_INFO':
          setSessionActive(msg.data.active);
          if (msg.data.active) {
            setSessionInfo(msg.data);
            setMessage('A class session is active!');
          } else {
            setMessage('No active session. Waiting for teacher...');
          }
          break;
          
        case 'MY_CLASSES':
          setMyClasses(msg.data.classes || []);
          break;
          
        case 'JOIN_RESPONSE':
          setJoinStatus(msg.data.status);
          if (msg.data.status === 'pending') {
            setMessage('Join request sent! Waiting for teacher approval...');
          } else if (msg.data.status === 'already_enrolled') {
            setMessage('You are already enrolled in this class!');
          }
          break;
          
        case 'JOIN_APPROVED':
          setJoinStatus('approved');
          setMessage(`You have been added to ${msg.data.className}!`);
          // Refresh classes list
          socket.send(JSON.stringify({ event: 'GET_MY_CLASSES' }));
          break;
          
        case 'JOIN_REJECTED':
          setJoinStatus('rejected');
          setMessage('Your join request was rejected.');
          break;
          
        case 'ATTENDANCE_MARKED':
          if (msg.data.studentId === user._id) {
            setMyStatus(msg.data.status);
            setMessage(`Your attendance: ${msg.data.status.toUpperCase()}`);
          }
          break;
          
        case 'MY_ATTENDANCE':
          if (msg.data.status !== 'not yet updated') {
            setMyStatus(msg.data.status);
          }
          break;
          
        case 'TODAY_SUMMARY':
          setSummary(msg.data);
          break;
          
        case 'DONE':
          setSummary(msg.data);
          setSessionActive(false);
          setJoinStatus(null);
          setMyStatus(null);
          setMessage('Session ended. Attendance recorded.');
          break;
          
        case 'ERROR':
          if (msg.data.message !== 'No active attendance session') {
            setMessage(msg.data.message);
          }
          break;
      }
    };

    socket.onclose = () => {
      setMessage('Disconnected from server');
    };

    setWs(socket);

    return () => {
      if (socket) socket.close();
    };
  }, [user._id]);

  const requestJoin = () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'JOIN_REQUEST' }));
    }
  };

  const checkAttendance = () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'MY_ATTENDANCE' }));
    }
  };

  const handleLogout = () => {
    if (ws) ws.close();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">🎓 Student Dashboard</h1>
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* My Enrolled Classes */}
        {myClasses.length > 0 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">📚 My Enrolled Classes</h2>
            <div className="flex flex-wrap gap-3">
              {myClasses.map(c => (
                <div key={c._id} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                  {c.className}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Session Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 text-center">
          {sessionActive ? (
            <>
              <div className="text-6xl mb-4">📢</div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Class Session Active!
              </h2>
              <p className="text-white/60 mb-6">{message}</p>

              {/* Join Status Display */}
              {joinStatus === 'pending' ? (
                <div className="bg-yellow-500/20 text-yellow-400 px-6 py-4 rounded-lg mb-4">
                  ⏳ Join request pending... Waiting for teacher approval
                </div>
              ) : joinStatus === 'approved' || joinStatus === 'already_enrolled' ? (
                <>
                  {/* Show attendance status */}
                  <div className="text-5xl mb-4">
                    {myStatus === 'present' ? '✅' : myStatus === 'absent' ? '❌' : '⏳'}
                  </div>
                  <p className="text-white text-xl mb-4">
                    {myStatus === 'present' 
                      ? 'You are marked PRESENT!' 
                      : myStatus === 'absent' 
                        ? 'You are marked ABSENT' 
                        : 'Waiting for teacher to mark attendance...'}
                  </p>
                  <button
                    onClick={checkAttendance}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    🔄 Refresh Status
                  </button>
                </>
              ) : joinStatus === 'rejected' ? (
                <div className="bg-red-500/20 text-red-400 px-6 py-4 rounded-lg">
                  ❌ Your join request was rejected
                </div>
              ) : (
                /* Show Join/Skip buttons */
                <div className="flex justify-center gap-4">
                  <button
                    onClick={requestJoin}
                    className="px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition"
                  >
                    ✅ Join Class
                  </button>
                  <button
                    onClick={() => setJoinStatus('rejected')}
                    className="px-8 py-4 bg-gray-600 text-white text-lg font-semibold rounded-xl hover:bg-gray-700 transition"
                  >
                    ❌ Skip
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">😴</div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                No Active Session
              </h2>
              <p className="text-white/60">{message}</p>
            </>
          )}
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">📊 Session Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{summary.present}</p>
                <p className="text-green-400/60">Present</p>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{summary.absent}</p>
                <p className="text-red-400/60">Absent</p>
              </div>
              <div className="bg-indigo-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-indigo-400">{summary.total}</p>
                <p className="text-indigo-400/60">Total</p>
              </div>
            </div>
            {summary.message && (
              <p className="text-green-400 text-center mt-4">✅ {summary.message}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
