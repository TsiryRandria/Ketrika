export interface ParsedProjectDate {
  ok: true;
  iso: string;
  timestamp: number;
}

export interface ParsedProjectDateError {
  ok: false;
  error: string;
}

export type ProjectDateParseResult = ParsedProjectDate | ParsedProjectDateError;

export interface ProjectDatesValidationSuccess {
  valid: true;
  startDateIso: string;
  endDateIso: string;
}

export interface ProjectDatesValidationFailure {
  valid: false;
  error: string;
}

export type ProjectDatesValidationResult =
  | ProjectDatesValidationSuccess
  | ProjectDatesValidationFailure;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const FR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function parseStrictProjectDate(
  rawValue: unknown,
  fieldLabel = 'date'
): ProjectDateParseResult {
  if (typeof rawValue !== 'string') {
    return {
      ok: false,
      error: `La ${fieldLabel} doit être une chaîne de caractères au format AAAA-MM-JJ ou JJ/MM/AAAA.`,
    };
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: `La ${fieldLabel} est requise (format attendu : AAAA-MM-JJ ou JJ/MM/AAAA).`,
    };
  }

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = ISO_DATE_RE.exec(trimmed);
  const frMatch = FR_DATE_RE.exec(trimmed);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (frMatch) {
    day = Number(frMatch[1]);
    month = Number(frMatch[2]);
    year = Number(frMatch[3]);
  } else {
    return {
      ok: false,
      error: `Format invalide pour la ${fieldLabel} ("${trimmed}"). Utilisez AAAA-MM-JJ ou JJ/MM/AAAA.`,
    };
  }

  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      ok: false,
      error: `La ${fieldLabel} ("${trimmed}") n'est pas une date calendaire valide.`,
    };
  }

  const utcTimestamp = Date.UTC(year, month - 1, day);
  const check = new Date(utcTimestamp);

  if (
    Number.isNaN(utcTimestamp) ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return {
      ok: false,
      error: `La ${fieldLabel} ("${trimmed}") n'existe pas dans le calendrier.`,
    };
  }

  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');

  return {
    ok: true,
    iso: `${year}-${paddedMonth}-${paddedDay}`,
    timestamp: utcTimestamp,
  };
}

export function validateProjectDates(
  startDate: unknown,
  endDate: unknown
): ProjectDatesValidationResult {
  const parsedStart = parseStrictProjectDate(startDate, 'date de début');
  if (!parsedStart.ok) {
    return { valid: false, error: parsedStart.error };
  }

  const parsedEnd = parseStrictProjectDate(endDate, "date d'échéance");
  if (!parsedEnd.ok) {
    return { valid: false, error: parsedEnd.error };
  }

  if (parsedEnd.timestamp < parsedStart.timestamp) {
    return {
      valid: false,
      error: `La date de fin (${parsedEnd.iso}) doit être postérieure ou égale à la date de début (${parsedStart.iso}).`,
    };
  }

  return {
    valid: true,
    startDateIso: parsedStart.iso,
    endDateIso: parsedEnd.iso,
  };
}

export interface ProjectSummaryForValidation {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

export interface ProjectFunctionCallValidationResult {
  valid: boolean;
  error?: string;
  normalizedArgs?: Record<string, unknown>;
}

export function validateProjectAiFunctionCall(
  name: string,
  rawArgs: Record<string, unknown> | undefined,
  existingProjects: ProjectSummaryForValidation[] = []
): ProjectFunctionCallValidationResult {
  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {};

  if (name === 'create_project') {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    if (!title) {
      return {
        valid: false,
        error: 'Le nom du projet est requis pour créer un projet.',
      };
    }

    const dateCheck = validateProjectDates(args.startDate, args.endDate);
    if (!dateCheck.valid) {
      return { valid: false, error: dateCheck.error };
    }

    return {
      valid: true,
      normalizedArgs: {
        ...args,
        title,
        startDate: dateCheck.startDateIso,
        endDate: dateCheck.endDateIso,
      },
    };
  }

  if (name === 'update_project') {
    const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : '';
    const projectTitle = typeof args.projectTitle === 'string' ? args.projectTitle.trim() : '';

    const matchedProject = existingProjects.find(
      (p) =>
        (projectId && p.id === projectId) ||
        (projectTitle && p.title.toLowerCase() === projectTitle.toLowerCase())
    );

    const hasNewStart = args.startDate !== undefined;
    const hasNewEnd = args.endDate !== undefined;

    if (hasNewStart && hasNewEnd) {
      const dateCheck = validateProjectDates(args.startDate, args.endDate);
      if (!dateCheck.valid) {
        return { valid: false, error: dateCheck.error };
      }
      return {
        valid: true,
        normalizedArgs: {
          ...args,
          startDate: dateCheck.startDateIso,
          endDate: dateCheck.endDateIso,
        },
      };
    }

    if (hasNewStart || hasNewEnd) {
      if (!matchedProject) {
        // Still validate the provided date individually even if target project wasn't resolved
        if (hasNewStart) {
          const startCheck = parseStrictProjectDate(args.startDate, 'date de début');
          if (!startCheck.ok) return { valid: false, error: startCheck.error };
          args.startDate = startCheck.iso;
        }
        if (hasNewEnd) {
          const endCheck = parseStrictProjectDate(args.endDate, "date d'échéance");
          if (!endCheck.ok) return { valid: false, error: endCheck.error };
          args.endDate = endCheck.iso;
        }
        return {
          valid: false,
          error:
            'Projet introuvable pour vérifier la cohérence entre la date de début et la date de fin.',
        };
      }

      const candidateStart = hasNewStart ? args.startDate : matchedProject.startDate;
      const candidateEnd = hasNewEnd ? args.endDate : matchedProject.endDate;
      const dateCheck = validateProjectDates(candidateStart, candidateEnd);
      if (!dateCheck.valid) {
        return { valid: false, error: dateCheck.error };
      }

      return {
        valid: true,
        normalizedArgs: {
          ...args,
          ...(hasNewStart ? { startDate: dateCheck.startDateIso } : {}),
          ...(hasNewEnd ? { endDate: dateCheck.endDateIso } : {}),
        },
      };
    }

    return { valid: true, normalizedArgs: args };
  }

  return { valid: true, normalizedArgs: args };
}
