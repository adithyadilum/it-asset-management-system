'use client';

import { useState, useCallback, useEffect } from 'react';
import { searchUsers } from '@/actions/users';
import { searchLocations } from '@/actions/locations';
import { tiqriToast } from '@/components/shared/sonner';
import {
  calculateExpectedReturnDate,
  calculateDurationFromDate,
  CUSTOM_DURATION_VALUE,
} from '@/lib/assignment-date-utils';

export type AssigneeOption = {
  value: string;
  label: string;
};

interface UseAssignmentModalStateProps {
  isOpen: boolean;
  disableUserAssignment?: boolean;
  disableLocationAssignment?: boolean;
}

export function useAssignmentModalState({
  isOpen,
  disableUserAssignment = false,
  disableLocationAssignment = false,
}: UseAssignmentModalStateProps) {
  const [storedAssignmentMode, setAssignmentMode] = useState<
    'user' | 'location'
  >(() =>
    disableLocationAssignment
      ? 'user'
      : disableUserAssignment
        ? 'location'
        : 'user'
  );

  // Corrected as it is read rather than by an effect that calls setState. The
  // effect version renders once with a mode the current selection forbids and
  // then re-renders to fix it, which `react-hooks/set-state-in-effect` rejects
  // and CI fails on.
  const assignmentMode: 'user' | 'location' =
    disableLocationAssignment && storedAssignmentMode === 'location'
      ? 'user'
      : disableUserAssignment && storedAssignmentMode === 'user'
        ? 'location'
        : storedAssignmentMode;
  const [assignee, setAssignee] = useState('');
  const [duration, setDuration] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOptions, setUserOptions] = useState<AssigneeOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<AssigneeOption[]>([]);

  const activeOptions =
    assignmentMode === 'user' ? userOptions : locationOptions;

  const loadOptions = useCallback(async () => {
    try {
      const [usersResult, locationsResult] = await Promise.all([
        searchUsers('', 1000),
        searchLocations('', 1000),
      ]);

      if (!usersResult.success || !locationsResult.success) {
        throw new Error('Failed to load assignment options.');
      }

      setUserOptions(
        (usersResult.data ?? []).map((user) => ({
          value: user.id,
          label: user.name,
        }))
      );

      setLocationOptions(
        (locationsResult.data ?? []).map((location) => ({
          value: String(location.id),
          label: location.name,
        }))
      );
    } catch {
      tiqriToast.error('Failed to load assignment options.');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadOptions();
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, loadOptions]);

  const resetState = useCallback(() => {
    setAssignmentMode(
      disableLocationAssignment
        ? 'user'
        : disableUserAssignment
          ? 'location'
          : 'user'
    );
    setAssignee('');
    setDuration('');
    setExpectedReturn('');
    setNotes('');
  }, [disableUserAssignment, disableLocationAssignment]);

  const handleAssignmentModeChange = useCallback(
    (mode: 'user' | 'location') => {
      setAssignmentMode(mode);
      setAssignee('');
      setDuration('');
      setExpectedReturn('');
    },
    []
  );

  const handleDurationChange = useCallback((value: string) => {
    setDuration(value);

    // 'custom' means the user wants to type a date, so leave whatever is
    // already in the date field alone rather than clearing their work.
    if (value === CUSTOM_DURATION_VALUE) {
      return;
    }

    setExpectedReturn(calculateExpectedReturnDate(value));
  }, []);

  const handleExpectedReturnChange = useCallback((value: string) => {
    setExpectedReturn(value);
    setDuration(calculateDurationFromDate(value));
  }, []);

  const validateAssignment = () => {
    const resolvedAssignmentMode = disableLocationAssignment
      ? 'user'
      : disableUserAssignment
        ? 'location'
        : assignmentMode;

    if (!assignee) {
      tiqriToast.warning(
        resolvedAssignmentMode === 'user'
          ? 'Please select a user.'
          : 'Please select a location.'
      );
      return false;
    }

    if (resolvedAssignmentMode === 'user' && expectedReturn) {
      const [year, month, day] = expectedReturn.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        tiqriToast.error('Select a valid date');
        return false;
      }
    }

    return true;
  };

  return {
    assignmentMode,
    assignee,
    setAssignee,
    duration,
    expectedReturn,
    notes,
    setNotes,
    isSubmitting,
    setIsSubmitting,
    activeOptions,
    resetState,
    handleAssignmentModeChange,
    handleDurationChange,
    handleExpectedReturnChange,
    validateAssignment,
  };
}
