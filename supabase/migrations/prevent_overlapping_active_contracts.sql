-- Migration: Prevent overlapping active contracts for the same unit
-- Ensures that each unit can have only one active contract during any overlapping period

CREATE OR REPLACE FUNCTION check_contract_unit_overlap()
RETURNS TRIGGER AS $$
DECLARE
    conflict_contract RECORD;
BEGIN
    -- Skip check if contract is cancelled / terminated
    IF NEW.status IN ('terminated', 'cancelled', 'canceled', 'ملغي', 'مفسوخ', 'عقد ملغي') THEN
        RETURN NEW;
    END IF;

    -- Validate date order
    IF NEW.start_date > NEW.end_date THEN
        RAISE EXCEPTION 'تاريخ بداية العقد لا يمكن أن يكون بعد تاريخ النهاية';
    END IF;

    -- Look for conflicting active contracts for the same unit
    SELECT id, number, start_date, end_date INTO conflict_contract
    FROM public.contracts
    WHERE unit_id = NEW.unit_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (status IS NULL OR status NOT IN ('terminated', 'cancelled', 'canceled', 'ملغي', 'مفسوخ', 'عقد ملغي'))
      AND (NEW.start_date <= end_date AND NEW.end_date >= start_date)
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'لا يمكن تسجيل العقد: الوحدة مرتبطة بعقد نشط بالفعل خلال الفترة من % إلى % (عقد رقم: %)',
            conflict_contract.start_date,
            conflict_contract.end_date,
            COALESCE(conflict_contract.number, 'بدون رقم');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_contract_unit_overlap ON public.contracts;

CREATE TRIGGER trg_check_contract_unit_overlap
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION check_contract_unit_overlap();
