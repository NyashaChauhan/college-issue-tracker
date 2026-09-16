// frontend/src/components/ticket/RaiseTicketForm.jsx
// Form for students/faculty to submit a new issue.
// Handles AI grouping suggestion dialog, live validation, and image upload.

import React, { useState, useRef } from 'react';
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
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const INIT_FORM = {
  title: '', description: '', category: '', priority: 'medium',
};

const INIT_ERRORS = {
  title: '', description: '', category: '', images: '', general: '',
};

export default function RaiseTicketForm({ onSuccess }) {
  const [form,    setForm]    = useState(INIT_FORM);
  const [errors,  setErrors]  = useState(INIT_ERRORS);
  const [images,  setImages]  = useState([]);   // File[]
  const [loading, setLoading] = useState(false);

  // AI grouping state
  const [groupingDialog, setGroupingDialog] = useState(null); // { similarTicket }
  const pendingEmbeddingRef = useRef(null);    // store embedding from server for re-submit

  // ── Live validation ──────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'title') {
      setErrors((prev) => ({ ...prev, title: validateTicketTitle(value) || '' }));
    }
    if (name === 'description') {
      setErrors((prev) => ({ ...prev, description: validateTicketDescription(value) || '' }));
    }
    if (name === 'category') {
      setErrors((prev) => ({ ...prev, category: value ? '' : 'Category is required.' }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const imgError = validateImages(files);
    setErrors((prev) => ({ ...prev, images: imgError || '' }));
    if (!imgError) setImages(files);
  };

  // ── Form validity ────────────────────────────────────────
  const isValid = () => {
    return (
      !validateTicketTitle(form.title) &&
      !validateTicketDescription(form.description) &&
      !!form.category &&
      !errors.images
    );
  };

  // ── Submit helper ────────────────────────────────────────
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

      // Success
      setForm(INIT_FORM);
      setImages([]);
      setErrors(INIT_ERRORS);
      setGroupingDialog(null);
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

    // Run all validations once more before submit
    const titleErr = validateTicketTitle(form.title);
    const descErr  = validateTicketDescription(form.description);
    const catErr   = form.category ? '' : 'Category is required.';

    if (titleErr || descErr || catErr) {
      setErrors((prev) => ({
        ...prev,
        title:       titleErr || '',
        description: descErr  || '',
        category:    catErr,
      }));
      return;
    }

    await submit();
  };

  // ── Grouping dialog handlers ──────────────────────────────
  const handleGroupYes = () => {
    const parentId = groupingDialog.similarTicket.id;
    setGroupingDialog(null);
    submit({ confirmGroup: 'true', parentTicketId: parentId });
  };

  const handleGroupNo = () => {
    setGroupingDialog(null);
    submit({ confirmGroup: 'false' });
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="title" className="label">Issue Title *</label>
          <input
            id="title" name="title" type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="Briefly describe the issue (5–200 characters)"
            className={`input-field ${errors.title ? 'input-error' : ''}`}
          />
          {errors.title && <p className="error-text">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description" className="label">Description *</label>
          <textarea
            id="description" name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe the issue in detail (20–2000 characters)"
            className={`input-field resize-y ${errors.description ? 'input-error' : ''}`}
          />
          <div className="flex justify-between items-start">
            {errors.description
              ? <p className="error-text">{errors.description}</p>
              : <span />
            }
            <span className={`text-xs mt-1 ${form.description.length > 2000 ? 'text-red-600' : 'text-gray-400'}`}>
              {form.description.length}/2000
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="label">Category *</label>
            <select
              id="category" name="category"
              value={form.category}
              onChange={handleChange}
              className={`input-field ${errors.category ? 'input-error' : ''}`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <select
              id="priority" name="priority"
              value={form.priority}
              onChange={handleChange}
              className="input-field"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Attachments (optional)</label>
          <p className="text-xs text-gray-500 mb-2">Max 3 images, 5 MB each, jpg/png/webp only.</p>
          <input
            type="file" accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700
                       hover:file:bg-primary-100 cursor-pointer"
          />
          {errors.images && <p className="error-text">{errors.images}</p>}
          {images.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {images.length} file{images.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {errors.general && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{errors.general}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValid()}
          className="btn-primary w-full"
        >
          {loading ? 'Submitting…' : 'Submit Issue'}
        </button>
      </form>

      {/* AI Grouping Dialog */}
      {groupingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Similar Issue Found</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {groupingDialog.similarTicket.similarityScore}% match with an existing open issue.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Existing Issue</p>
              <p className="font-medium text-gray-800 text-sm">{groupingDialog.similarTicket.title}</p>
              <p className="text-gray-600 text-xs mt-1 line-clamp-3">
                {groupingDialog.similarTicket.description}
              </p>
            </div>

            <p className="text-sm text-gray-700 mb-5">
              Would you like to add your case to the existing issue instead of creating a duplicate?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleGroupYes}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Adding…' : 'Yes, Add to It'}
              </button>
              <button
                onClick={handleGroupNo}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                No, Create New
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
