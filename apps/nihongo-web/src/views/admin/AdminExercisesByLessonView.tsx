'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExercise, deleteExercise, updateExercise } from '../../api';
import { useLessons, useExercisesQuery, queryKeys } from '../../hooks/queries';
import { useAuth } from '../../hooks/useAuth';
import type { Exercise } from '../../types/api';
import { AdminLessonPicker } from '../../components/admin/AdminLessonPicker';
import { AdminDataTable, type AdminColumn } from '../../components/admin/AdminDataTable';
import { AdminModal, AdminConfirmDialog } from '../../components/admin/AdminModal';
import { useAdminToast } from '../../components/admin/AdminToast';
import '../../components/admin/AdminComponents.css';

type FormState = {
  type: string;
  question: string;
  options: string[];
  answer: string;
};

function emptyForm(): FormState {
  return { type: 'multiple_choice', question: '', options: ['', '', '', ''], answer: '' };
}

function optionsOf(item: Exercise): string[] {
  return item.options ?? [];
}

export default function AdminExercisesByLessonView({
  initialLessonId,
  initialLessonNumber,
}: {
  initialLessonId?: number;
  initialLessonNumber?: number;
} = {}) {
  const { token } = useAuth();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const { data: lessons = [], isLoading: lessonsLoading } = useLessons();
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<number | null>(
    initialLessonNumber ?? null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null);

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setSelectedLessonNumber(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  const lessonItems = useMemo(
    () =>
      lessons.map((l) => ({
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        jlptLevel: l.jlptLevel,
        count: l._count?.exercises ?? null,
      })),
    [lessons],
  );

  const activeLessonNumber = selectedLessonNumber ?? lessonItems[0]?.lessonNumber ?? null;
  const activeLesson = lessons.find((l) => l.lessonNumber === activeLessonNumber);
  const activeLessonId =
    activeLesson?.id ??
    (initialLessonId != null && activeLessonNumber === initialLessonNumber ? initialLessonId : null);

  const { data: rows = [], isLoading } = useExercisesQuery(activeLessonNumber ?? 0);

  const invalidate = () => {
    if (activeLessonNumber != null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises(activeLessonNumber) });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || activeLessonId == null) throw new Error('Chưa chọn bài hợp lệ');
      const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
      const payload = {
        type: form.type,
        question: form.question.trim(),
        options: cleanOptions.length ? JSON.stringify(cleanOptions) : undefined,
        answer: form.answer.trim(),
        lessonId: activeLessonId,
      };
      if (editing) return updateExercise(editing.id, payload, token);
      return createExercise(payload, token);
    },
    onSuccess: () => {
      toast.show(editing ? 'Đã cập nhật bài tập.' : 'Đã thêm bài tập.', 'success');
      setModalOpen(false);
      invalidate();
    },
    onError: (err: Error) => toast.show(err.message || 'Lưu thất bại', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!token) throw new Error('Chưa đăng nhập');
      return deleteExercise(id, token);
    },
    onSuccess: () => {
      toast.show('Đã xoá bài tập.', 'success');
      setConfirmDelete(null);
      invalidate();
    },
    onError: (err: Error) => toast.show(err.message || 'Xoá thất bại', 'error'),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: Exercise) {
    setEditing(item);
    const opts = optionsOf(item);
    setForm({
      type: item.type.toLowerCase(),
      question: item.question,
      options: opts.length ? opts : ['', '', '', ''],
      answer: item.answer,
    });
    setModalOpen(true);
  }

  function updateOption(index: number, value: string) {
    setForm((f) => {
      const wasAnswer = f.options[index].trim() === f.answer.trim() && f.options[index].trim().length > 0;
      const options = f.options.map((o, i) => (i === index ? value : o));
      return { ...f, options, answer: wasAnswer ? value : f.answer };
    });
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ''] }));
  }

  function removeOption(index: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  }

  function onSubmit() {
    if (!form.question.trim()) {
      toast.show('Cần nhập câu hỏi.', 'error');
      return;
    }
    if (form.type === 'multiple_choice') {
      const opts = form.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.show('Trắc nghiệm cần ít nhất 2 lựa chọn.', 'error');
        return;
      }
      if (!opts.includes(form.answer.trim())) {
        toast.show('Đáp án phải trùng chính xác 1 trong các lựa chọn.', 'error');
        return;
      }
    } else if (!form.answer.trim()) {
      toast.show('Cần nhập đáp án.', 'error');
      return;
    }
    saveMutation.mutate();
  }

  const columns: AdminColumn<Exercise>[] = [
    { key: 'type', header: 'Loại', render: (r) => r.type, width: '130px' },
    { key: 'question', header: 'Câu hỏi', render: (r) => <span style={{ display: 'inline-block', maxWidth: 360 }}>{r.question}</span> },
    { key: 'answer', header: 'Đáp án', render: (r) => r.answer },
  ];

  return (
    <AdminLessonPicker
      title="Bài học"
      lessons={lessonItems}
      loading={lessonsLoading}
      activeLessonNumber={activeLessonNumber}
      onSelectLesson={setSelectedLessonNumber}
      emptySelectHint="Chọn một bài bên trái để xem / sửa danh sách bài tập."
    >
      {activeLessonNumber != null && activeLesson && (
        <>
          <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>
              #{activeLesson.lessonNumber} {activeLesson.title?.trim() || `Bài ${activeLesson.lessonNumber}`}
              {activeLesson.jlptLevel ? ` · ${activeLesson.jlptLevel}` : ''}
            </h2>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Thêm bài tập
            </button>
          </div>

          <AdminDataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            loading={isLoading}
            emptyText="Chưa có bài tập trong bài này."
            actions={(r) => (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
                  Sửa
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(r)}>
                  Xoá
                </button>
              </>
            )}
          />
        </>
      )}

      <AdminModal
        open={modalOpen}
        title={editing ? `Sửa bài tập #${editing.id}` : 'Thêm bài tập'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Huỷ
            </button>
            <button type="button" className="btn btn-primary" disabled={saveMutation.isPending} onClick={onSubmit}>
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label>
            Loại
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="multiple_choice">Trắc nghiệm (multiple_choice)</option>
              <option value="fill_in_blank">Điền từ (fill_in_blank)</option>
            </select>
          </label>
          <label>
            Câu hỏi
            <input value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
          </label>

          {form.type === 'multiple_choice' ? (
            <>
              <strong style={{ fontSize: '0.85rem' }}>Lựa chọn (chọn nút tròn để đánh dấu đáp án đúng)</strong>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="exercise-answer"
                    checked={opt.trim().length > 0 && opt.trim() === form.answer.trim()}
                    onChange={() => setForm((f) => ({ ...f, answer: opt }))}
                  />
                  <input
                    style={{ flex: 1 }}
                    placeholder={`Lựa chọn ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  {form.options.length > 2 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeOption(i)}>
                      Xoá
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addOption}>
                + Thêm lựa chọn
              </button>
            </>
          ) : (
            <label>
              Đáp án
              <input value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />
            </label>
          )}
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!confirmDelete}
        message={`Xoá bài tập #${confirmDelete?.id}?`}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLessonPicker>
  );
}
