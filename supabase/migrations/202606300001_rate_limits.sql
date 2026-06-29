CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  reset_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);
