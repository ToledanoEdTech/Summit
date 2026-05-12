import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, logout } from '@/src/lib/firebase';
import { collection, query, getDocs, setDoc, serverTimestamp, doc, where, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LogOut, BookOpen, CheckCircle, Circle, Save, GraduationCap, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ManageTracksDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  allTracks: any[];
  localTrackIds: string[];
  setLocalTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  userData: any;
  handleSaveTracks: () => void;
}

function ManageTracksDialogComponent({
  isOpen,
  setIsOpen,
  allTracks,
  localTrackIds,
  setLocalTrackIds,
  userData,
  handleSaveTracks
}: ManageTracksDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            setLocalTrackIds(userData?.trackIds || []);
        }
        setIsOpen(open);
    }}>
        <DialogTrigger render={<Button size="sm" variant={userData?.trackIds?.length === 0 ? "default" : "outline"} className="gap-2 bg-white text-slate-800 border-slate-200 hover:bg-slate-50 relative z-10" />}>
            <Settings2 className="w-4 h-4" /> 
            {userData?.trackIds?.length === 0 ? "בחירת מסלולים ומגמות" : "ניהול מסלולים"}
        </DialogTrigger>
        <DialogContent dir="rtl" className="max-w-xl">
            <DialogHeader>
                <DialogTitle className="text-xl">ניהול המסלולים שלי</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="text-sm text-slate-500 mb-4">בחר את המגמות, ההקבצות והמסלולים אליהם אתה רשום:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pl-2">
                    {allTracks.map(track => {
                        const isSelected = localTrackIds.includes(track.id);
                        return (
                            <label 
                                key={track.id} 
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                        setLocalTrackIds(prev => 
                                            checked 
                                                ? [...prev, track.id] 
                                                : prev.filter(id => id !== track.id)
                                        );
                                    }}
                                    className="mt-1"
                                />
                                <div className="select-none">
                                    <h4 className="text-sm font-semibold text-slate-800">{track.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{track.category}</p>
                                </div>
                            </label>
                        );
                    })}
                    {allTracks.length === 0 && (
                        <p className="text-center col-span-2 text-slate-500 py-8">לא הוגדרו עדיין מסלולים במערכת.</p>
                    )}
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button onClick={handleSaveTracks} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        שמור מסלולים
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  );
}

export default function StudentDashboard() {
  const { user, userData, setSimulationRole } = useAuth();
  
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Drafts for editing
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  // Manage Tracks Dialog
  const [isManageTracksOpen, setIsManageTracksOpen] = useState(false);
  const [localTrackIds, setLocalTrackIds] = useState<string[]>(userData?.trackIds || []);

  useEffect(() => {
    setLocalTrackIds(userData?.trackIds || []);
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const tracksSnap = await getDocs(query(collection(db, 'tracks')));
      const fetchedAllTracks = tracksSnap.docs.map(t => ({ id: t.id, ...t.data() }));
      setAllTracks(fetchedAllTracks);
      setTracks(fetchedAllTracks.filter(t => userData?.trackIds?.includes(t.id)));

      if (!userData?.trackIds || userData.trackIds.length === 0) {
        setLoading(false);
        return;
      }

      // Tasks for the student's tracks
      // Note: Firestore 'in' query supports up to 30. We could query all and filter client side.
      const tasksSnap = await getDocs(query(collection(db, 'tasks')));
      const allTasks = tasksSnap.docs.map(t => ({ id: t.id, ...t.data() } as any));
      setTasks(allTasks.filter(t => userData.trackIds?.includes(t.trackId)));

      // Student progress
      const progressSnap = await getDocs(query(collection(db, 'studentProgress'), where('studentId', '==', user?.uid)));
      const pData: Record<string, any> = {};
      progressSnap.docs.forEach(doc => {
          const data = doc.data();
          pData[data.taskId] = { id: doc.id, ...data };
      });
      setProgressData(pData);
      setDrafts(pData); // Initial draft state is actual state

    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'multiple');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = (taskId: string, field: string, value: any) => {
      setDrafts(prev => ({
          ...prev,
          [taskId]: {
              ...prev[taskId],
              taskId: taskId,
              [field]: value
          }
      }));
  };

  const handleSaveProgress = async (taskId: string) => {
    try {
        const draft = drafts[taskId] || { taskId, completed: false };
        const idToSave = progressData[taskId]?.id || `${user?.uid}_${taskId}`;
        const ref = doc(db, 'studentProgress', idToSave);

        let parsedGrade = null;
        if (draft.grade !== undefined && draft.grade !== null && draft.grade !== '') {
            parsedGrade = parseFloat(draft.grade);
            if (isNaN(parsedGrade)) parsedGrade = null;
        }

        await setDoc(ref, {
            studentId: user?.uid,
            taskId: draft.taskId,
            completed: !!draft.completed,
            grade: parsedGrade,
            notes: draft.notes || null,
            updatedAt: serverTimestamp()
        });

        toast.success('מצב מטלה נשמר!');
        const updatedDoc = (await getDocs(query(collection(db, 'studentProgress'), where('studentId', '==', user?.uid), where('taskId', '==', taskId)))).docs[0];
        if (updatedDoc) {
             setProgressData(prev => ({...prev, [taskId]: { id: updatedDoc.id, ...updatedDoc.data() }}));
        }
    } catch(e) {
        toast.error('שגיאה בשמירה');
        handleFirestoreError(e, OperationType.WRITE, `studentProgress`);
    }
  }

  const handleSaveTracks = async () => {
    try {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { trackIds: localTrackIds });
        toast.success('המסלולים עודכנו בהצלחה!');
        setIsManageTracksOpen(false);
    } catch (e) {
        toast.error('שגיאה בעדכון המסלולים');
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (!userData?.trackIds || userData.trackIds.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 p-6">
            <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-16 w-16 overflow-hidden flex items-center justify-center">
                    <object data="/assets/logo.png" type="image/png" className="h-full w-full object-contain">
                        <BookOpen className="text-emerald-600 h-10 w-10"/>
                    </object>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">אזור התלמיד</h1>
                    <p className="text-sm text-slate-500">
                      שלום, {userData?.displayName} <span className="text-slate-300 mx-1">|</span> <span className="text-slate-400" dir="ltr">{userData?.email}</span>
                    </p>
                </div>
                </div>
                <div className="flex items-center gap-4">
                {userData?.role === 'admin' && (
                    <Button variant="secondary" onClick={() => setSimulationRole(null)}>
                    חזרה לתצוגת מנהל
                    </Button>
                )}
                <Button variant="outline" className="flex items-center gap-2" onClick={logout}>
                    <LogOut className="w-4 h-4" /> התנתק
                </Button>
                </div>
            </header>
            <div className="flex items-center justify-center pt-12">
                <Card className="max-w-md w-full text-center py-12 px-6 border-slate-200">
                    <GraduationCap className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ברוך הבא!</h2>
                    <p className="text-slate-500 mb-8">כדי להתחיל לעקוב אחר ההתקדמות שלך, אנא בחר את המסלולים והמגמות אליהם אתה שייך השנה.</p>
                    <ManageTracksDialogComponent 
                        isOpen={isManageTracksOpen}
                        setIsOpen={setIsManageTracksOpen}
                        allTracks={allTracks}
                        localTrackIds={localTrackIds}
                        setLocalTrackIds={setLocalTrackIds}
                        userData={userData}
                        handleSaveTracks={handleSaveTracks}
                    />
                </Card>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-16 w-16 overflow-hidden flex items-center justify-center">
              <object data="/assets/logo.png" type="image/png" className="h-full w-full object-contain">
                 <BookOpen className="text-emerald-600 h-10 w-10"/>
              </object>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">אזור התלמיד</h1>
            <p className="text-sm text-slate-500">
              שלום, {userData?.displayName} <span className="text-slate-300 mx-1">|</span> <span className="text-slate-400" dir="ltr">{userData?.email}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ManageTracksDialogComponent 
              isOpen={isManageTracksOpen}
              setIsOpen={setIsManageTracksOpen}
              allTracks={allTracks}
              localTrackIds={localTrackIds}
              setLocalTrackIds={setLocalTrackIds}
              userData={userData}
              handleSaveTracks={handleSaveTracks}
          />
          {userData?.role === 'admin' && (
            <Button variant="secondary" onClick={() => setSimulationRole(null)}>
              חזרה לתצוגת מנהל
            </Button>
          )}
          <Button variant="outline" className="flex items-center gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" /> התנתק
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-8">
        {tracks.map(track => {
            const trackTasks = tasks.filter(t => t.trackId === track.id);
            const completedCount = trackTasks.filter(t => progressData[t.id]?.completed).length;
            const progressPercent = trackTasks.length > 0 ? (completedCount / trackTasks.length) * 100 : 0;

            return (
                <div key={track.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                        <div>
                           <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 mb-2">{track.category}</Badge>
                           <h2 className="text-2xl font-bold text-slate-800">{track.name}</h2>
                           {track.description && <p className="text-slate-500 mt-1">{track.description}</p>}
                        </div>
                        <div className="text-center bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[120px]">
                            <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">התקדמות במסלול</p>
                            <p className="text-2xl font-bold text-emerald-600">{Math.round(progressPercent)}%</p>
                            <p className="text-xs text-slate-400 mt-0.5">{completedCount} מתוך {trackTasks.length} מטלות</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {trackTasks.map(task => {
                            const prog = drafts[task.id] || { completed: false };
                            const isSaved = progressData[task.id];
                            // Check if current draft differs from saved state
                            let isDirty = false;
                            if (!isSaved && prog.completed) isDirty = true;
                            if (isSaved && (prog.completed !== isSaved.completed || prog.grade != isSaved.grade || prog.notes !== isSaved.notes)) isDirty = true;
                            if (!isSaved && (prog.grade || prog.notes)) isDirty = true;

                            return (
                                <Card key={task.id} className={`border-2 transition-colors ${prog.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
                                    <CardHeader className="py-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                {/* Checkbox trigger update progress */}
                                                <button 
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${prog.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}
                                                    onClick={() => handleUpdateProgress(task.id, 'completed', !prog.completed)}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className={`text-lg transition-colors ${prog.completed ? 'text-emerald-900 line-through opacity-70' : 'text-slate-800'}`}>
                                                    {task.title}
                                                </CardTitle>
                                                {task.description && (
                                                    <p className={`text-sm mt-1 mb-4 ${prog.completed ? 'text-emerald-700/70' : 'text-slate-600'}`}>{task.description}</p>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/50 p-3 rounded-lg border border-slate-100/50 mt-4">
                                                    {task.maxGrade > 0 && (
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-slate-500 font-semibold">ציון שקיבלתי (מתוך {task.maxGrade})</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={prog.grade || ''} 
                                                                onChange={(e) => handleUpdateProgress(task.id, 'grade', e.target.value)}
                                                                placeholder="לדוגמה: 95"
                                                                className="h-9 bg-white"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-slate-500 font-semibold">הערות / הגשה</Label>
                                                        <Input 
                                                            value={prog.notes || ''} 
                                                            onChange={(e) => handleUpdateProgress(task.id, 'notes', e.target.value)}
                                                            placeholder="לינק לגוגל דוקס או הערה..."
                                                            className="h-9 bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                {isDirty && (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveProgress(task.id)}>
                                                            <Save className="w-4 h-4 ml-1.5" /> שמור שינויים
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            )
                        })}
                        {trackTasks.length === 0 && (
                            <p className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl">אין מטלות במסלול זה</p>
                        )}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}
