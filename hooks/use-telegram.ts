"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import { createLinkCode, disconnectTelegram, sendTestMessage } from "@/lib/supabase/telegram";

const sb = () => getBrowserClient();

export function useTelegram() {
  const qc = useQueryClient();
  const createCode = useMutation({ mutationFn: () => createLinkCode(sb()) });
  const disconnect = useMutation({
    mutationFn: () => disconnectTelegram(sb()),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
  const sendTest = useMutation({ mutationFn: () => sendTestMessage(sb()) });
  return { createCode, disconnect, sendTest };
}
