-- questions 테이블 생성
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    major_subject TEXT NOT NULL,
    minor_subject TEXT NOT NULL,
    question_title TEXT NOT NULL,
    content TEXT NOT NULL,
    hint_explanation TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'FIND_AND_FILL')),
    options JSONB,
    answer JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- learning_history 테이블 생성
CREATE TABLE public.learning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
