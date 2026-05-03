import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Poll = {
  id: string;
  question: string;
  options: string[];
  allow_multiple: boolean;
};

type Vote = { option_index: number; user_id: string };

export default function PostPoll({
  postId,
  userId,
  initialPoll,
}: {
  postId: string;
  userId?: string | null;
  initialPoll?: {
    id: string;
    question: string;
    options: string[];
    allow_multiple: boolean;
    votes: { option_index: number; user_id: string }[];
  } | null;
}) {
  const [poll, setPoll] = useState<Poll | null>(
    initialPoll
      ? {
          id: initialPoll.id,
          question: initialPoll.question,
          options: initialPoll.options,
          allow_multiple: initialPoll.allow_multiple,
        }
      : null,
  );
  const [votes, setVotes] = useState<Vote[]>(initialPoll?.votes || []);
  const [loading, setLoading] = useState(!initialPoll);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialPoll) return; // already hydrated from parent
    let cancelled = false;
    (async () => {
      const { data: pollRow } = await supabase
        .from("community_polls" as any)
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();
      if (cancelled) return;
      if (!pollRow) {
        setLoading(false);
        return;
      }
      const p = pollRow as any;
      setPoll({
        id: p.id,
        question: p.question,
        options: Array.isArray(p.options) ? p.options : [],
        allow_multiple: !!p.allow_multiple,
      });
      const { data: voteRows } = await supabase
        .from("community_poll_votes" as any)
        .select("option_index, user_id")
        .eq("poll_id", p.id);
      if (cancelled) return;
      setVotes((voteRows as any) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, initialPoll]);

  if (loading || !poll) return null;

  const total = votes.length;
  const myVotes = new Set(
    votes.filter((v) => v.user_id === userId).map((v) => v.option_index),
  );

  const vote = async (idx: number) => {
    if (!userId || submitting) return;
    setSubmitting(true);
    try {
      if (myVotes.has(idx)) {
        await supabase
          .from("community_poll_votes" as any)
          .delete()
          .eq("poll_id", poll.id)
          .eq("user_id", userId)
          .eq("option_index", idx);
      } else {
        if (!poll.allow_multiple && myVotes.size > 0) {
          await supabase
            .from("community_poll_votes" as any)
            .delete()
            .eq("poll_id", poll.id)
            .eq("user_id", userId);
        }
        await supabase.from("community_poll_votes" as any).insert({
          poll_id: poll.id,
          user_id: userId,
          option_index: idx,
        });
      }
      const { data: voteRows } = await supabase
        .from("community_poll_votes" as any)
        .select("option_index, user_id")
        .eq("poll_id", poll.id);
      setVotes((voteRows as any) || []);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-violet-500 mb-2">
        <BarChart3 className="w-3.5 h-3.5" />
        Poll {poll.allow_multiple && <span className="text-muted-foreground font-normal">· multiple choice</span>}
      </div>
      <p className="text-[14px] font-semibold text-foreground mb-3">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt, idx) => {
          const count = votes.filter((v) => v.option_index === idx).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const mine = myVotes.has(idx);
          return (
            <button
              key={idx}
              onClick={() => vote(idx)}
              disabled={!userId || submitting}
              className={cn(
                "relative w-full text-left px-3 py-2 rounded-lg border transition-colors overflow-hidden",
                mine ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50",
                !userId && "cursor-not-allowed opacity-80",
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all",
                  mine ? "bg-primary/10" : "bg-muted",
                )}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn("text-[13px]", mine ? "font-semibold text-primary" : "text-foreground")}>
                  {opt}
                </span>
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {pct}% · {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {total} {total === 1 ? "vote" : "votes"}
        {!userId && " · sign in to vote"}
      </p>
    </div>
  );
}
