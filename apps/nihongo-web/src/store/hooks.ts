import { useDispatch, useSelector } from 'react-redux';
import type { QuizDispatch, QuizRootState } from './personalQuizSlice';

// Hook có kiểu sẵn: TypeScript biết hình dạng state khi gõ `s.personalQuiz.`
export const useQuizDispatch = useDispatch.withTypes<QuizDispatch>();
export const useQuizSelector = useSelector.withTypes<QuizRootState>();
