"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/supabase/profiles";
import type { Profile, ProfileUpdate } from "@/lib/supabase/types";
import { qk } from "@/lib/query-keys";

export function useProfile() {
  return useQuery({ queryKey: qk.profile, queryFn: () => getProfile(getBrowserClient()) });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProfileUpdate }) =>
      updateProfile(getBrowserClient(), id, patch),
    onMutate: async ({ patch }) => {
      await qc.cancelQueries({ queryKey: qk.profile });
      const prev = qc.getQueryData<Profile>(qk.profile);
      if (prev) qc.setQueryData(qk.profile, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.profile, ctx.prev),
    onSuccess: (data) => qc.setQueryData(qk.profile, data),
  });
}
