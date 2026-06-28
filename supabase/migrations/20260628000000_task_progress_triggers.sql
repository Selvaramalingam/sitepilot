-- Task Progress Calculation Triggers
-- Automatically recalculates and synchronizes tasks.progress based on task_checklists status

-- 1. Helper function to recalculate task progress
CREATE OR REPLACE FUNCTION public.recalculate_task_progress(target_task_id uuid)
RETURNS void AS $$
DECLARE
    total_items integer;
    completed_items integer;
    new_progress integer;
    current_status text;
    current_progress integer;
BEGIN
    -- Get current status and progress of the task
    SELECT status, progress INTO current_status, current_progress
    FROM public.tasks
    WHERE id = target_task_id;

    -- Count checklists
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = true)
    INTO total_items, completed_items
    FROM public.task_checklists
    WHERE task_id = target_task_id;

    IF total_items > 0 THEN
        new_progress := ROUND((completed_items::float / total_items) * 100);
    ELSE
        -- If no checklists exist, default progress to status
        IF current_status = 'Completed' THEN
            new_progress := 100;
        ELSIF current_status IN ('Draft', 'Pending') THEN
            new_progress := 0;
        ELSE
            new_progress := COALESCE(current_progress, 0);
        END IF;
    END IF;

    -- Update task progress
    UPDATE public.tasks
    SET progress = new_progress,
        updated_at = now()
    WHERE id = target_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function on task_checklists changes
CREATE OR REPLACE FUNCTION public.on_checklist_change()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_task_progress(OLD.task_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_task_progress(NEW.task_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create checklist triggers
DROP TRIGGER IF EXISTS trigger_recalculate_task_progress ON public.task_checklists;
CREATE TRIGGER trigger_recalculate_task_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.task_checklists
    FOR EACH ROW EXECUTE PROCEDURE public.on_checklist_change();

-- 3. Trigger function on tasks updates (for status changes)
CREATE OR REPLACE FUNCTION public.on_task_update_progress()
RETURNS trigger AS $$
DECLARE
    total_items integer;
    completed_items integer;
BEGIN
    -- Count checklists
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = true)
    INTO total_items, completed_items
    FROM public.task_checklists
    WHERE task_id = NEW.id;

    IF total_items > 0 THEN
        -- If checklists exist, locked to checklists progress
        NEW.progress := ROUND((completed_items::float / total_items) * 100);
    ELSE
        -- If no checklists, set progress based on status changes
        IF NEW.status = 'Completed' THEN
            NEW.progress := 100;
        ELSIF NEW.status IN ('Draft', 'Pending') THEN
            NEW.progress := 0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create tasks trigger
DROP TRIGGER IF EXISTS trigger_on_task_update_progress ON public.tasks;
CREATE TRIGGER trigger_on_task_update_progress
    BEFORE INSERT OR UPDATE OF status, progress ON public.tasks
    FOR EACH ROW EXECUTE PROCEDURE public.on_task_update_progress();
