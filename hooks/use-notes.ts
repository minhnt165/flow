"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/supabase/notes";
import type { NoteInput } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useNotes() {
  return useQuery({ queryKey: qk.notes, queryFn: () => listNotes(sb()) });
}

function useInvalidateNotes() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.notes });
}

export function useSaveNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: NoteInput }) =>
      id ? updateNote(sb(), id, input) : createNote(sb(), input),
    onSettled: invalidate,
  });
}

export function usePinNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      updateNote(sb(), id, { pinned }),
    onSettled: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (id: string) => deleteNote(sb(), id), onSettled: invalidate });
}
