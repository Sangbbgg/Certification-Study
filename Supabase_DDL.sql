-- questions 테이블 생성
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    major_subject TEXT NOT NULL,
    minor_subject TEXT NOT NULL,
    question_title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,                     -- [추가] 이미지 URL 단독 관리
    image_position TEXT DEFAULT 'TOP',  -- [추가] 이미지 위치 (TOP/BOTTOM)
    hint_explanation TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'FIND_AND_FILL')),
    options JSONB,
    answer JSONB NOT NULL,
    total_attempts INTEGER DEFAULT 0,    -- [추가] 총 풀이 횟수
    correct_attempts INTEGER DEFAULT 0,  -- [추가] 정답 횟수
    accuracy_rate INTEGER DEFAULT 0,     -- [추가] 정답률 (%)
    last_solved_at TIMESTAMP WITH TIME ZONE, -- [추가] 최종 풀이 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 기존 테이블 업데이트용 SQL
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'TOP';

-- learning_history 테이블 생성
CREATE TABLE public.learning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
