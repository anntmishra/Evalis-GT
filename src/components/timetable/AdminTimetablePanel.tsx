<<<<<<< HEAD
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Trash2,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Pencil,
  PlusCircle
} from 'lucide-react';
=======
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, UploadCloud, Trash2, CheckCircle2, Eye, AlertTriangle } from 'lucide-react';
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
<<<<<<< HEAD
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import TimetableGrid from './TimetableGrid';
import { Timetable, TimetableSlot, Subject, Teacher } from '../../types/university';
=======
import TimetableGrid from './TimetableGrid';
import { Timetable, TimetableSlot } from '../../types/university';
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
import { getAllSemesters } from '../../api/semesterService';
import { getAllBatches } from '../../api/batchService';
import {
  deleteTimetable,
  fetchTimetableById,
  fetchTimetables,
  generateTimetable,
<<<<<<< HEAD
  updateTimetableStatus,
  createTimetableSlot,
  updateTimetableSlot,
  removeTimetableSlot,
  ManualTimetableSlotPayload
} from '../../api/timetableService';
import { getSubjectsBySemester } from '../../api/subjectService';
import { getTeachers } from '../../api/teacherService';
=======
  updateTimetableStatus
} from '../../api/timetableService';
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95

interface BatchOption {
  id: string;
  name: string;
  department?: string;
}

const STATUS_BADGES: Record<Timetable['status'], string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-purple-100 text-purple-700 border-purple-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200'
};

const extractErrorMessage = (error: any, fallback: string) => (
  error?.response?.data?.message || error?.message || fallback
);

const AdminTimetablePanel: React.FC = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<number | null>(null);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [unscheduled, setUnscheduled] = useState<any[]>([]);

  const selectedSemester = useMemo(() => semesters.find((sem: any) => sem.id === selectedSemesterId), [semesters, selectedSemesterId]);
  const selectedBatch = useMemo(() => batches.find(batch => batch.id === selectedBatchId), [batches, selectedBatchId]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    const [semesterResult, batchResult, timetableResult] = await Promise.allSettled([
      getAllSemesters(),
      getAllBatches(),
      fetchTimetables({ includeSlots: false })
    ]);

    if (semesterResult.status === 'fulfilled') {
      setSemesters(semesterResult.value || []);
    } else {
  console.error('Failed to load semesters', semesterResult.reason);
      setSemesters([]);
  setError(prev => prev || extractErrorMessage(semesterResult.reason, 'Failed to load semesters'));
    }

    if (batchResult.status === 'fulfilled') {
      setBatches(batchResult.value || []);
    } else {
      console.error('Failed to load batches', batchResult.reason);
      setBatches([]);
  setError(prev => prev || extractErrorMessage(batchResult.reason, 'Failed to load batches'));
    }

    if (timetableResult.status === 'fulfilled') {
      const fetchedTimetables = timetableResult.value?.data || [];
      setTimetables(fetchedTimetables);
      if (fetchedTimetables.length) {
        setSelectedTimetableId(fetchedTimetables[0].id);
      } else {
        setSelectedTimetableId(null);
      }
    } else {
      console.error('Failed to load timetables', timetableResult.reason);
      setTimetables([]);
      setSelectedTimetableId(null);
      setError(prev => prev || extractErrorMessage(timetableResult.reason, 'Failed to load timetables'));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const fetchSelectedTimetable = async () => {
      if (!selectedTimetableId) {
        setSelectedTimetable(null);
        return;
      }
      try {
        const response = await fetchTimetableById(selectedTimetableId);
        setSelectedTimetable(response.data);
        const metadataUnscheduled = response.data?.metadata?.unscheduled || [];
        setUnscheduled(metadataUnscheduled);
      } catch (err: any) {
        console.error('Failed to get timetable details', err);
        setError(err?.response?.data?.message || 'Failed to load timetable details');
      }
    };

    fetchSelectedTimetable();
  }, [selectedTimetableId]);

  const handleGenerate = async () => {
    if (!selectedSemesterId) {
      setError('Select a semester to generate timetable');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const payload = {
        semesterId: selectedSemesterId,
        batchId: selectedBatchId || undefined,
        name: planName || undefined,
        options: {
          defaultSessionsPerWeek: 3
        }
      };
      const response = await generateTimetable(payload);
      const newTimetable = response?.data?.timetable;
      const unscheduledSessions = response?.data?.unscheduled || [];
      setUnscheduled(unscheduledSessions);
      await loadInitialData();
      if (newTimetable?.id) {
        setSelectedTimetableId(newTimetable.id);
      }
    } catch (err: any) {
      console.error('Timetable generation failed', err);
      setError(err?.response?.data?.message || err.message || 'Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: number, status: Timetable['status']) => {
    try {
      await updateTimetableStatus(id, status);
      await loadInitialData();
      setSelectedTimetableId(id);
    } catch (err: any) {
      console.error('Failed to update timetable status', err);
      setError(err?.response?.data?.message || 'Failed to update timetable status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this timetable? This action cannot be undone.')) return;
    try {
      await deleteTimetable(id);
      await loadInitialData();
      setSelectedTimetableId(null);
    } catch (err: any) {
      console.error('Failed to delete timetable', err);
      setError(err?.response?.data?.message || 'Failed to delete timetable');
    }
  };

  const activeSlots: TimetableSlot[] = selectedTimetable?.slots || [];
  const timetableMetadata = selectedTimetable?.metadata || {};

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">AI Timetable Generation</CardTitle>
            <CardDescription>Generate clash-free schedules using the graph intelligence engine</CardDescription>
          </div>
          <Button onClick={loadInitialData} variant="outline" size="sm" disabled={loading || generating}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2 space-y-3">
            <label className="text-sm font-medium text-gray-700">Semester</label>
            <select
              value={selectedSemesterId}
              onChange={event => setSelectedSemesterId(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Select semester</option>
              {semesters.map((sem: any) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} • Batch {sem.batchId}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {selectedSemester
                ? `Active: ${new Date(selectedSemester.startDate).toLocaleDateString()} - ${new Date(selectedSemester.endDate).toLocaleDateString()}`
                : 'Choose the academic term to generate a timetable for'}
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="text-sm font-medium text-gray-700">Batch (optional)</label>
            <select
              value={selectedBatchId}
              onChange={event => setSelectedBatchId(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Auto (semester batch)</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                  {batch.department ? ` • ${batch.department}` : ''}
                </option>
              ))}
            </select>
            {selectedBatch && (
              <p className="text-xs text-gray-500">Selected batch: {selectedBatch.name}</p>
            )}
          </div>

          <div className="md:col-span-1 space-y-3">
            <label className="text-sm font-medium text-gray-700">Plan Name</label>
            <Input
              placeholder="e.g., Fall 2025 Master Plan"
              value={planName}
              onChange={event => setPlanName(event.target.value)}
            />
            <Button
              className="w-full bg-black text-white hover:bg-gray-800"
              onClick={handleGenerate}
              disabled={generating || loading}
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate AI Timetable
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UploadCloud className="h-5 w-5" /> Generated Timetables
              </CardTitle>
              <CardDescription>Review, publish, or archive generated schedules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-600">Loading timetables…</span>
                </div>
              ) : timetables.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No timetables generated yet. Use the generator above to create your first plan.
                </div>
              ) : (
                <div className="space-y-3">
                  {timetables.map(timetable => (
                    <div
                      key={timetable.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-all ${
                        selectedTimetableId === timetable.id ? 'border-black shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTimetableId(timetable.id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{timetable.name}</h3>
                          <p className="text-xs text-gray-500">
                            Semester {timetable.semesterId} • Last updated{' '}
                            {timetable.updatedAt ? new Date(timetable.updatedAt).toLocaleString() : 'recently'}
                          </p>
                        </div>
                        <Badge className={STATUS_BADGES[timetable.status] || STATUS_BADGES.draft}>
                          {timetable.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        {timetable.metrics && (
                          <>
                            <span>{timetable.metrics.scheduledSessions} sessions scheduled</span>
                            <span>•</span>
                            <span>{timetable.metrics.unscheduledSessions} conflicts</span>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                          onClick={event => {
                            event.stopPropagation();
                            setSelectedTimetableId(timetable.id);
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={event => {
                            event.stopPropagation();
                            handlePublish(timetable.id, 'published');
                          }}
                          disabled={timetable.status === 'published'}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                          onClick={event => {
                            event.stopPropagation();
                            handlePublish(timetable.id, 'active');
                          }}
                        >
                          <Sparkles className="mr-1 h-4 w-4" /> Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={event => {
                            event.stopPropagation();
                            handleDelete(timetable.id);
                          }}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTimetable && (
            <TimetableGrid
              slots={activeSlots}
              days={timetableMetadata.days}
              slotTemplates={timetableMetadata.slots?.map((slot: any) => ({
                slotIndex: slot.slotIndex,
                label: `${slot.startTime || ''} ${slot.endTime ? `- ${slot.endTime}` : ''}`.trim() || slot.label,
                startTime: slot.startTime,
                endTime: slot.endTime
              }))}
              highlightSection={selectedBatchId || selectedTimetable.batchId || null}
              title={selectedTimetable.name || 'Generated Timetable'}
            />
          )}
        </div>

        <div className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Unscheduled Sessions
              </CardTitle>
              <CardDescription>
                Sessions that could not be placed automatically due to conflicts or missing data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unscheduled.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  All sessions scheduled successfully. Great job!
                </div>
              ) : (
                <div className="space-y-3">
                  {unscheduled.map((item, index) => (
                    <div key={`unscheduled-${index}`} className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs">
                      <div className="font-semibold text-orange-800">{item.session?.subjectName || item.session?.subjectId}</div>
                      <div className="mt-1 text-orange-700">
                        {item.reason || 'Reason unknown'}
                      </div>
                      {item.session?.teacherName && (
                        <div className="mt-1 text-orange-600">Teacher: {item.session.teacherName}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTimetable && selectedTimetable.metrics && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Generation Metrics</CardTitle>
                <CardDescription>Insights from the graph scheduling engine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Scheduled Sessions</span>
                  <Badge variant="outline">{selectedTimetable.metrics.scheduledSessions}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Requested Sessions</span>
                  <Badge variant="outline">{selectedTimetable.metrics.requestedSessions}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Conflicts Detected</span>
                  <Badge variant="outline" className="border-orange-200 text-orange-700">
                    {selectedTimetable.metrics.unscheduledSessions}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Generation Strategy</span>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    {selectedTimetable.metrics.generationStrategy}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTimetablePanel;
