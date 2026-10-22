-- ============================================================================
-- LAB ATIVIDADE RECENTE & TEMPO DE USO (SESSÕES E ESTATÍSTICAS)
-- Permite registrar uso de ferramentas, calcular horas totais e listar
-- atividade recente no perfil (/profile) e no painel de administração.
-- ============================================================================

-- 1. Colunas de atividade em public.user_tools
ALTER TABLE public.user_tools 
  ADD COLUMN IF NOT EXISTS last_played_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS playtime_minutes integer NOT NULL DEFAULT 0;

-- 2. Tabela de histórico de sessões
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_slug text NOT NULL REFERENCES public.lab_tools(slug) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.user_activity_log'::regclass AND polname = 'user_activity_log_select_own'
  ) THEN
    CREATE POLICY user_activity_log_select_own ON public.user_activity_log
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Registrar atividade ao abrir/usar ferramenta
CREATE OR REPLACE FUNCTION public.record_tool_activity(
  p_slug text,
  p_minutes integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  -- Limita cada registro a no máximo 60 minutos e no mínimo 1 minuto por heartbeat
  v_mins integer := least(greatest(coalesce(p_minutes, 1), 1), 60);
  v_res record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lab_tools WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Ferramenta % não encontrada', p_slug;
  END IF;

  -- Trava de segurança: impede aquisição indevida ou elevação de privilégios via heartbeat
  IF NOT EXISTS (SELECT 1 FROM public.user_tools WHERE user_id = v_uid AND tool_slug = p_slug) THEN
    RAISE EXCEPTION 'Esta ferramenta não pertence à sua biblioteca.' USING errcode = '42501';
  END IF;

  UPDATE public.user_tools
  SET
    last_played_at = now(),
    playtime_minutes = coalesce(public.user_tools.playtime_minutes, 0) + v_mins
  WHERE user_id = v_uid AND tool_slug = p_slug
  RETURNING tool_slug, playtime_minutes, last_played_at, extract(epoch from last_played_at)::bigint as last_played_unix
  INTO v_res;

  INSERT INTO public.user_activity_log (user_id, tool_slug, started_at, duration_minutes)
  VALUES (v_uid, p_slug, now(), v_mins);

  RETURN jsonb_build_object(
    'tool_slug', v_res.tool_slug,
    'playtime_minutes', v_res.playtime_minutes,
    'last_played_at', v_res.last_played_at,
    'last_played_unix', v_res.last_played_unix
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_tool_activity(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tool_activity(text, integer) TO authenticated;

-- 4. Buscar atividade do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_my_tool_activities()
RETURNS TABLE (
  tool_slug text,
  appid integer,
  last_played_at timestamptz,
  last_played_unix bigint,
  playtime_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ut.tool_slug,
    lt.appid,
    ut.last_played_at,
    COALESCE(EXTRACT(epoch FROM ut.last_played_at)::bigint, 0) AS last_played_unix,
    COALESCE(ut.playtime_minutes, 0) AS playtime_minutes
  FROM public.user_tools ut
  JOIN public.lab_tools lt ON lt.slug = ut.tool_slug
  WHERE ut.user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_tool_activities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_tool_activities() TO authenticated;

-- 5. Consulta administrativa de atividades de um usuário
CREATE OR REPLACE FUNCTION public.admin_get_user_activities(p_user_id uuid)
RETURNS TABLE (
  tool_slug text,
  tool_name text,
  appid integer,
  last_played_at timestamptz,
  last_played_unix bigint,
  playtime_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_lab_admin() OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver atividades de outros membros.';
  END IF;

  RETURN QUERY
  SELECT 
    lt.slug AS tool_slug,
    lt.name AS tool_name,
    lt.appid,
    ut.last_played_at,
    COALESCE(EXTRACT(epoch FROM ut.last_played_at)::bigint, 0) AS last_played_unix,
    COALESCE(ut.playtime_minutes, 0) AS playtime_minutes
  FROM public.lab_tools lt
  LEFT JOIN public.user_tools ut ON ut.tool_slug = lt.slug AND ut.user_id = p_user_id
  ORDER BY ut.last_played_at DESC NULLS LAST, lt.appid ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_activities(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_activities(uuid) TO authenticated;

-- 6. Atualização/Ajuste manual de atividade por administradores
CREATE OR REPLACE FUNCTION public.admin_update_tool_activity(
  p_user_id uuid,
  p_slug text,
  p_playtime_minutes integer,
  p_last_played_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_lab_admin() OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem atualizar atividades.';
  END IF;

  INSERT INTO public.user_tools (user_id, tool_slug, acquired_at, source, last_played_at, playtime_minutes)
  VALUES (p_user_id, p_slug, now(), 'admin_adjustment', p_last_played_at, GREATEST(p_playtime_minutes, 0))
  ON CONFLICT (user_id, tool_slug) DO UPDATE
  SET
    last_played_at = EXCLUDED.last_played_at,
    playtime_minutes = GREATEST(p_playtime_minutes, 0);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'tool_slug', p_slug,
    'playtime_minutes', GREATEST(p_playtime_minutes, 0),
    'last_played_at', p_last_played_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_tool_activity(uuid, text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_tool_activity(uuid, text, integer, timestamptz) TO authenticated;
