import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types.ts';
import { api } from '../services/api.ts';
import { TaskModal } from '../components/TaskModal.tsx';
import {
  CheckSquare,
  Clock,
  Coins,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { onDataUpdated } from '../services/liveSync.ts';
import { firebaseTasks } from '../services/firebaseService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { DEFAULT_TASKS_40 } from '../data/defaultCatalog.ts';

interface TasksViewProps {
  onSuccessToast: (msg: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onSuccessToast }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'submissions'>('available');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('সব');

  // 5-Hour Cooldown for Completed Tasks
  const [taskCooldowns, setTaskCooldowns] = useState<Record<string, number>>(() => {
    try {
      const key = `earnova_task_cooldowns_${user?.phone || 'guest'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Ticker for real-time 5-hour countdown display
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync cooldowns on user change
  useEffect(() => {
    try {
      const key = `earnova_task_cooldowns_${user?.phone || 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) setTaskCooldowns(JSON.parse(saved));
    } catch (e) {}
  }, [user?.phone]);

  const markTaskCooldown = (taskId: string) => {
    const updated = { ...taskCooldowns, [taskId]: Date.now() };
    setTaskCooldowns(updated);
    try {
      const key = `earnova_task_cooldowns_${user?.phone || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
  };

  const getTaskRemainingMs = (taskId: string): number => {
    const completedAt = taskCooldowns[taskId];
    if (!completedAt) return 0;
    const remaining = completedAt + 5 * 60 * 60 * 1000 - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  const formatRemainingText = (ms: number): string => {
    if (ms <= 0) return '';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours} ঘণ্টা ${mins} মি.`;
    return `${mins} মি. ${secs} সে.`;
  };

  const fetchTasks = async () => {
    try {
      const [tasksRes, subRes] = await Promise.all([
        api.getTasks().catch((e) => {
          console.warn('getTasks error:', e);
          return { success: false, tasks: [] };
        }),
        api.getMySubmissions().catch((e) => {
          console.warn('getMySubmissions error:', e);
          return { success: false, submissions: [] };
        }),
      ]);
      if (tasksRes.success && tasksRes.tasks && tasksRes.tasks.length >= 10) {
        setTasks(tasksRes.tasks);
      } else {
        setTasks(DEFAULT_TASKS_40);
      }
      if (subRes.success && subRes.submissions) setSubmissions(subRes.submissions);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks(DEFAULT_TASKS_40);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Realtime Firebase Firestore subscription for instant Vercel sync (<500ms)
    const unsubFirebase = firebaseTasks.subscribe((liveTasks) => {
      const targetList = liveTasks && liveTasks.length >= 10 ? liveTasks : DEFAULT_TASKS_40;
      setTasks((prev) => {
        return targetList.map((t) => {
          const existing = prev.find((p) => p.id === t.id);
          return {
            ...t,
            submissionStatus: existing?.submissionStatus || t.submissionStatus || null,
            submittedAt: existing?.submittedAt || t.submittedAt || null,
          };
        });
      });
      setLoading(false);
    });

    // Auto-refresh on local events
    const unsubscribe = onDataUpdated(() => {
      fetchTasks();
    });

    const interval = setInterval(() => {
      fetchTasks();
    }, 10000);

    return () => {
      unsubFirebase();
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleTaskSuccess = (message: string) => {
    if (selectedTask) {
      markTaskCooldown(selectedTask.id);
    }
    onSuccessToast(message);
    fetchTasks();
  };

  const categoryLabels: Record<string, string> = {
    'সব': 'সব টাস্ক',
    'TELEGRAM': '📢 টেলিগ্রাম',
    'SOCIAL': '🌐 সোশ্যাল মিডিয়া',
    'APP': '📱 অ্যাপ জব',
    'SURVEY': '📝 সার্ভে/কুইজ',
    'WEBSITE': '💻 ওয়েবসাইট',
    'OTHER': '⚡ অন্যান্য',
  };

  const categories = ['সব', 'TELEGRAM', 'SOCIAL', 'APP', 'SURVEY', 'WEBSITE', 'OTHER'];

  const filteredTasks =
    filterCategory === 'সব'
      ? tasks
      : tasks.filter((t) => (t.category || '').toUpperCase() === filterCategory.toUpperCase());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">টাস্ক তালিকা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 border border-blue-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">মাইক্রো টাস্ক ও জবস</h2>
              <p className="text-[11px] text-slate-300">সহজ কাজ সম্পূর্ণ করে বেশি টাকা আয় করুন</p>
            </div>
          </div>
          <button
            onClick={fetchTasks}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            title="রিফ্রেশ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Switcher: Available Tasks vs My Submissions */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold mt-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'available'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            উপলব্ধ টাস্ক ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'submissions'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            আমার সাবমিশন ({submissions.length})
          </button>
        </div>
      </div>

      {activeTab === 'available' ? (
        <>
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                  filterCategory === cat
                    ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const remaining5h = getTaskRemainingMs(task.id);
              const isLocked = remaining5h > 0;
              const isApproved = task.submissionStatus === 'APPROVED';
              const isPending = task.submissionStatus === 'PENDING';

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    if (isLocked) {
                      alert(`এই টাস্কটি সম্পন্ন হয়েছে। ${formatRemainingText(remaining5h)} পর এটি স্বয়ংক্রিয়ভাবে আবার আনলক হবে।`);
                      return;
                    }
                    setSelectedTask(task);
                  }}
                  className={`p-4 rounded-2xl bg-slate-900 border transition cursor-pointer group space-y-3 ${
                    isLocked ? 'border-amber-500/30 opacity-90' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                          {task.category}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          ~{task.estimatedMinutes} মিনিট
                        </span>
                        {isLocked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>৫ ঘণ্টা লক ({formatRemainingText(remaining5h)})</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs text-white group-hover:text-blue-300 transition line-clamp-1">
                        {task.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-emerald-400">
                        +৳{task.rewardAmount.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">পুরস্কার</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.totalCompleted}+ জন সম্পন্ন করেছেন</span>
                    </div>

                    <div>
                      {isLocked ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>লক রয়েছে ({formatRemainingText(remaining5h)})</span>
                        </span>
                      ) : isApproved ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>সম্পন্ন</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>যাচাই চলছে</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                          <span>টাস্ক করুন</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Submissions History */
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p>আপনি এখনও কোনো টাস্কের প্রুফ সাবমিট করেননি।</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-white">{sub.taskTitle}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      জমা দেওয়া হয়েছে: {new Date(sub.submittedAt).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-emerald-400">
                      +৳{sub.rewardAmount.toFixed(2)}
                    </span>
                    <div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : sub.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {sub.status === 'APPROVED'
                          ? 'অনুমোদিত'
                          : sub.status === 'PENDING'
                          ? 'অপেক্ষমান'
                          : 'বাতিল'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 font-mono break-all">
                  <span className="text-slate-500 font-sans">প্রমাণ: </span>
                  {sub.proofData}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSuccess={handleTaskSuccess}
      />
    </div>
  );
};
