ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS inapp_community_reply boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_community_reply boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.notify_community_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _post record;
  _enabled boolean;
  _author text;
BEGIN
  SELECT id, user_id, COALESCE(title, left(body, 60)) AS title
    INTO _post
  FROM public.community_posts WHERE id = NEW.post_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Don't notify on self-reply
  IF _post.user_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(inapp_community_reply, true) INTO _enabled
    FROM public.notification_preferences WHERE user_id = _post.user_id;
  IF _enabled IS NULL THEN _enabled := true; END IF;
  IF NOT _enabled THEN RETURN NEW; END IF;

  _author := COALESCE(NULLIF(NEW.author_name, ''), 'Someone');

  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (
    _post.user_id,
    'community_reply',
    _author || ' replied to your post',
    COALESCE(_post.title, 'Open the discussion to read the reply.'),
    '/community/' || _post.id::text,
    jsonb_build_object('post_id', _post.id, 'reply_id', NEW.id)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_community_reply ON public.community_replies;
CREATE TRIGGER trg_notify_community_reply
  AFTER INSERT ON public.community_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_reply();