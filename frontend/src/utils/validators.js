// frontend/src/utils/validators.js
// Live validation helpers — used on every onChange/onKeyUp in all forms.
// These same rules are re-run server-side in ticketController.js.

// ── Gibberish detection ──────────────────────────────────────

const GIBBERISH_PATTERNS = [
  /^(.)\1{4,}$/i,                 // "aaaaaa"
  /^[qwertyuiop]{6,}$/i,          // top keyboard row
  /^[asdfghjkl]{6,}$/i,           // home keyboard row
  /^[zxcvbnm]{6,}$/i,             // bottom keyboard row
];

function isGibberish(text) {
  const trimmed = text.trim();

  if (!trimmed) return false;

  // Obvious repeated single char: "aaaaaaaa..."
  if (/^(.)\1{7,}$/i.test(trimmed)) {
    return true;
  }

  // Entire string is just keyboard row mash
  if (GIBBERISH_PATTERNS.some((re) => re.test(trimmed))) {
    return true;
  }

  // Very long uninterrupted string with no spaces
  if (trimmed.length > 40 && !trimmed.includes(' ')) {
    return true;
  }

  // Repetitive short sequence: "asdfasdfasdf..."
  if (/^(.{2,6})\1{4,}$/i.test(trimmed)) {
    return true;
  }

  return false;
}

// ── Field validators ─────────────────────────────────────────

/**
 * Validate a ticket title.
 * @param {string} value
 * @returns {string|null} error message or null if valid
 */
export function validateTicketTitle(value) {
  if (!value || value.trim().length === 0) return 'Title is required.';
  if (value.trim().length < 5)             return 'Title must be at least 5 characters.';
  if (value.trim().length > 200)           return 'Title must be at most 200 characters.';
  if (!/[a-zA-Z]/.test(value))            return 'Title must contain letters.';
  if (isGibberish(value))                  return 'Title appears to be invalid. Please describe your issue clearly.';
  return null;
}

/**
 * Validate a ticket description.
 * @param {string} value
 * @returns {string|null}
 */
export function validateTicketDescription(value) {
  if (!value || value.trim().length === 0) return 'Description is required.';
  if (value.trim().length < 20)            return 'Description must be at least 20 characters.';
  if (value.trim().length > 2000)          return 'Description must be at most 2000 characters.';
  if (isGibberish(value))                  return 'Description appears to be invalid. Please describe your issue clearly.';
  return null;
}

/**
 * Validate an email address.
 * @param {string} value
 * @returns {string|null}
 */
export function validateEmail(value) {
  if (!value || value.trim().length === 0) return 'Email is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim()))      return 'Please enter a valid email address.';
  return null;
}

/**
 * Validate a password.
 * @param {string} value
 * @returns {string|null}
 */
export function validatePassword(value) {
  if (!value || value.length === 0) {
    return 'Password is required.';
  }

  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (value.length > 128) {
    return 'Password must be at most 128 characters.';
  }

  if (/\s/.test(value)) {
    return 'Password must not contain spaces.';
  }

  if (!/[A-Z]/.test(value)) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!/[a-z]/.test(value)) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!/[0-9]/.test(value)) {
    return 'Password must contain at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return 'Password must contain at least one special character.';
  }

  return null;
}

/**
 * Validate password confirmation.
 * @param {string} value
 * @param {string} password
 * @returns {string|null}
 */
export function validateConfirmPassword(value, password) {
  if (!value) return 'Please confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return null;
}

/**
 * Validate a name field.
 * @param {string} value
 * @returns {string|null}
 */
export function validateName(value) {
  if (!value || value.trim().length === 0) return 'Name is required.';
  if (value.trim().length < 2)             return 'Name must be at least 2 characters.';
  if (value.trim().length > 100)           return 'Name must be at most 100 characters.';
  return null;
}

/**
 * Validate image files selected by the user.
 * @param {FileList|File[]} files
 * @returns {string|null}
 */
export function validateImages(files) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE      = 5 * 1024 * 1024; // 5 MB
  const MAX_COUNT     = 3;

  if (!files || files.length === 0) return null;

  if (files.length > MAX_COUNT) {
    return `Maximum ${MAX_COUNT} images allowed.`;
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" is not allowed. Only jpg, png, and webp images are accepted.`;
    }
    if (file.size > MAX_SIZE) {
      return `"${file.name}" exceeds the 5 MB size limit.`;
    }
  }

  return null;
}
