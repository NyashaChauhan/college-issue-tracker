// frontend/src/components/ticket/RaiseTicketForm.jsx
// CampusResolve — Form for students/faculty to submit a new issue.
// Handles AI grouping suggestion dialog, live validation, and image upload.

import React, { useState, useRef, useCallback } from 'react';
import api from '../../utils/api';
import {
  validateTicketTitle,
  validateTicketDescription,
  validateImages,
} from '../../utils/validators';

const CATEGORIES = [
  'Infrastructure', 'Academic', 'Administrative',
  'IT Support', 'Library', 'Hostel', 'Sports', 'Canteen', 'Other',
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#0F766E' },
  { value: 'high',   label: 'High',   color: '#D97745' },
  { value: 'urgent', label: 'Urgent', color: '#C94A4A' },
];

const INIT_FORM   = { title: '', description: '', category: '', priority: 'medium' };
const INIT_ERRORS = { title: '', description: '', category: '', images: '', general: '' };

// ── AI Insight Badge ─────────────────────────────────────────
function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                      bg-primary-600 text-white tracking-wide">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z" />
      </svg>
      AI Insight
    </span>
  );
}

// ── Similarity score pill ─────────────────────────────────────
function SimilarityPill({ score }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                      bg-primary-50 text-primary-700 border border-primary-200">
      {score}% match
    </span>
  );
}

export default function RaiseTicketForm({ onSuccess }) {
  const [form,    setForm]    = useState(INIT_FORM);
  const [errors,  setErrors]  = useState(INIT_ERRORS);
  const [images,  setImages]  = useState([]);   // File[]
  const [previews, setPreviews] = useState([]); // data URLs for thumbnails
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // AI grouping state
  const [groupingDialog, setGroupingDialog] = useState(null); // { similarTicket }

  // AI issue classification suggestion state
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { suggestedCategory, suggestedPriority, reason }
  const [aiError, setAiError]           = useState('');

  const fileInputRef = useRef(null);

  // ── AI Suggestion Handlers ───────────────────────────────────
  const handleAnalyzeAI = async () => {
    setAiError('');

    const titleVal = form.title.trim();
    const descVal  = form.description.trim();

    if (!titleVal || titleVal.length < 5) {
      setAiError('Please enter an issue title (at least 5 characters) before analyzing.');
      return;
    }

    if (!descVal || descVal.length < 20) {
      setAiError('Please enter a description (at least 20 characters) before analyzing.');
      return;
    }

    setAiLoading(true);

    try {
      const res = await api.post('/tickets/analyze', {
        title: titleVal,
        description: descVal,
      });

      if (res.data?.suggestedCategory && res.data?.suggestedPriority) {
        setAiSuggestion({
          suggestedCategory: res.data.suggestedCategory,
          suggestedPriority: res.data.suggestedPriority,
          reason: res.data.reason || '',
        });
      } else {
        setAiError('AI was unable to determine a suggestion. Please select manually.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'AI analysis is currently unavailable. Please select category and priority manually.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!aiSuggestion) return;
    setForm((prev) => ({
      ...prev,
      category: aiSuggestion.suggestedCategory,
      priority: aiSuggestion.suggestedPriority.toLowerCase(),
    }));
    setErrors((prev) => ({ ...prev, category: '' }));
    setAiSuggestion(null);
  };

  const handleDismissSuggestion = () => {
    setAiSuggestion(null);
    setAiError('');
  };

  // ── Live validation ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'title')
      setErrors((prev) => ({ ...prev, title: validateTicketTitle(value) || '' }));
    if (name === 'description')
      setErrors((prev) => ({ ...prev, description: validateTicketDescription(value) || '' }));
    if (name === 'category')
      setErrors((prev) => ({ ...prev, category: value ? '' : 'Category is required.' }));
  };

  // ── Image handling ───────────────────────────────────────────
  const applyFiles = useCallback((files) => {
    const imgError = validateImages(files);
    setErrors((prev) => ({ ...prev, images: imgError || '' }));
    if (!imgError) {
      setImages(files);
      // Generate previews
      const readers = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(setPreviews);
    }
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    applyFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (files.length) applyFiles(files);
  };

  const removeImage = (index) => {
    const newFiles = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newFiles);
    setPreviews(newPreviews);
    setErrors((prev) => ({ ...prev, images: '' }));
    // Reset file input so same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Form validity ────────────────────────────────────────────
  const isValid = () => (
    !validateTicketTitle(form.title) &&
    !validateTicketDescription(form.description) &&
    !!form.category &&
    !errors.images
  );

  // ── Submit helper ────────────────────────────────────────────
  const buildFormData = (extra = {}) => {
    const fd = new FormData();
    fd.append('title',       form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('category',    form.category);
    fd.append('priority',    form.priority);
    images.forEach((img) => fd.append('images', img));
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    return fd;
  };

  const submit = async (extra = {}) => {
    setLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));

    try {
      const res = await api.post('/tickets', buildFormData(extra), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Server suggests grouping
      if (res.data.suggestGrouping) {
        setGroupingDialog({ similarTicket: res.data.similarTicket });
        setLoading(false);
        return;
      }

      // Success — reset form
      setForm(INIT_FORM);
      setImages([]);
      setPreviews([]);
      setErrors(INIT_ERRORS);
      setGroupingDialog(null);
      setAiSuggestion(null);
      setAiError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.('Issue submitted successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit issue. Please try again.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const titleErr = validateTicketTitle(form.title);
    const descErr  = validateTicketDescription(form.description);
    const catErr   = form.category ? '' : 'Category is required.';

    if (titleErr || descErr || catErr) {
      setErrors((prev) => ({ ...prev, title: titleErr || '', description: descErr || '', category: catErr }));
      return;
    }

    await submit();
  };

  // ── Grouping dialog handlers ─────────────────────────────────
  const handleGroupYes = () => {
    const parentId = groupingDialog.similarTicket.id;
    setGroupingDialog(null);
    submit({ confirmGroup: 'true', parentTicketId: parentId });
  };

  const handleGroupNo = () => {
    setGroupingDialog(null);
    submit({ confirmGroup: 'false' });
  };

  const charCount = form.description.length;
  const charOver  = charCount > 2000;

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* Issue Title */}
        <div>
          <label htmlFor="title" className="label">Issue Title *</label>
          <input
            id="title" name="title" type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="Briefly describe the issue (5–200 characters)"
            className={`input-field ${errors.title ? 'input-error' : ''}`}
          />
          {errors.title ? (
            <p className="error-text">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.title}
            </p>
          ) : (
            <p className="mt-1 text-xs text-brand-muted">{form.title.length}/200 characters</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="label">Description *</label>
          <textarea
            id="description" name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe the issue in detail — where it is, when it started, and how it affects you (20–2000 characters)"
            className={`input-field resize-y ${errors.description ? 'input-error' : ''}`}
          />
          <div className="flex justify-between items-start mt-1.5">
            {errors.description ? (
              <p className="error-text">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.description}
              </p>
            ) : <span />}
            <span className={`text-xs font-medium ${charOver ? 'text-danger' : 'text-brand-muted'}`}>
              {charCount}/2000
            </span>
          </div>
        </div>

        {/* Category + Priority with AI Suggestion Action */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Classification
            </span>
            <button
              type="button"
              id="analyze-with-ai-btn"
              onClick={handleAnalyzeAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                         text-primary-700 bg-primary-50 border border-primary-200
                         hover:bg-primary-100 hover:border-primary-300 active:bg-primary-200
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <span className="text-accent font-bold">✦</span>
                  Analyze with AI
                </>
              )}
            </button>
          </div>

          {/* AI Analysis Error Notice */}
          {aiError && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 animate-fade-in">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1">{aiError}</span>
              <button
                type="button"
                onClick={() => setAiError('')}
                className="text-amber-500 hover:text-amber-700 ml-1 font-bold"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* AI Suggestion Card */}
          {aiSuggestion && (
            <div
              id="ai-suggestion-card"
              className="rounded-xl border border-primary-200 bg-primary-50/70 p-4 shadow-card animate-fade-in space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-accent text-sm font-bold">✦</span>
                  <h4 className="font-bold text-primary-900 text-xs tracking-wider uppercase">
                    AI Issue Analysis
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleDismissSuggestion}
                  className="text-brand-muted hover:text-brand-text p-1 rounded transition-colors"
                  title="Dismiss suggestion"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 rounded-lg p-3 border border-primary-100">
                <div>
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
                    Suggested category
                  </p>
                  <p className="text-sm font-semibold text-brand-text">
                    {aiSuggestion.suggestedCategory}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
                    Suggested priority
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: PRIORITIES.find(
                          (p) => p.value === aiSuggestion.suggestedPriority?.toLowerCase()
                        )?.color || '#0F766E',
                      }}
                    />
                    <p className="text-sm font-semibold text-brand-text capitalize">
                      {aiSuggestion.suggestedPriority}
                    </p>
                  </div>
                </div>
              </div>

              {aiSuggestion.reason && (
                <div>
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
                    Reason
                  </p>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    {aiSuggestion.reason}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  id="use-suggestions-btn"
                  onClick={handleApplySuggestion}
                  className="btn-primary text-xs py-2 px-3.5 flex-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Use suggestions
                </button>
                <button
                  type="button"
                  id="keep-choices-btn"
                  onClick={handleDismissSuggestion}
                  className="btn-secondary text-xs py-2 px-3.5 flex-1"
                >
                  Keep my choices
                </button>
              </div>
            </div>
          )}

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="label">Category *</label>
            <select
              id="category" name="category"
              value={form.category}
              onChange={handleChange}
              className={`input-field ${errors.category ? 'input-error' : ''}`}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && (
              <p className="error-text">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <select
              id="priority" name="priority"
              value={form.priority}
              onChange={handleChange}
              className="input-field"
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: PRIORITIES.find((p) => p.value === form.priority)?.color || '#E3E5DF',
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-brand-muted">
              {form.priority === 'urgent' ? 'Use Urgent only for safety or access-blocking issues.' :
               form.priority === 'high'   ? 'Significantly impacts operations or multiple people.' :
               form.priority === 'medium' ? 'Noticeable issue but work-arounds exist.' :
               'Minor inconvenience with easy work-arounds.'}
            </p>
          </div>
        </div>
      </div>

        {/* Image Upload */}
        <div>
          <label className="label">
            Attach Supporting Images
            <span className="font-normal text-brand-muted ml-1">(optional)</span>
          </label>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                        transition-all duration-200
                        ${isDragOver
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-brand-border hover:border-primary-400 hover:bg-primary-50'
                        }
                        ${errors.images ? 'border-danger bg-danger-light' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                              ${isDragOver ? 'bg-primary-100' : 'bg-brand-bg border border-brand-border'}`}>
                <svg className={`w-5 h-5 ${isDragOver ? 'text-primary-600' : 'text-brand-muted'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text">
                  {isDragOver ? 'Drop to attach' : 'Click to browse or drag & drop'}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  JPG, PNG or WebP · Up to 5 MB each · Maximum 3 images
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {errors.images && (
            <p className="error-text mt-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.images}
            </p>
          )}

          {/* Thumbnail previews */}
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-brand-border shadow-card"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white
                                flex items-center justify-center opacity-0 group-hover:opacity-100
                                transition-opacity duration-150 shadow-card"
                    title={`Remove ${images[i]?.name}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-[10px] text-brand-muted mt-1 text-center w-20 truncate">
                    {images[i]?.name}
                  </p>
                </div>
              ))}
              <div className="self-center text-xs text-brand-muted">
                {images.length}/3 selected
              </div>
            </div>
          )}
        </div>

        {/* General error */}
        {errors.general && (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger-light border border-red-200 px-4 py-3">
            <svg className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-danger">{errors.general}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !isValid()}
          className="btn-primary w-full text-base py-3"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting issue…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Submit Issue
            </>
          )}
        </button>
      </form>

      {/* ── AI Grouping Dialog ───────────────────────────────── */}
      {groupingDialog && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setGroupingDialog(null); }}
        >
          <div className="bg-white rounded-2xl shadow-card-lg max-w-md w-full animate-fade-in overflow-hidden">

            {/* Dialog header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-3 mb-1">
                {/* Teal AI icon */}
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-card">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <AIBadge />
                  </div>
                  <h3 className="font-bold text-brand-text text-base leading-tight">
                    Possible duplicate issue detected
                  </h3>
                </div>
              </div>
            </div>

            {/* Existing issue card */}
            <div className="px-6 pb-4">
              <div
                className="rounded-xl border border-brand-border p-4"
                style={{ backgroundColor: '#F6F4EF' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                    Existing Issue
                  </p>
                  <SimilarityPill score={groupingDialog.similarTicket.similarityScore} />
                </div>
                <p className="font-semibold text-brand-text text-sm leading-snug mb-1.5">
                  {groupingDialog.similarTicket.title}
                </p>
                <p className="text-xs text-brand-muted leading-relaxed line-clamp-3">
                  {groupingDialog.similarTicket.description}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="px-6 pb-5">
              <p className="text-sm text-brand-muted leading-relaxed">
                Our AI detected this issue is highly similar to an existing open report.
                Would you like to <strong className="text-brand-text">link your case</strong> to
                it so the team can resolve it together — or create a separate report?
              </p>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleGroupYes}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Linking…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Group with existing issue
                  </>
                )}
              </button>
              <button
                onClick={handleGroupNo}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Create separately
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
