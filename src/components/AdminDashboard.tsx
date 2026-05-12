import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, logout } from '@/src/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth, UserData } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, LogOut, BookOpen, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, userData, setSimulationRole } = useAuth();
  
  const [tracks, setTracks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Track State
  const [trackName, setTrackName] = useState('');
  const [trackCategory, setTrackCategory] = useState('מגמה');
  const [trackDesc, setTrackDesc] = useState('');
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);

  // New Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskTrackId, setTaskTrackId] = useState<string>("");
  const [taskMaxGrade, setTaskMaxGrade] = useState('100');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const tracksSnap = await getDocs(query(collection(db, 'tracks')));
      const tracksData = tracksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTracks(tracksData);

      const tasksSnap = await getDocs(query(collection(db, 'tasks')));
      const tasksData = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);

      const usersSnap = await getDocs(query(collection(db, 'users')));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(usersData);

    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'multiple');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrack = async () => {
    if (!trackName) {
      toast.error('שם המסלול הוא שדה חובה');
      return;
    }
    try {
      await addDoc(collection(db, 'tracks'), {
        name: trackName,
        category: trackCategory,
        description: trackDesc,
        createdBy: user?.uid,
        createdAt: serverTimestamp()
      });
      toast.success('המסלול נוצר בהצלחה');
      setIsTrackDialogOpen(false);
      setTrackName('');
      setTrackDesc('');
      fetchData();
    } catch (e) {
      toast.error('שגיאה ביצירת המסלול');
      handleFirestoreError(e, OperationType.CREATE, 'tracks');
    }
  };

  const handleDeleteTrack = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracks', id));
      toast.success('המגמה/סלול נמחקה');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tracks/${id}`);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle || !taskTrackId) {
      toast.error('אנא מלא את כל השדות החובה');
      return;
    }
    try {
      const parsedGrade = parseInt(taskMaxGrade);
      const gradeToSave = isNaN(parsedGrade) ? 100 : parsedGrade;
      
      await addDoc(collection(db, 'tasks'), {
        title: taskTitle,
        description: taskDesc,
        trackId: taskTrackId,
        maxGrade: gradeToSave,
        createdBy: user?.uid,
        createdAt: serverTimestamp()
      });
      toast.success('המטלה נוצרה בהצלחה');
      setIsTaskDialogOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskMaxGrade('100');
      fetchData();
    } catch (e) {
      toast.error('שגיאה ביצירת המטלה');
      handleFirestoreError(e, OperationType.CREATE, 'tasks');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('המטלה נמחקה');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleUpdateStudentTracks = async (studentId: string, currentTracks: string[], trackId: string) => {
     try {
        const studentRef = doc(db, 'users', studentId);
        let updatedTracks = [...(currentTracks || [])];
        if (updatedTracks.includes(trackId)) {
            updatedTracks = updatedTracks.filter(t => t !== trackId);
        } else {
            updatedTracks.push(trackId);
        }
        await updateDoc(studentRef, {
            trackIds: updatedTracks
        });
        toast.success("עדכון נשמר");
        fetchData();
     } catch (e) {
         handleFirestoreError(e, OperationType.UPDATE, `users/${studentId}`);
     }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-16 w-16 overflow-hidden flex items-center justify-center">
             <object data="/assets/logo.png" type="image/png" className="h-full w-full object-contain">
                 <BookOpen className="text-blue-600 h-10 w-10"/>
             </object>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">לוח בקרה - מנהל</h1>
            <p className="text-sm text-slate-500">
              שלום, {userData?.displayName} <span className="text-slate-300 mx-1">|</span> <span className="text-slate-400" dir="ltr">{userData?.email}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSimulationRole('student')}>
            מעבר לתצוגת תלמיד
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" /> התנתק
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Tracks Management */}
        <div className="md:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500"/>
                    מסלולים ומגמות
                </h2>
                <Dialog open={isTrackDialogOpen} onOpenChange={setIsTrackDialogOpen}>
                <DialogTrigger render={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-full" />}>
                    <Plus className="w-4 h-4 mr-1"/> חדש
                </DialogTrigger>
                <DialogContent dir="rtl">
                    <DialogHeader>
                    <DialogTitle>יצירת מסלול/מגמה חדשה</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>שם</Label>
                            <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="לדוגמה: פיזיקה 5 יח״ל" />
                        </div>
                        <div className="space-y-2">
                            <Label>סוג</Label>
                            <Select value={trackCategory} onValueChange={setTrackCategory}>
                                <SelectTrigger dir="rtl"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="מגמה">מגמה</SelectItem>
                                    <SelectItem value="הקבצה">הקבצה</SelectItem>
                                    <SelectItem value="מסלול">מסלול כללי</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>תיאור</Label>
                            <Textarea value={trackDesc} onChange={(e) => setTrackDesc(e.target.value)} />
                        </div>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateTrack}>שמור</Button>
                    </div>
                </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-3">
                {tracks.map(track => (
                    <Card key={track.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader className="py-4 px-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full mb-2 inline-block">
                                        {track.category}
                                    </span>
                                    <CardTitle className="text-base">{track.name}</CardTitle>
                                    {track.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{track.description}</p>}
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 -mr-2" onClick={() => handleDeleteTrack(track.id)}>
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
                {tracks.length === 0 && <p className="text-sm text-slate-500 text-center py-4 bg-slate-100 rounded-xl">אין מסלולים במערכת</p>}
            </div>
        </div>

        {/* Tasks Management */}
        <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500"/>
                    ניהול מטלות ומשימות
                </h2>
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger disabled={tracks.length === 0} render={<Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-full" />}>
                    <Plus className="w-4 h-4 mr-1"/> הוסף מטלה
                </DialogTrigger>
                <DialogContent dir="rtl">
                    <DialogHeader>
                    <DialogTitle>משימה חדשה</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>עבור מסלול</Label>
                            <Select value={taskTrackId || ""} onValueChange={setTaskTrackId}>
                                <SelectTrigger dir="rtl">
                                  <SelectValue placeholder="בחר מסלול...">
                                      {taskTrackId ? `${tracks.find(t => t.id === taskTrackId)?.name || ''} (${tracks.find(t => t.id === taskTrackId)?.category || ''})` : "בחר מסלול..."}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {tracks.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>כותרת המטלה</Label>
                            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>הנחיות (אופציונלי)</Label>
                            <Textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>ציון מקסימלי (ללא ציון: 0)</Label>
                            <Input type="number" value={taskMaxGrade} onChange={(e) => setTaskMaxGrade(e.target.value)} />
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateTask}>שמור משימה</Button>
                    </div>
                </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {tracks.map(track => {
                    const trackTasks = tasks.filter(t => t.trackId === track.id);
                    return (
                        <div key={track.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                 <div>
                                     <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full mb-1 inline-block">{track.category}</span>
                                     <h3 className="font-bold text-slate-800">{track.name}</h3>
                                 </div>
                             </div>
                             <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {trackTasks.map(task => (
                                    <Card key={task.id} className="border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
                                        <CardHeader className="py-3 px-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    {task.maxGrade > 0 && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">עד {task.maxGrade} נק'</span>}
                                                    <CardTitle className="text-base text-slate-800">{task.title}</CardTitle>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 h-8 w-8 -mr-2" onClick={() => handleDeleteTask(task.id)}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        {task.description && (
                                            <CardContent className="pt-0 pb-3 px-4">
                                                <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                                {trackTasks.length === 0 && <p className="text-sm text-slate-400 col-span-full py-2">אין מטלות במסלול זה</p>}
                             </div>
                        </div>
                    )
                })}
                {tracks.length === 0 && <p className="text-sm text-slate-500 text-center py-4 bg-slate-100 rounded-xl">אין מסלולים במערכת, לכן אין מטלות</p>}
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-emerald-500"/>
                    שיוך תלמידים
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">תלמיד</th>
                                    <th className="px-6 py-4">מסלולים משוייכים</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usersList.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {student.displayName}
                                            {student.role === 'admin' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">מנהל (סימולציה)</span>}
                                            <div className="text-xs text-slate-400 font-normal">{student.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {tracks.map(t => {
                                                    const isTracked = (student.trackIds || []).includes(t.id);
                                                    return (
                                                        <button 
                                                            key={t.id}
                                                            onClick={() => handleUpdateStudentTracks(student.id, student.trackIds, t.id)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${isTracked ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            {isTracked && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5 text-emerald-500"/>}
                                                            {t.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {usersList.length === 0 && <p className="text-center p-4 text-slate-500">אין משתמשים במערכת</p>}
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}
