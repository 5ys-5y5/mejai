-- Add created_by columns where missing
alter table public."B_bot_knowledge_bases" add column if not exists created_by uuid;
alter table public."B_chat_widgets" add column if not exists created_by uuid;
alter table public."C_mcp_tools" add column if not exists created_by uuid;

-- Add permission columns where missing
alter table public."B_bot_agents" add column if not exists owner_user_ids uuid[] not null default '{}'::uuid[];
alter table public."B_bot_agents" add column if not exists allowed_user_ids uuid[] not null default '{}'::uuid[];

alter table public."B_bot_knowledge_bases" add column if not exists owner_user_ids uuid[] not null default '{}'::uuid[];
alter table public."B_bot_knowledge_bases" add column if not exists allowed_user_ids uuid[] not null default '{}'::uuid[];

alter table public."B_chat_widgets" add column if not exists owner_user_ids uuid[] not null default '{}'::uuid[];
alter table public."B_chat_widgets" add column if not exists allowed_user_ids uuid[] not null default '{}'::uuid[];

alter table public."C_mcp_tools" add column if not exists owner_user_ids uuid[] not null default '{}'::uuid[];
alter table public."C_mcp_tools" add column if not exists allowed_user_ids uuid[] not null default '{}'::uuid[];

-- Add FK constraints for created_by if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'b_bot_knowledge_bases_created_by_fk'
  ) THEN
    ALTER TABLE public."B_bot_knowledge_bases"
      ADD CONSTRAINT b_bot_knowledge_bases_created_by_fk
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'b_chat_widgets_created_by_fk'
  ) THEN
    ALTER TABLE public."B_chat_widgets"
      ADD CONSTRAINT b_chat_widgets_created_by_fk
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'c_mcp_tools_created_by_fk'
  ) THEN
    ALTER TABLE public."C_mcp_tools"
      ADD CONSTRAINT c_mcp_tools_created_by_fk
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Ensure higher permissions are reflected in lower columns
CREATE OR REPLACE FUNCTION public.trg_enforce_permission_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_created_by uuid;
  v_owner_ids uuid[];
  v_allowed_ids uuid[];
BEGIN
  v_created_by := NEW.created_by;

  v_owner_ids := COALESCE(NEW.owner_user_ids, '{}'::uuid[]);
  IF v_created_by IS NOT NULL THEN
    v_owner_ids := ARRAY(
      SELECT DISTINCT UNNEST(v_owner_ids || v_created_by)
    );
  END IF;

  v_allowed_ids := COALESCE(NEW.allowed_user_ids, '{}'::uuid[]);
  v_allowed_ids := ARRAY(
    SELECT DISTINCT UNNEST(v_allowed_ids || v_owner_ids)
  );

  NEW.owner_user_ids := v_owner_ids;
  NEW.allowed_user_ids := v_allowed_ids;

  RETURN NEW;
END;
$$;

-- Propagate agent owner permissions down to KB/MCP/Widget when those have no permissions
CREATE OR REPLACE FUNCTION public.trg_sync_agent_child_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_agent_owner_ids uuid[];
  v_mcp_tool_ids uuid[];
BEGIN
  v_agent_owner_ids := ARRAY(
    SELECT DISTINCT UNNEST(
      COALESCE(NEW.owner_user_ids, '{}'::uuid[])
      || COALESCE(ARRAY[NEW.created_by], '{}'::uuid[])
    )
  );

  IF COALESCE(array_length(v_agent_owner_ids, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- KB: only grant if KB has no permissions at all
  IF NEW.kb_id IS NOT NULL THEN
    UPDATE public."B_bot_knowledge_bases" kb
      SET allowed_user_ids = ARRAY(
        SELECT DISTINCT UNNEST(COALESCE(kb.allowed_user_ids, '{}'::uuid[]) || v_agent_owner_ids)
      )
    WHERE kb.id = NEW.kb_id
      AND kb.created_by IS NULL
      AND COALESCE(array_length(kb.owner_user_ids, 1), 0) = 0
      AND COALESCE(array_length(kb.allowed_user_ids, 1), 0) = 0;
  END IF;

  -- Widgets: only grant if widget has no permissions at all
  UPDATE public."B_chat_widgets" w
    SET allowed_user_ids = ARRAY(
      SELECT DISTINCT UNNEST(COALESCE(w.allowed_user_ids, '{}'::uuid[]) || v_agent_owner_ids)
    )
  WHERE w.agent_id = NEW.id
    AND w.created_by IS NULL
    AND COALESCE(array_length(w.owner_user_ids, 1), 0) = 0
    AND COALESCE(array_length(w.allowed_user_ids, 1), 0) = 0;

  -- MCP tools: extract UUIDs from jsonb array and grant only if tool has no permissions
  SELECT ARRAY(
    SELECT value::uuid
    FROM jsonb_array_elements_text(COALESCE(NEW.mcp_tool_ids, '[]'::jsonb)) AS t(value)
    WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) INTO v_mcp_tool_ids;

  IF COALESCE(array_length(v_mcp_tool_ids, 1), 0) > 0 THEN
    UPDATE public."C_mcp_tools" t
      SET allowed_user_ids = ARRAY(
        SELECT DISTINCT UNNEST(COALESCE(t.allowed_user_ids, '{}'::uuid[]) || v_agent_owner_ids)
      )
    WHERE t.id = ANY(v_mcp_tool_ids)
      AND t.created_by IS NULL
      AND COALESCE(array_length(t.owner_user_ids, 1), 0) = 0
      AND COALESCE(array_length(t.allowed_user_ids, 1), 0) = 0;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers: enforce hierarchy on each table
DROP TRIGGER IF EXISTS trg_enforce_permission_hierarchy ON public."B_bot_agents";
CREATE TRIGGER trg_enforce_permission_hierarchy
  BEFORE INSERT OR UPDATE ON public."B_bot_agents"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_permission_hierarchy();

DROP TRIGGER IF EXISTS trg_enforce_permission_hierarchy ON public."B_bot_knowledge_bases";
CREATE TRIGGER trg_enforce_permission_hierarchy
  BEFORE INSERT OR UPDATE ON public."B_bot_knowledge_bases"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_permission_hierarchy();

DROP TRIGGER IF EXISTS trg_enforce_permission_hierarchy ON public."B_chat_widgets";
CREATE TRIGGER trg_enforce_permission_hierarchy
  BEFORE INSERT OR UPDATE ON public."B_chat_widgets"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_permission_hierarchy();

DROP TRIGGER IF EXISTS trg_enforce_permission_hierarchy ON public."C_mcp_tools";
CREATE TRIGGER trg_enforce_permission_hierarchy
  BEFORE INSERT OR UPDATE ON public."C_mcp_tools"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_permission_hierarchy();

-- Trigger: sync agent permissions to children
DROP TRIGGER IF EXISTS trg_sync_agent_child_permissions ON public."B_bot_agents";
CREATE TRIGGER trg_sync_agent_child_permissions
  AFTER INSERT OR UPDATE OF owner_user_ids, created_by, kb_id, mcp_tool_ids
  ON public."B_bot_agents"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_agent_child_permissions();

-- Backfill: owners include creator
UPDATE public."B_bot_agents"
  SET owner_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(
      COALESCE(owner_user_ids, '{}'::uuid[])
      || COALESCE(ARRAY[created_by], '{}'::uuid[])
    )
  )
WHERE created_by IS NOT NULL AND NOT (created_by = ANY(owner_user_ids));

UPDATE public."B_bot_knowledge_bases"
  SET owner_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(
      COALESCE(owner_user_ids, '{}'::uuid[])
      || COALESCE(ARRAY[created_by], '{}'::uuid[])
    )
  )
WHERE created_by IS NOT NULL AND NOT (created_by = ANY(owner_user_ids));

UPDATE public."B_chat_widgets"
  SET owner_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(
      COALESCE(owner_user_ids, '{}'::uuid[])
      || COALESCE(ARRAY[created_by], '{}'::uuid[])
    )
  )
WHERE created_by IS NOT NULL AND NOT (created_by = ANY(owner_user_ids));

UPDATE public."C_mcp_tools"
  SET owner_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(
      COALESCE(owner_user_ids, '{}'::uuid[])
      || COALESCE(ARRAY[created_by], '{}'::uuid[])
    )
  )
WHERE created_by IS NOT NULL AND NOT (created_by = ANY(owner_user_ids));

-- Backfill: allowed includes owners
UPDATE public."B_bot_agents"
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(allowed_user_ids, '{}'::uuid[]) || COALESCE(owner_user_ids, '{}'::uuid[]))
  )
WHERE EXISTS (
  SELECT 1 FROM UNNEST(COALESCE(owner_user_ids, '{}'::uuid[])) o
  WHERE NOT (o = ANY(COALESCE(allowed_user_ids, '{}'::uuid[])))
);

UPDATE public."B_bot_knowledge_bases"
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(allowed_user_ids, '{}'::uuid[]) || COALESCE(owner_user_ids, '{}'::uuid[]))
  )
WHERE EXISTS (
  SELECT 1 FROM UNNEST(COALESCE(owner_user_ids, '{}'::uuid[])) o
  WHERE NOT (o = ANY(COALESCE(allowed_user_ids, '{}'::uuid[])))
);

UPDATE public."B_chat_widgets"
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(allowed_user_ids, '{}'::uuid[]) || COALESCE(owner_user_ids, '{}'::uuid[]))
  )
WHERE EXISTS (
  SELECT 1 FROM UNNEST(COALESCE(owner_user_ids, '{}'::uuid[])) o
  WHERE NOT (o = ANY(COALESCE(allowed_user_ids, '{}'::uuid[])))
);

UPDATE public."C_mcp_tools"
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(allowed_user_ids, '{}'::uuid[]) || COALESCE(owner_user_ids, '{}'::uuid[]))
  )
WHERE EXISTS (
  SELECT 1 FROM UNNEST(COALESCE(owner_user_ids, '{}'::uuid[])) o
  WHERE NOT (o = ANY(COALESCE(allowed_user_ids, '{}'::uuid[])))
);

-- Backfill: grant agent owners to KB only when it has no permissions
WITH agent_owners AS (
  SELECT
    id AS agent_id,
    kb_id,
    ARRAY(
      SELECT DISTINCT UNNEST(
        COALESCE(owner_user_ids, '{}'::uuid[])
        || COALESCE(ARRAY[created_by], '{}'::uuid[])
      )
    ) AS owner_ids
  FROM public."B_bot_agents"
)
UPDATE public."B_bot_knowledge_bases" kb
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(kb.allowed_user_ids, '{}'::uuid[]) || ao.owner_ids)
  )
FROM agent_owners ao
WHERE kb.id = ao.kb_id
  AND COALESCE(array_length(ao.owner_ids, 1), 0) > 0
  AND kb.created_by IS NULL
  AND COALESCE(array_length(kb.owner_user_ids, 1), 0) = 0
  AND COALESCE(array_length(kb.allowed_user_ids, 1), 0) = 0;

-- Backfill: grant agent owners to widgets only when they have no permissions
WITH agent_owners AS (
  SELECT
    id AS agent_id,
    ARRAY(
      SELECT DISTINCT UNNEST(
        COALESCE(owner_user_ids, '{}'::uuid[])
        || COALESCE(ARRAY[created_by], '{}'::uuid[])
      )
    ) AS owner_ids
  FROM public."B_bot_agents"
)
UPDATE public."B_chat_widgets" w
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(w.allowed_user_ids, '{}'::uuid[]) || ao.owner_ids)
  )
FROM agent_owners ao
WHERE w.agent_id = ao.agent_id
  AND COALESCE(array_length(ao.owner_ids, 1), 0) > 0
  AND w.created_by IS NULL
  AND COALESCE(array_length(w.owner_user_ids, 1), 0) = 0
  AND COALESCE(array_length(w.allowed_user_ids, 1), 0) = 0;

-- Backfill: grant agent owners to MCP tools only when they have no permissions
WITH agent_owners AS (
  SELECT
    mcp_tool_ids,
    ARRAY(
      SELECT DISTINCT UNNEST(
        COALESCE(owner_user_ids, '{}'::uuid[])
        || COALESCE(ARRAY[created_by], '{}'::uuid[])
      )
    ) AS owner_ids
  FROM public."B_bot_agents"
),
agent_mcp AS (
  SELECT
    ao.owner_ids,
    value::uuid AS tool_id
  FROM agent_owners ao,
    LATERAL jsonb_array_elements_text(COALESCE(ao.mcp_tool_ids, '[]'::jsonb)) AS t(value)
  WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
UPDATE public."C_mcp_tools" t
  SET allowed_user_ids = ARRAY(
    SELECT DISTINCT UNNEST(COALESCE(t.allowed_user_ids, '{}'::uuid[]) || am.owner_ids)
  )
FROM agent_mcp am
WHERE t.id = am.tool_id
  AND COALESCE(array_length(am.owner_ids, 1), 0) > 0
  AND t.created_by IS NULL
  AND COALESCE(array_length(t.owner_user_ids, 1), 0) = 0
  AND COALESCE(array_length(t.allowed_user_ids, 1), 0) = 0;
