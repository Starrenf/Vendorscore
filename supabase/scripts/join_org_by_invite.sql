CREATE INDEX IF NOT EXISTS idx_org_invites_code
ON public.org_invites (code);

CREATE OR REPLACE FUNCTION public.join_org_by_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite record;
    v_user uuid;
BEGIN

    v_user := auth.uid();

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    SELECT *
    INTO v_invite
    FROM public.org_invites
    WHERE code = p_code
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found or expired';
    END IF;

    IF v_invite.max_uses IS NOT NULL THEN
        IF COALESCE(v_invite.used_count,0) >= v_invite.max_uses THEN
            RAISE EXCEPTION 'Invite maximum uses reached';
        END IF;
    END IF;

    UPDATE public.profiles
    SET organization_id = v_invite.organization_id
    WHERE id = v_user;

    UPDATE public.org_invites
    SET used_count = COALESCE(used_count,0) + 1,
        used_at = now(),
        used_by = v_user
    WHERE id = v_invite.id;

    RETURN v_invite.organization_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.join_org_by_invite(text)
TO authenticated;
