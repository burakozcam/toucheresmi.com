-- PostgreSQL truncates long implicit identifiers. Use a stable explicit name.
-- Index and rows remain intact; no table rewrite or data mutation.
ALTER INDEX "QuestionArchive_examId_examVersion_lesson_session_booklet_orig_"
RENAME TO "QuestionArchive_source_question_key";
