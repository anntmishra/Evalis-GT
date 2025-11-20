import React from 'react';
import clsx from 'clsx';
import { TimetableSlot } from '../../types/university';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const DEFAULT_DAYS = [
  { index: 0, name: 'Monday' },
  { index: 1, name: 'Tuesday' },
  { index: 2, name: 'Wednesday' },
  { index: 3, name: 'Thursday' },
  { index: 4, name: 'Friday' }
];

const DEFAULT_SLOTS = [
  { slotIndex: 0, label: '09:00 - 09:50' },
  { slotIndex: 1, label: '10:00 - 10:50' },
  { slotIndex: 2, label: '11:00 - 11:50' },
  { slotIndex: 3, label: '12:30 - 13:20' },
  { slotIndex: 4, label: '13:30 - 14:20' },
  { slotIndex: 5, label: '14:30 - 15:20' },
  { slotIndex: 6, label: '15:30 - 16:20' }
];

interface TimetableGridProps {
  slots?: TimetableSlot[];
  days?: { index: number; name: string }[];
  slotTemplates?: { slotIndex: number; label: string; startTime?: string; endTime?: string }[];
  title?: string;
  highlightSection?: string | null;
<<<<<<< HEAD
  editable?: boolean;
  onSlotClick?: (slot: TimetableSlot) => void;
  onEmptySlotClick?: (dayIndex: number, slotIndex: number) => void;
=======
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
}

const TimetableGrid: React.FC<TimetableGridProps> = ({
  slots = [],
  days = DEFAULT_DAYS,
  slotTemplates = DEFAULT_SLOTS,
  title = 'Weekly Schedule',
<<<<<<< HEAD
  highlightSection,
  editable = false,
  onSlotClick,
  onEmptySlotClick
=======
  highlightSection
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
}) => {
  const slotMap: Record<string, TimetableSlot[]> = {};
  slots.forEach(slot => {
    const key = `${slot.dayOfWeek}-${slot.slotIndex}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(slot);
  });

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 z-10">
                Time
              </th>
              {days.map(day => (
                <th
                  key={day.index}
                  className="border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700"
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotTemplates.map(template => (
              <tr key={template.slotIndex}>
                <td className="border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 z-10">
                  {template.label}
                </td>
                {days.map(day => {
                  const key = `${day.index}-${template.slotIndex}`;
                  const slotEntries = slotMap[key] || [];
                  return (
                    <td key={key} className="border border-gray-200 align-top">
                      {slotEntries.length === 0 ? (
<<<<<<< HEAD
                        <div className="px-3 py-3">
                          {editable ? (
                            <button
                              type="button"
                              onClick={() => onEmptySlotClick?.(day.index, template.slotIndex)}
                              className="w-full rounded-md border border-dashed border-gray-300 px-2 py-4 text-xs font-medium text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                              Add class
                            </button>
                          ) : (
                            <div className="text-xs text-gray-400 italic">Free</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 px-3 py-3">
                          {slotEntries.map(entry => {
                            const card = (
                              <div
                                className={clsx(
                                  'w-full rounded-lg border p-3 text-left text-xs shadow-sm transition-all',
                                  highlightSection && entry.section === highlightSection
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-transparent bg-gray-50',
                                  editable ? 'hover:border-blue-400 hover:bg-blue-50 hover:shadow' : ''
                                )}
                                style={{ borderLeft: `4px solid ${entry.color || '#6366f1'}` }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {entry.subject?.name || entry.subjectId}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {entry.section || 'Section'}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-gray-600">
                                  {entry.teacher?.name || entry.teacherId}
                                </div>
                                {entry.sessionLabel && (
                                  <div className="mt-1 text-[11px] text-gray-500">
                                    {entry.sessionLabel}
                                  </div>
                                )}
                              </div>
                            );

                            if (!editable) {
                              return (
                                <div key={entry.id}>
                                  {card}
                                </div>
                              );
                            }

                            return (
                              <button
                                type="button"
                                key={entry.id}
                                onClick={() => onSlotClick?.(entry)}
                                className="w-full focus:outline-none"
                              >
                                {card}
                              </button>
                            );
                          })}
=======
                        <div className="px-3 py-3 text-xs text-gray-400 italic">Free</div>
                      ) : (
                        <div className="space-y-2 px-3 py-3">
                          {slotEntries.map(entry => (
                            <div
                              key={entry.id}
                              className={clsx(
                                'rounded-lg border p-3 text-xs shadow-sm transition-all',
                                highlightSection && entry.section === highlightSection
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-transparent bg-gray-50'
                              )}
                              style={{ borderLeft: `4px solid ${entry.color || '#6366f1'}` }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900">
                                  {entry.subject?.name || entry.subjectId}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {entry.section || 'Section'}
                                </Badge>
                              </div>
                              <div className="mt-1 text-gray-600">
                                {entry.teacher?.name || entry.teacherId}
                              </div>
                              {entry.sessionLabel && (
                                <div className="mt-1 text-[11px] text-gray-500">
                                  {entry.sessionLabel}
                                </div>
                              )}
                            </div>
                          ))}
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default TimetableGrid;
